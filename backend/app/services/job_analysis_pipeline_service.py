"""Pipeline de Análise de Vaga ("Analisar uma vaga").

Fluxo (executado pelo worker job-analysis-worker):
  1. Extração estruturada da vaga (LLM)          — job_extraction.yaml
  2. Evidências do candidato no RAG existente    — rag_service.search (pgvector)
  3. Matching requisito a requisito (LLM)        — job_matching.yaml
  4. Pesquisa externa (Tavily, opcional)         — job_market_researcher.yaml
  5. Score ponderado determinístico (Python)
  6. Síntese final: salário, empresa, red flags,
     perguntas e veredito (LLM)                  — job_synthesis.yaml
  7. Persistência em job_analyses + resultado na task

Reutiliza as abstrações do pipeline de e-mail (_set_task_state,
_rate_limit_feedback, _parse_json), o vector store existente e o
run_with_web_search (Tavily). Nenhuma infraestrutura paralela é criada.
"""
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.db.session import AsyncSessionLocal
from app.models.post import GenerationTask, PostStatus
from app.repositories.user_profile_repository import UserProfileRepository
from app.repositories.job_analysis_repository import JobAnalysisRepository
from app.services.llm_service import LLMService
from app.services.llm_retry import invoke_with_rate_limit_retry, is_rate_limit_error
from app.services.usage_service import UsageTracker
from app.services.task_events import build_task_payload, notify_task_event
from app.services.prompts_service import get_prompt
from app.services.search_service import run_with_web_search
from app.services.audit_service import AuditService
from app.services import rag_service
from app.services.email_pipeline_service import (
    _set_task_state,
    _rate_limit_feedback,
    _parse_json,
)

logger = logging.getLogger(__name__)

MAX_EVIDENCE_CHUNKS = 14

SENIORITY_LEVELS = {
    "junior": 1, "estagiario": 1, "estagio": 1,
    "pleno": 2,
    "senior": 3, "sênior": 3, "especialista": 3,
    "lead": 4, "tech lead": 4, "staff": 4, "principal": 4,
}


def _seniority_level(name: Optional[str]) -> Optional[int]:
    if not name:
        return None
    return SENIORITY_LEVELS.get(str(name).strip().lower())


def _truncate(value: Optional[str], size: int) -> Optional[str]:
    if not value:
        return None
    return str(value)[:size]


def _format_profile_summary(profile) -> str:
    """Perfil estruturado do banco (dados reais — nunca inventados)."""
    parts = []
    if profile.full_name:
        parts.append(f"Name: {profile.full_name}")
    if getattr(profile, "phone_or_whatsapp", None):
        parts.append(f"Phone/WhatsApp: {profile.phone_or_whatsapp}")
    if profile.linkedin_url:
        parts.append(f"LinkedIn: {profile.linkedin_url}")
    if profile.github_url:
        parts.append(f"GitHub: {profile.github_url}")
    if (profile.experience_summary or "").strip():
        parts.append(
            "Professional summary (written by the candidate): "
            + profile.experience_summary.strip()
        )
    if (profile.salary_expectation or "").strip():
        parts.append(f"Stated salary expectation: {profile.salary_expectation.strip()}")
    return "\n".join(parts) or "(no structured profile configured)"


def _normalize_expectation_flag(value: Any) -> str:
    """Normaliza salary_expectation_required para true|false|ambiguous."""
    if isinstance(value, bool):
        return "true" if value else "false"
    s = str(value or "").strip().lower()
    if s in ("true", "yes", "sim", "verdadeiro"):
        return "true"
    if s in ("false", "no", "nao", "não", "falso"):
        return "false"
    return "ambiguous"


def _normalize_requirements(raw: Any) -> List[Dict[str, Any]]:
    """Normaliza a lista de requisitos da extração com defaults seguros."""
    requirements: List[Dict[str, Any]] = []
    if not isinstance(raw, list):
        return requirements
    for item in raw:
        if not isinstance(item, dict):
            continue
        description = str(item.get("description") or "").strip()
        if not description:
            continue
        required = item.get("required")
        requirements.append({
            "description": description,
            "technology": item.get("technology") or None,
            "category": str(item.get("category") or "technical").strip().lower(),
            "required": bool(required) if required is not None else True,
            "importance": str(item.get("importance") or "medium").strip().lower(),
        })
    return requirements


