import json
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.db.session import AsyncSessionLocal
from app.models.post import GenerationTask, PostStatus
from app.models.email_generation import EmailGeneration
from app.models.app_settings import AppSettings
from app.repositories.app_settings_repository import AppSettingsRepository
from app.repositories.user_profile_repository import UserProfileRepository
from app.repositories.email_generation_repository import EmailGenerationRepository
from app.services.llm_service import LLMService
from app.services.llm_retry import invoke_with_rate_limit_retry, is_rate_limit_error
from app.services.usage_service import UsageTracker
from app.services.task_events import build_task_payload, notify_task_event
from app.services.prompts_service import get_prompt
from app.services.search_service import run_with_web_search
from app.services.audit_service import AuditService
import re


def _parse_json(text: Any):
    """Leniently parse JSON from an LLM response. Returns a list/dict or None."""
    if text is None:
        return None
    if isinstance(text, (list, dict)):
        return text

    s = text if isinstance(text, str) else str(text)

    # Strip markdown code fences
    fence = re.search(r'```(?:json)?\s*([\s\S]*?)```', s)
    if fence:
        s = fence.group(1)

    s = s.strip()

    # Try direct parse first
    try:
        return json.loads(s)
    except Exception:
        pass

    # Try to extract the first JSON array/object
    for start, end in (('[', ']'), ('{', '}')):
        i = s.find(start)
        if i == -1:
            continue
        j = s.rfind(end)
        if j > i:
            candidate = s[i:j + 1]
            try:
                return json.loads(candidate)
            except Exception:
                continue

    return None


async def _set_task_state(
    db: AsyncSession,
    task_id: str,
    *,
    status=None,
    step: Optional[str] = None,
    progress: Optional[int] = None,
    error: Optional[str] = None,
) -> None:
    """Atualiza a linha da task e publica o novo estado via pg_notify."""
    task = await db.get(GenerationTask, task_id)
    if task is None:
        return
    if status is not None:
        task.status = status
    if step is not None:
        task.current_step = step
    if progress is not None:
        task.progress = progress
    if error is not None:
        task.error = error
    await notify_task_event(
        db,
        build_task_payload(
            task_id,
            task.status,
            current_step=task.current_step,
            progress=task.progress,
            error=task.error,
        ),
    )
    await db.commit()


def _should_research(extracted_info: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Determine if Tavily research is needed and what fields are missing."""
    missing = []
    
    # Critical fields that trigger research if missing
    if not extracted_info.get("company_name"):
        missing.append("company_name")
    if not extracted_info.get("recruiter_email"):
        missing.append("recruiter_email")
    if not extracted_info.get("job_title"):
        missing.append("job_title")
    
    # Salary expectation ambiguity
    salary_req = extracted_info.get("salary_expectation_required")
    if salary_req is None:
        missing.append("salary_expectation_required")
    
    return len(missing) > 0, missing


def _rate_limit_feedback(task_id: str, description: str):
    """Callback de retry que informa o usuário em tempo real via SSE."""
    async def on_retry(attempt: int, max_retries: int, wait: float) -> None:
        async with AsyncSessionLocal() as sdb:
            task = await sdb.get(GenerationTask, task_id)
            if task is None:
                return
            task.current_step = (
                f"Limite de uso da API de IA atingido ({description}). "
                f"Aguardando {wait:.0f}s para nova tentativa ({attempt}/{max_retries})..."
            )[:100]
            await notify_task_event(
                sdb,
                build_task_payload(
                    task_id,
                    task.status,
                    current_step=task.current_step,
                    progress=task.progress,
                    error=task.error,
                ),
            )
            await sdb.commit()
    return on_retry


async def _run_job_analysis(
    llm,
    job_description: str,
    tavily_api_key: Optional[str],
    tracker: Optional[UsageTracker],
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Step 1: Analyze job description and extract structured info."""
    if tracker:
        tracker.set_step("job_analysis")
    run_config = {"callbacks": [tracker]} if tracker else None

    prompt_data = get_prompt("email_analyzer")
    if not prompt_data:
        return {}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", ["job_description"])

    prompt = PromptTemplate(template=template, input_variables=input_variables)
    chain = prompt | llm | StrOutputParser()

    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({"job_description": job_description}, config=run_config),
        description="job analysis",
        on_retry=_rate_limit_feedback(task_id, "análise da vaga") if task_id else None,
    )

    parsed = _parse_json(raw)
    if isinstance(parsed, dict):
        return parsed
    return {}


async def _run_tavily_research(
    llm,
    job_description: str,
    missing_fields: List[str],
    extracted_info: Dict[str, Any],
    tavily_api_key: Optional[str],
    tracker: Optional[UsageTracker],
) -> Dict[str, Any]:
    """Step 2: Run Tavily research for missing fields."""
    if tracker:
        tracker.set_step("tavily_research")
    run_config = {"callbacks": [tracker]} if tracker else None

    prompt_data = get_prompt("email_tavily_researcher")
    if not prompt_data:
        return {}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", ["job_description", "missing_fields", "extracted_info"])

    prompt = PromptTemplate(template=template, input_variables=input_variables)

    missing_str = ", ".join(missing_fields)
    extracted_str = json.dumps(extracted_info, ensure_ascii=False)

    raw = await run_with_web_search(
        llm,
        prompt.format(
            job_description=job_description,
            missing_fields=missing_str,
            extracted_info=extracted_str,
        ),
        api_key=tavily_api_key,
        max_tool_calls=3,
        config=run_config,
    )

    parsed = _parse_json(raw)
    if isinstance(parsed, dict):
        return parsed
    return {}


def _merge_info(original: Dict[str, Any], researched: Dict[str, Any]) -> Dict[str, Any]:
    """Merge researched info into original, preferring researched for missing fields."""
    merged = original.copy()
    for key, value in researched.items():
        if value and (not merged.get(key) or key == "salary_expectation_required"):
            merged[key] = value
    return merged


async def _get_user_profile(db: AsyncSession, app_settings_id: str) -> Dict[str, Any]:
    """Get user profile formatted for prompt."""
    profile = await UserProfileRepository.get_or_create(db, app_settings_id)
    return {
        "full_name": profile.full_name or "",
        "phone_or_whatsapp": profile.phone_or_whatsapp or "",
        "linkedin_url": profile.linkedin_url or "",
        "github_url": profile.github_url or "",
        "experience_summary": (profile.experience_summary or "").strip(),
        "salary_expectation": (profile.salary_expectation or "").strip(),
    }


def _build_contact_signature(user_profile: Dict[str, Any]) -> str:
    """Build the closing signature block from non-empty real profile fields.

    Garantia: nome + contatos SEMPRE entram no e-mail final, independente
    de o LLM ter os incluído ou não.
    """
    name = (user_profile.get("full_name") or "").strip()
    lines = []
    if name:
        lines.append(name)
    for field in ("phone_or_whatsapp", "linkedin_url", "github_url"):
        value = (user_profile.get(field) or "").strip()
        if value:
            lines.append(value)
    if not lines:
        return ""
    return "\n\nAtenciosamente,\n\n" + "\n".join(lines)


def _apply_signature(body: str, user_profile: Dict[str, Any]) -> str:
    """Append the deterministic signature if not already present."""
    signature = _build_contact_signature(user_profile)
    if not signature:
        return body
    cleaned = body.strip()
    if signature in cleaned:
        return cleaned
    # Remove qualquer fechamento solto do LLM ('Atenciosamente,') para não duplicar
    cleaned = re.sub(r"atenciosamente[,!.\u2026]*\s*$", "", cleaned, flags=re.IGNORECASE).strip()
    return cleaned + signature