def _group_requirements_for_rag(requirements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Agrupa requisitos em consultas direcionadas ao RAG.

    Tecnologias são agrupadas em lotes de até 4 (economia de consultas);
    idiomas, formação, soft skills e certificações ganham consultas
    próprias; uma consulta geral de contexto profissional fecha o conjunto.
    """
    groups: List[Dict[str, Any]] = []
    technical_batch: List[str] = []

    def flush_technical() -> None:
        if technical_batch:
            groups.append({
                "query": "Experiência profissional do candidato com: " + ", ".join(technical_batch),
                "requirements": list(technical_batch),
            })
            technical_batch.clear()

    for req in requirements:
        category = req.get("category", "")
        description = req["description"]
        technology = (req.get("technology") or "").strip()

        if category == "technical":
            technical_batch.append(technology or description)
            if len(technical_batch) >= 4:
                flush_technical()
        elif category == "language":
            groups.append({"query": f"Idiomas do candidato: {description}", "requirements": [description]})
        elif category == "education":
            groups.append({"query": f"Formação acadêmica do candidato: {description}", "requirements": [description]})
        elif category == "soft_skill":
            groups.append({"query": f"Soft skills e competências comportamentais do candidato: {description}", "requirements": [description]})
        elif category == "certification":
            groups.append({"query": f"Certificações do candidato: {description}", "requirements": [description]})
        else:  # experience, other
            groups.append({"query": f"Experiência profissional do candidato relacionada a: {description}", "requirements": [description]})

    flush_technical()
    groups.append({
        "query": "Experiências profissionais, projetos, tecnologias e responsabilidades do candidato",
        "requirements": [],
    })
    return groups


async def _retrieve_evidence(
    groups: List[Dict[str, Any]],
    settings,
) -> Tuple[List[Dict[str, Any]], bool]:
    """Consulta o RAG existente por grupo e monta o pool de evidências."""
    try:
        store_ok = await rag_service.ensure_vector_store(settings)
    except Exception:
        logger.warning("RAG: vector store indisponível para análise de vaga", exc_info=True)
        return [], False
    if not store_ok:
        return [], False

    pool: List[Dict[str, Any]] = []
    seen: set = set()
    for group in groups:
        try:
            matches = await rag_service.search(group["query"], app_settings=settings, k=3)
        except Exception:
            continue
        for m in matches:
            content = (m.get("content") or "").strip()
            key = content[:200]
            if content and key not in seen:
                seen.add(key)
                pool.append({
                    "content": content,
                    "title": m.get("title"),
                    "score": m.get("score"),
                })

    pool.sort(key=lambda e: e.get("score") or 0, reverse=True)
    return pool[:MAX_EVIDENCE_CHUNKS], True


def _format_evidence_pool(pool: List[Dict[str, Any]]) -> str:
    if not pool:
        return "(nenhuma evidência recuperada — a base de conhecimento pode estar vazia)"
    blocks = []
    for i, e in enumerate(pool, 1):
        blocks.append(f"[E{i}] (fonte: {e.get('title') or 'documento'}) {e['content']}")
    return "\n\n".join(blocks)


def _normalize_match_label(label: Any) -> str:
    s = str(label or "").strip().lower()
    if "partial" in s:
        return "partial_match"
    if s in ("match", "full_match", "full match"):
        return "match"
    return "no_evidence"


def _merge_matches(
    requirements: List[Dict[str, Any]],
    llm_matches: Any,
) -> List[Dict[str, Any]]:
    """Casa os matches do LLM com os requisitos originais, preservando
    ordem e metadados (categoria/importância/obrigatoriedade)."""
    by_text: Dict[str, Dict[str, Any]] = {}
    for m in llm_matches or []:
        if isinstance(m, dict) and m.get("requirement"):
            by_text[str(m["requirement"]).strip().lower()] = m

    merged: List[Dict[str, Any]] = []
    for req in requirements:
        desc = req["description"]
        matched = by_text.get(desc.strip().lower())
        if matched is None:
            dl = desc.lower()
            for key, candidate in by_text.items():
                if dl in key or key in dl:
                    matched = candidate
                    break
        evidence = [
            str(e).strip() for e in ((matched or {}).get("evidence") or []) if str(e).strip()
        ][:4]
        merged.append({
            "requirement": desc,
            "category": req.get("category"),
            "importance": req.get("importance"),
            "required": req.get("required", True),
            "match": _normalize_match_label((matched or {}).get("match")),
            "confidence": str((matched or {}).get("confidence") or "low").lower(),
            "evidence": evidence,
            "note": (matched or {}).get("note"),
        })
    return merged


def _compute_scores(
    merged_matches: List[Dict[str, Any]],
    job_info: Dict[str, Any],
    candidate_seniority: Optional[str],
) -> Tuple[Dict[str, Any], Optional[int]]:
    """Score ponderado determinístico (não-LLM): obrigatório/alta
    importância pesa mais; match=1.0, partial=0.5, no_evidence=0.0.
    Sub-scores por categoria e senioridade candidato x vaga."""
    weights = {"high": 3.0, "medium": 2.0, "low": 1.0}
    values = {"match": 1.0, "partial_match": 0.5}

    total_weight = 0.0
    total_value = 0.0
    by_category: Dict[str, List[float]] = {}

    for m in merged_matches:
        w = weights.get(m.get("importance") or "medium", 2.0)
        if m.get("required", True):
            w *= 1.5
        v = values.get(m.get("match"), 0.0)
        total_weight += w
        total_value += v * w

        category = m.get("category") or "other"
        bucket = "education" if category == "certification" else category
        agg = by_category.setdefault(bucket, [0.0, 0.0])
        agg[0] += v * w
        agg[1] += w

    def category_score(name: str) -> Optional[int]:
        agg = by_category.get(name)
        if not agg or not agg[1]:
            return None
        return round(100 * agg[0] / agg[1])

    overall = round(100 * total_value / total_weight) if total_weight else None

    # Senioridade: alvo = máximo entre título e responsabilidade real da vaga
    target_level = None
    for key in ("responsibility_seniority", "title_seniority"):
        level = _seniority_level(job_info.get(key))
        if level:
            target_level = level if target_level is None else max(target_level, level)
    candidate_level = _seniority_level(candidate_seniority)

    seniority_score = None
    if target_level and candidate_level:
        if candidate_level >= target_level:
            seniority_score = 100
        elif candidate_level == target_level - 1:
            seniority_score = 60
        else:
            seniority_score = 30

    scores = {
        "score": overall,
        "technical": category_score("technical"),
        "experience": category_score("experience"),
        "languages": category_score("language"),
        "soft_skills": category_score("soft_skill"),
        "education": category_score("education"),
    }
    return scores, seniority_score


async def _invoke_prompt(
    prompt_name: str,
    variables: Dict[str, Any],
    llm,
    tracker,
    task_id: str,
    description: str,
) -> Any:
    """Executa um prompt YAML com o LLM (retry de rate limit + feedback SSE)."""
    prompt_data = get_prompt(prompt_name)
    if not prompt_data:
        return None
    prompt = PromptTemplate(
        template=prompt_data.get("template", ""),
        input_variables=prompt_data.get("input_variables", []),
    )
    chain = prompt | llm | StrOutputParser()
    run_config = {"callbacks": [tracker]} if tracker else None
    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke(variables, config=run_config),
        description=description,
        on_retry=_rate_limit_feedback(task_id, description) if task_id else None,
    )
    return _parse_json(raw)


async def _run_extraction(llm, job_description: str, job_url: Optional[str], tracker, task_id: str) -> Dict[str, Any]:
    """Step 1: extração estruturada da vaga."""
    parsed = await _invoke_prompt(
        "job_extraction",
        {"job_description": job_description, "job_url": job_url or "(not provided)"},
        llm, tracker, task_id, "extração da vaga",
    )
    return parsed if isinstance(parsed, dict) else {}


async def _run_matching(
    llm,
    requirements: List[Dict[str, Any]],
    evidence_pool: List[Dict[str, Any]],
    profile_summary: str,
    job_info: Dict[str, Any],
    tracker,
    task_id: str,
) -> Dict[str, Any]:
    """Step 3: matching requisito a requisito contra as evidências do RAG."""
    parsed = await _invoke_prompt(
        "job_matching",
        {
            "requirements_json": json.dumps(requirements, ensure_ascii=False),
            "evidence_pool": _format_evidence_pool(evidence_pool),
            "profile_summary": profile_summary,
            "job_title": job_info.get("title") or "(not informed)",
            "responsibility_seniority": job_info.get("responsibility_seniority") or "(not informed)",
        },
        llm, tracker, task_id, "análise de compatibilidade",
    )
    return parsed if isinstance(parsed, dict) else {}


async def _run_market_research(llm, job_info: Dict[str, Any], job_url: Optional[str], tavily_key: str, tracker) -> Dict[str, Any]:
    """Step 4: pesquisa externa (Tavily) — empresa, mercado, salários."""
    prompt_data = get_prompt("job_market_researcher")
    if not prompt_data:
        return {}
    prompt = PromptTemplate(
        template=prompt_data.get("template", ""),
        input_variables=prompt_data.get("input_variables", []),
    )
    text = prompt.format(
        job_json=json.dumps(job_info, ensure_ascii=False),
        job_url=job_url or "(not provided)",
    )
    run_config = {"callbacks": [tracker]} if tracker else None
    raw = await run_with_web_search(llm, text, api_key=tavily_key, max_tool_calls=6, config=run_config)
    parsed = _parse_json(raw)
    return parsed if isinstance(parsed, dict) else {}


async def _run_synthesis(
    llm,
    job_info: Dict[str, Any],
    merged_matches: List[Dict[str, Any]],
    scores: Dict[str, Any],
    seniority_score: Optional[int],
    candidate_seniority: Optional[str],
    market_data: Dict[str, Any],
    profile_summary: str,
    expectation_flag: str,
    tracker,
    task_id: str,
) -> Dict[str, Any]:
    """Step 6: síntese final — salário, empresa, red flags, perguntas, veredito."""
    match_payload = {
        "scores": scores,
        "seniority_score": seniority_score,
        "candidate_seniority": candidate_seniority,
        "requirements": merged_matches,
    }
    parsed = await _invoke_prompt(
        "job_synthesis",
        {
            "job_json": json.dumps(job_info, ensure_ascii=False),
            "match_json": json.dumps(match_payload, ensure_ascii=False),
            "market_data": json.dumps(market_data, ensure_ascii=False) if market_data else "(no external research available)",
            "profile_summary": profile_summary,
            "salary_expectation_required": expectation_flag,
            "candidate_score": str(scores.get("score") if scores.get("score") is not None else "n/a"),
        },
        llm, tracker, task_id, "síntese final da análise",
    )
    return parsed if isinstance(parsed, dict) else {}


async def run_job_analysis_pipeline(task_id: str, input_data: Dict[str, Any]) -> None:
    """Executa o pipeline completo de análise de vaga (fila job_analysis_tasks)."""
    start_time = time.time()
    correlation_id = str(uuid.uuid4())

    async with AsyncSessionLocal() as db:
        try:
            # Mensagem re-entregue (worker reiniciou)? Task terminal não reprocessa.
            existing = await db.get(GenerationTask, task_id)
            if existing and existing.status in (
                PostStatus.COMPLETED,
                PostStatus.FAILED,
                PostStatus.CANCELLED,
            ):
                return

            await _set_task_state(db, task_id, status=PostStatus.PROCESSING, step="Starting...", progress=5)

            settings = await LLMService.get_settings(db)
            llm = LLMService.create_llm(settings)
            tracker = UsageTracker(settings.provider, settings.model_name)

            job_description = (input_data.get("job_description") or "").strip()
            job_url = (input_data.get("job_url") or "").strip() or None
            if not job_description:
                raise ValueError("Job description is required")

            await AuditService.log_event(
                db=db,
                event_type="job_analysis_started",
                event_category="job_analysis",
                action="analyze",
                status="pending",
                resource_type="job_analysis",
                resource_id=task_id,
                message=f"Job analysis started for task {task_id}",
                request_data={
                    "job_description_length": len(job_description),
                    "has_url": bool(job_url),
                },
                correlation_id=correlation_id,
            )

            # Perfil estruturado (banco — dados reais do usuário)
            profile = await UserProfileRepository.get_or_create(db, settings.id)
            profile_summary = _format_profile_summary(profile)

            # Step 1: extração estruturada da vaga
            await _set_task_state(db, task_id, step="Analyzing job posting...", progress=15)
            extracted = await _run_extraction(llm, job_description, job_url, tracker, task_id)
            job_info = extracted.get("job") if isinstance(extracted.get("job"), dict) else {}
            requirements = _normalize_requirements(extracted.get("requirements"))
            expectation_flag = _normalize_expectation_flag(extracted.get("salary_expectation_required"))

            # Step 2: evidências do candidato no RAG existente
            await _set_task_state(db, task_id, step="Consulting your resume (knowledge base)...", progress=35)
            groups = _group_requirements_for_rag(requirements)
            pool, rag_available = await _retrieve_evidence(groups, settings)
            knowledge_base_available = rag_available and bool(pool)

            # Step 3: matching requisito a requisito
            await _set_task_state(db, task_id, step="Analyzing candidate fit...", progress=50)
            matching = await _run_matching(llm, requirements, pool, profile_summary, job_info, tracker, task_id)
            merged_matches = _merge_matches(requirements, matching.get("matches"))
            candidate_seniority = matching.get("candidate_seniority")
            seniority_reasoning = matching.get("seniority_reasoning")

            # Step 4: pesquisa externa (Tavily) — apenas quando há chave
            market_data: Dict[str, Any] = {}
            if settings.tavily_api_key:
                await _set_task_state(db, task_id, step="Researching market and company...", progress=65)
                try:
                    market_data = await _run_market_research(llm, job_info, job_url, settings.tavily_api_key, tracker)
                except Exception:
                    # pesquisa externa é opcional: falha não derruba a análise
                    logger.warning(f"[Task {task_id}] Market research failed; continuing without it", exc_info=True)
                    market_data = {}

            # Step 5: scores ponderados (determinístico, explicável)
            scores, seniority_score = _compute_scores(merged_matches, job_info, candidate_seniority)

            # Step 6: síntese final
            await _set_task_state(db, task_id, step="Building final analysis...", progress=80)
            synthesis = await _run_synthesis(
                llm, job_info, merged_matches, scores, seniority_score, candidate_seniority,
                market_data, profile_summary, expectation_flag, tracker, task_id,
            )

            salary = synthesis.get("salary") if isinstance(synthesis.get("salary"), dict) else {}
            expectation = salary.get("expectation") if isinstance(salary.get("expectation"), dict) else {}
            if expectation:
                expectation["required"] = expectation_flag == "true"

            company = synthesis.get("company") if isinstance(synthesis.get("company"), dict) else {}
            red_flags = [f for f in (synthesis.get("red_flags") or []) if isinstance(f, dict)]
            questions = [q for q in (synthesis.get("questions") or []) if isinstance(q, str) and q.strip()]
            recommendation = (
                synthesis.get("recommendation")
                if isinstance(synthesis.get("recommendation"), dict)
                else {}
            )

            job_result = dict(job_info)
            job_result["source_url"] = job_url

            result = {
                "job": job_result,
                "requirements": requirements,
                "profile_match": {
                    **scores,
                    "seniority": seniority_score,
                    "candidate_seniority": candidate_seniority,
                    "seniority_reasoning": seniority_reasoning,
                    "requirements": merged_matches,
                },
                "salary": salary,
                "company": company,
                "red_flags": red_flags,
                "questions": questions,
                "recommendation": recommendation,
                "knowledge_base_available": knowledge_base_available,
                "model_used": settings.model_name,
            }

            # Step 7: persistir análise + concluir task
            await _set_task_state(db, task_id, step="Saving analysis...", progress=95)
            analysis = await JobAnalysisRepository.create(db, {
                "task_id": task_id,
                "job_description": job_description,
                "job_url": job_url,
                "job_title": _truncate(job_info.get("title"), 200),
                "company_name": _truncate(job_info.get("company"), 200),
                "seniority": _truncate(
                    job_info.get("responsibility_seniority") or job_info.get("title_seniority"), 50
                ),
                "work_model": _truncate(job_info.get("work_model"), 50),
                "location": _truncate(job_info.get("location"), 200),
                "contract_type": _truncate(job_info.get("contract_type"), 100),
                "score": scores.get("score"),
                "match_classification": _truncate(recommendation.get("classification"), 30),
                "salary_recommended_min": expectation.get("recommended_min"),
                "salary_recommended_max": expectation.get("recommended_max"),
                "salary_suggested": expectation.get("suggested_value"),
                "result": result,
                "model_used": settings.model_name,
                "completed_at": datetime.now(timezone.utc),
            })

            task = await db.get(GenerationTask, task_id)
            if task:
                task.status = PostStatus.COMPLETED
                task.current_step = "Completed"
                task.progress = 100
                task.result = {"analysis_id": analysis.id}
                task.completed_at = datetime.now(timezone.utc)
                await notify_task_event(
                    db,
                    build_task_payload(task_id, task.status, current_step="Completed", progress=100),
                )
            await db.commit()

            await AuditService.log_event(
                db=db,
                event_type="job_analysis_completed",
                event_category="job_analysis",
                action="analyze",
                status="success",
                resource_type="job_analysis",
                resource_id=analysis.id,
                message=f"Job analysis completed for task {task_id}",
                response_data={
                    "analysis_id": analysis.id,
                    "score": scores.get("score"),
                    "classification": recommendation.get("classification"),
                    "knowledge_base_available": knowledge_base_available,
                },
                duration_ms=int((time.time() - start_time) * 1000),
                correlation_id=correlation_id,
            )

            logger.info(f"[Task {task_id}] Job analysis completed (analysis {analysis.id})")

        except Exception as exc:
            logger.error(f"[Task {task_id}] Job analysis failed: {exc}")

            task = await db.get(GenerationTask, task_id)
            if task:
                task.status = PostStatus.FAILED
                task.current_step = "Analysis failed"
                task.progress = 0
                task.error = (
                    "RATE_LIMIT: o limite de requisições da API de IA foi "
                    "atingido (HTTP 429). Aguarde alguns instantes e tente "
                    "novamente, ou troque o modelo nas Configurações."
                    if is_rate_limit_error(exc)
                    else str(exc)
                )
                task.completed_at = datetime.now(timezone.utc)
                await notify_task_event(
                    db,
                    build_task_payload(
                        task_id, task.status,
                        current_step=task.current_step,
                        progress=task.progress,
                        error=task.error,
                    ),
                )
                await db.commit()

            try:
                await AuditService.log_event(
                    db=db,
                    event_type="job_analysis_failed",
                    event_category="job_analysis",
                    action="analyze",
                    status="failure",
                    resource_type="job_analysis",
                    resource_id=task_id,
                    message=f"Job analysis failed for task {task_id}",
                    error_details={"error": str(exc)[:500]},
                    duration_ms=int((time.time() - start_time) * 1000),
                    correlation_id=correlation_id,
                )
            except Exception:
                logger.warning("Falha ao registrar audit log de erro", exc_info=True)