async def _run_email_generation(
    llm,
    job_description: str,
    merged_info: Dict[str, Any],
    user_profile: Dict[str, Any],
    salary_expectation_required: bool,
    tracker: Optional[UsageTracker],
    global_guidelines: Optional[str] = None,
    task_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Step 3: Generate the email using appropriate template."""
    if tracker:
        tracker.set_step("email_generation")
    run_config = {"callbacks": [tracker]} if tracker else None

    prompt_data = get_prompt("email_generator")
    if not prompt_data:
        return {}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [
        "job_description", "extracted_info", "full_name", "phone_or_whatsapp",
        "linkedin_url", "github_url", "salary_expectation_required",
        "job_title", "recruiter_name", "key_requirements", "technologies",
        "experience_summary", "salary_expectation", "global_guidelines",
    ])

    prompt = PromptTemplate(template=template, input_variables=input_variables)
    chain = prompt | llm | StrOutputParser()

    # Determine recruiter name or fallback
    recruiter_name_or_team = merged_info.get("recruiter_name") or "Time de Seleção"

    extracted_str = json.dumps(merged_info, ensure_ascii=False)

    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({
            "job_description": job_description,
            "extracted_info": extracted_str,
            "full_name": user_profile.get("full_name", ""),
            "phone_or_whatsapp": user_profile.get("phone_or_whatsapp", ""),
            "linkedin_url": user_profile.get("linkedin_url", ""),
            "github_url": user_profile.get("github_url", ""),
            "salary_expectation_required": str(salary_expectation_required).lower(),
            "job_title": merged_info.get("job_title", "Vaga"),
            "recruiter_name": merged_info.get("recruiter_name", ""),
            "recruiter_name_or_team": recruiter_name_or_team,
            "key_requirements": merged_info.get("key_requirements", []),
            "technologies": merged_info.get("technologies", []),
            "experience_summary": user_profile.get("experience_summary", "") or "(sem resumo configurado)",
            "salary_expectation": user_profile.get("salary_expectation", "") or "(não configurada)",
            "global_guidelines": (global_guidelines or "").strip() or "(nenhuma)",
        }, config=run_config),
        description="email generation",
        on_retry=_rate_limit_feedback(task_id, "geração do e-mail") if task_id else None,
    )

    parsed = _parse_json(raw)
    if isinstance(parsed, dict):
        return parsed
    return {}


async def run_email_generation_pipeline(
    task_id: str,
    input_data: Dict[str, Any],
) -> None:
    """Run the complete email generation pipeline."""
    start_time = time.time()
    correlation_id = str(uuid.uuid4())
    
    async with AsyncSessionLocal() as db:
        try:
            # Mensagem re-entregue (worker reiniciou no meio do processamento)?
            # Se a task já está em estado terminal, não reprocessa.
            existing = await db.get(GenerationTask, task_id)
            if existing and existing.status in (
                PostStatus.COMPLETED,
                PostStatus.FAILED,
                PostStatus.CANCELLED,
            ):
                return

            await _set_task_state(
                db, task_id, status=PostStatus.PROCESSING, step="Starting...", progress=5
            )
            
            settings = await LLMService.get_settings(db)
            llm = LLMService.create_llm(settings)
            tracker = UsageTracker(settings.provider, settings.model_name)

            job_description = input_data.get("job_description", "")
            if not job_description:
                raise ValueError("Job description is required")

            # Audit: Log email generation started
            await AuditService.log_email_generation_started(
                db=db,
                task_id=task_id,
                job_description=job_description,
                correlation_id=correlation_id,
            )
            pipeline_start_time = time.time()
            
            # Step 1: Analyze job description
            await _set_task_state(db, task_id, step="Analyzing job description...", progress=15)
            extracted_info = await _run_job_analysis(llm, job_description, settings.tavily_api_key, tracker, task_id=task_id)

            # Step 2: Check if research needed
            await _set_task_state(db, task_id, step="Checking if research needed...", progress=30)
            needs_research, missing_fields = _should_research(extracted_info)

            tavily_searches = 0
            if needs_research and settings.tavily_api_key:
                await _set_task_state(db, task_id, step="Researching missing information...", progress=45)
                researched_info = await _run_tavily_research(
                    llm, job_description, missing_fields, extracted_info, settings.tavily_api_key, tracker
                )
                extracted_info = _merge_info(extracted_info, researched_info)
                tavily_searches = 1  # Simplified count

            # Step 3: Get user profile
            await _set_task_state(db, task_id, step="Loading user profile...", progress=60)
            user_profile = await _get_user_profile(db, settings.id)

            # Check if profile has minimum required info
            if not user_profile.get("full_name"):
                raise ValueError("User profile not configured. Please set your name in Settings.")

            # Step 4: Generate email
            await _set_task_state(db, task_id, step="Generating email...", progress=75)
            salary_required = bool(extracted_info.get("salary_expectation_required", False))
            email_result = await _run_email_generation(
                llm, job_description, extracted_info, user_profile, salary_required, tracker,
                global_guidelines=getattr(settings, "guidelines", "") or "",
                task_id=task_id,
            )

            # Validate result
            if not email_result.get("subject") or not email_result.get("body"):
                raise ValueError("Failed to generate valid email")

            # Garante nome + contatos reais do perfil no corpo do e-mail
            email_result["body"] = _apply_signature(email_result["body"], user_profile)

            # Step 5: Persist results
            await _set_task_state(db, task_id, step="Saving results...", progress=90)
            
            generation_time_ms = int((time.time() - start_time) * 1000)
            
            # Create EmailGeneration record
            email_gen_data = {
                "task_id": task_id,
                "job_description": input_data.get("job_description", ""),
                "job_title": extracted_info.get("job_title"),
                "company_name": extracted_info.get("company_name"),
                "recruiter_name": extracted_info.get("recruiter_name"),
                "recruiter_email": extracted_info.get("recruiter_email"),
                "key_requirements": extracted_info.get("key_requirements", []),
                "technologies": extracted_info.get("technologies", []),
                "experience_desired": extracted_info.get("experience_desired", []),
                "location_modality": extracted_info.get("location_modality"),
                "salary_info": extracted_info.get("salary_info"),
                "salary_expectation_required": extracted_info.get("salary_expectation_required", False),
                "recipient_email": email_result.get("recipient_email"),
                "subject": email_result.get("subject"),
                "body": email_result.get("body"),
                "model_used": settings.model_name,
                "tavily_searches_performed": str(tavily_searches),
                "generation_time_ms": str(generation_time_ms),
            }
            
            email_gen = await EmailGenerationRepository.create(db, email_gen_data)

            # Update GenerationTask
            task = await db.get(GenerationTask, task_id)
            if task:
                task.status = PostStatus.COMPLETED
                task.current_step = 'Completed'
                task.progress = 100
                task.result = {
                    "email_id": email_gen.id,
                    "recipient_email": email_result.get("recipient_email"),
                    "subject": email_result.get("subject"),
                    "body": email_result.get("body"),
                    "extracted_info": extracted_info,
                }
                task.completed_at = datetime.now(timezone.utc)

            # Persist usage records
            for record in tracker.records:
                from app.models.post_usage import PostUsage
                db.add(PostUsage(
                    id=str(uuid.uuid4()),
                    post_id=None,
                    task_id=task_id,
                    **record,
                ))

            await notify_task_event(
                db,
                build_task_payload(
                    task_id, task.status,
                    current_step="Completed", progress=100,
                ),
            )
            await db.commit()

            # Audit: Log successful completion
            pipeline_duration_ms = int((time.time() - pipeline_start_time) * 1000)
            await AuditService.log_email_generation_completed(
                db=db,
                task_id=task_id,
                result=email_result,
                duration_ms=pipeline_duration_ms,
                correlation_id=correlation_id,
            )

        except Exception as exc:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"[Task {task_id}] Email generation failed: {exc}")
            task = await db.get(GenerationTask, task_id)
            if task:
                task.status = PostStatus.FAILED
                task.current_step = 'Generation failed'
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

            # Audit: Log failure
            pipeline_duration_ms = int((time.time() - pipeline_start_time) * 1000)
            await AuditService.log_email_generation_failed(
                db=db,
                task_id=task_id,
                error=str(exc),
                duration_ms=pipeline_duration_ms,
                correlation_id=correlation_id,
            )