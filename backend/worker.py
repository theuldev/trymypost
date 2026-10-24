import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.db.session import AsyncSessionLocal
from app.models.post import GenerationTask, PostHistory, PostStatus
from app.models.code_example import CodeExample
from app.services.llm_service import LLMService
from app.services.prompts_service import (
    STYLE_MAP,
    STRUCTURE_INSTRUCTIONS,
    get_prompt,
    load_prompts,
)
from app.services.search_service import run_with_web_search
from app.services.llm_retry import (
    invoke_with_rate_limit_retry,
    is_rate_limit_error,
)
from app.services.usage_service import UsageTracker
from app.services.task_events import build_task_payload, notify_task_event
from app.services import image_service
from app.services import rag_service
from app.models.post_usage import PostUsage
from app.services.email_pipeline_service import run_email_generation_pipeline
from app.services.job_analysis_pipeline_service import run_job_analysis_pipeline

from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_prompts()

logger = logging.getLogger(__name__)


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


LANGUAGE_LABELS = {
    "pt": "português (Brasil)",
    "en": "English",
    "es": "español",
}


def _language_label(code: str) -> str:
    return LANGUAGE_LABELS.get(code, "English")


def _normalize_hooks(hooks):
    if not isinstance(hooks, list):
        return []
    out = []
    for h in hooks:
        if isinstance(h, dict):
            out.append({
                "type": h.get("tipo", h.get("type", "")),
                "text": h.get("texto", h.get("text", "")),
                "why_it_works": h.get("por_que_funciona", h.get("why_it_works", "")),
            })
    return out


def _normalize_hashtags(hashtags):
    if not isinstance(hashtags, dict):
        return []
    out = []
    for category, tags in hashtags.items():
        if isinstance(tags, list):
            for tag in tags:
                out.append({"tag": tag, "relevance": category, "estimated_volume": ""})
    return out


def _normalize_review(review):
    if not isinstance(review, dict):
        return None
    return {
        "score": review.get("score", 0),
        "strengths": review.get("pontos_fortes", review.get("strengths", [])),
        "improvements": review.get("pontos_melhoria", review.get("improvements", [])),
        "suggestions": review.get("sugestoes", review.get("suggestions", [])),
    }


def _normalize_visual(visual):
    if not isinstance(visual, dict):
        return None
    return {
        "content_type": visual.get("tipo_conteudo", visual.get("content_type", "")),
        "visual_description": visual.get("descricao_visual", visual.get("visual_description", "")),
        "code_example": visual.get("codigo_exemplo", visual.get("code_example")),
        "code_language": visual.get("codigo_linguagem", visual.get("code_language")),
        "suggested_tools": visual.get("ferramentas_sugeridas", visual.get("suggested_tools", [])),
        "composition_tips": visual.get("dicas_composicao", visual.get("composition_tips", [])),
    }


def _normalize_code_examples(code_examples):
    if not isinstance(code_examples, list):
        return []
    out = []
    for ce in code_examples:
        if isinstance(ce, dict):
            out.append({"code": ce.get("code", ""), "language": ce.get("language", "plaintext")})
    return out


def _parse_review_text(review_text: str) -> dict:
    result = {
        "score": 0,
        "pontos_fortes": [],
        "pontos_melhoria": [],
        "sugestoes": [],
    }

    score_match = re.search(r'(?:SCORE FINAL|FINAL SCORE):\s*([\d.]+)/10', review_text)
    if score_match:
        result["score"] = float(score_match.group(1))

    problemas_match = re.search(
        r'(?:PROBLEMAS|PROBLEMS):?\s*\n(.*?)(?:\n\s*(?:RESULTADO|RESULT|POST REESCRITO|POST APROVADO)|$)',
        review_text, re.IGNORECASE | re.DOTALL
    )
    if problemas_match:
        points = problemas_match.group(1).strip()
        for line in points.split('\n'):
            line = line.strip()
            line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
            line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
            if line:
                lower = line.lower()
                if any(kw in lower for kw in ['suger', 'ajust', 'melhor', 'recomend', 'poderia', 'deveria', 'suggest', 'improve', 'recommend']):
                    result["sugestoes"].append(line.strip())
                else:
                    result["pontos_melhoria"].append(line.strip())

    resultado_match = re.search(
        r'(?:RESULTADO|RESULT):?\s*\n(.*?)(?:\n\s*(?:POST REESCRITO|POST APROVADO)|$)',
        review_text, re.IGNORECASE | re.DOTALL
    )
    if resultado_match:
        result_text = resultado_match.group(1).strip()
        for line in result_text.split('\n'):
            line = line.strip()
            line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
            line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
            if line:
                if any(kw in line.lower() for kw in ['suger', 'ajust', 'melhor', 'recomend', 'poderia', 'deveria', 'suggest', 'improve', 'recommend']):
                    result["sugestoes"].append(line.strip())
                else:
                    result["pontos_fortes"].append(line.strip())

    return result


async def _run_topic_research(
    llm,
    input_data: Dict[str, Any],
    tavily_api_key: Optional[str] = None,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 1: Research topic via an agentic loop — the LLM calls the Tavily
    web_search tool as many times as needed to refine the research."""
    topic = input_data.get("topic", "")
    quantity = input_data.get("quantity", 3)
    if tracker:
        tracker.set_step("research")
    run_config = {"callbacks": [tracker]} if tracker else None

    prompt_data = get_prompt("topic_research")
    if not prompt_data:
        return {"researched_topics": []}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    raw = await run_with_web_search(
        llm,
        prompt.format(topic=topic, quantity=quantity),
        api_key=tavily_api_key,
        config=run_config,
    )

    parsed = _parse_json(raw)
    if isinstance(parsed, dict):
        briefing = str(parsed.get("briefing") or raw)
        angles = [a for a in parsed.get("angles", []) if isinstance(a, str)]
    else:
        # Fallback: model answered with plain text instead of JSON
        briefing = raw if isinstance(raw, str) else str(raw)
        angles = parsed if isinstance(parsed, list) else []

    return {"research_briefing": briefing, "angles": angles}


async def _run_hook_generation(
    llm,
    input_data: Dict[str, Any],
    post_content: Optional[str] = None,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 2: Generate hooks using the hook generator prompt."""
    topic = input_data.get("topic", "")
    style = input_data.get("style", "Technical")
    audience = input_data.get("audience", "Senior Developers")
    experience = input_data.get("experience", "Advanced (5-10 years)")
    objective = input_data.get("objective", "Authority / Personal Branding")

    prompt_data = get_prompt("hook_generation")
    if not prompt_data:
        return {"hooks": []}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()
    run_config = None
    if tracker:
        tracker.set_step("hooks")
        run_config = {"callbacks": [tracker]}

    context = f"Topic: {topic}. Style: {style}. Audience: {audience}. Experience: {experience}. Objective: {objective}"
    if post_content:
        context += f"\n\nPost content to base the hooks on:\n{post_content}"

    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({
            "context": context,
            "objective": objective,
            "tone": style,
            "experience": experience,
            "target_audience": audience,
            "language": _language_label(input_data.get("language", "en")),
        }, config=run_config),
        description="hook generation",
    )

    hooks = _parse_json(raw)
    if not isinstance(hooks, list):
        hooks = []
    formatted_hooks = []
    for h in hooks:
        if isinstance(h, dict):
            formatted_hooks.append({
                "tipo": h.get("tipo", ""),
                "texto": h.get("texto", ""),
                "por_que_funciona": h.get("por_que_funciona", ""),
            })
        else:
            formatted_hooks.append({
                "tipo": "",
                "texto": str(h) if h else "",
                "por_que_funciona": "",
            })

    return {"hooks": formatted_hooks}


def _length_instruction(max_length: Any) -> str:
    """Builds the length instruction injected into prompts.

    When max_length is not set the user chose "automatic size": the AI
    decides how many characters the post should have."""
    if max_length:
        return (
            "Strict character limit: the complete post (including spaces, "
            f"punctuation and CTA) MUST have at most {max_length} characters. "
            "This rule is absolute and takes priority over any other instruction."
        )
    return (
        "Length: automatic (chosen by you) — decide the ideal length for this "
        "post based on the content, the requested format and LinkedIn best "
        "practices: concise and scannable, usually between 800 and 3000 "
        "characters. Do not mention or repeat this instruction in the post."
    )


async def _run_post_generation(
    llm,
    input_data: Dict[str, Any],
    research_briefing: str = "",
    angles: Optional[list] = None,
    tavily_api_key: Optional[str] = None,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 2: Generate posts grounded on the research briefing.

    The LLM also has access to the web_search tool, so it can verify or
    complement facts from the briefing whenever needed."""
    topic = input_data.get("topic", "")
    style = input_data.get("style", "Technical")
    audience = input_data.get("audience", "Senior Developers")
    experience = input_data.get("experience", "Advanced (5-10 years)")
    objective = input_data.get("objective", "Authority / Personal Branding")
    fmt = input_data.get("format", "Listicle (5 tips, 3 mistakes...)")
    include_code = input_data.get("include_code", False)
    guidelines = input_data.get("guidelines", "") or ""
    quantity = input_data.get("quantity", 3)
    max_length = input_data.get("max_length")
    language = _language_label(input_data.get("language", "en"))
    structure_instructions = STRUCTURE_INSTRUCTIONS.get(fmt, "")
    voice_example = STYLE_MAP.get(style, style)

    prompt_data = get_prompt("post_generation")
    if not prompt_data:
        return {"content": []}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )
    run_config = None
    if tracker:
        tracker.set_step("post_generation")
        run_config = {"callbacks": [tracker]}

    context = f"Topic: {topic}."
    if research_briefing:
        context += f"\n\nTechnical briefing (researched on the web):\n{research_briefing}"

    posts = []
    for idx in range(quantity):
        angle = (
            angles[idx]
            if angles and idx < len(angles)
            else f"Angle variation #{idx + 1}"
        )
        try:
            result = await run_with_web_search(
                llm,
                prompt.format(
                    context=context,
                    format=fmt,
                    structure_instructions=structure_instructions,
                    voice_example=voice_example,
                    angle=angle,
                    objective=objective,
                    tone=style,
                    experience=experience,
                    cta_objective="",
                    emoji_intensity="None",
                    length_instruction=_length_instruction(max_length),
                    target_audience=audience,
                    rules=guidelines,
                    include_code=str(include_code).lower(),
                    language=language,
                ),
                api_key=tavily_api_key,
                max_tool_calls=3,
                config=run_config,
            )
            if result and str(result).strip():
                posts.append(str(result))
        except Exception:
            logger.warning("Failed to generate a post variation", exc_info=True)

    return {"content": posts}


async def _run_post_from_description(
    llm,
    input_data: Dict[str, Any],
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Gera posts diretamente a partir da descrição livre do usuário
    (lançamento de produto, marco, vaga, lição aprendida, etc.)."""
    description = input_data.get("description", "")
    visual_brief = input_data.get("visual_brief") or ""
    guidelines = input_data.get("guidelines", "") or ""
    quantity = input_data.get("quantity", 3)
    max_length = input_data.get("max_length")
    include_code = input_data.get("include_code", False)
    language = _language_label(input_data.get("language", "en"))

    prompt_data = get_prompt("post_from_description")
    if not prompt_data:
        return {"content": []}

    prompt = PromptTemplate(
        template=prompt_data.get("template", ""),
        input_variables=prompt_data.get("input_variables", []),
    )

    chain = prompt | llm | StrOutputParser()
    run_config = None
    if tracker:
        tracker.set_step("post_generation")
        run_config = {"callbacks": [tracker]}

    posts = []
    for idx in range(quantity):
        variation_hint = (
            f"This is variation {idx + 1} of {quantity}. Use a distinct opening, "
            f"angle and structure so the variations feel meaningfully different."
        )
        try:
            raw = await invoke_with_rate_limit_retry(
                lambda: chain.ainvoke({
                    "description": description,
                    "visual_brief": visual_brief,
                    "rules": guidelines,
                    "language": language,
                    "length_instruction": _length_instruction(max_length),
                    "include_code": str(include_code).lower(),
                    "variation_hint": variation_hint,
                }, config=run_config),
                description="post from description",
            )
            if raw and str(raw).strip():
                posts.append(str(raw))
        except Exception:
            logger.warning("Failed to generate a description-based post", exc_info=True)

    return {"content": posts}


async def _run_post_review(
    llm,
    input_data: Dict[str, Any],
    post_content: str,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 4: Review the post using the post reviewer prompt."""
    fmt = input_data.get("format", "Listicle (5 tips, 3 mistakes...)")
    length_instruction = _length_instruction(input_data.get("max_length"))
    angle = input_data.get("angle", "")
    language = "português do Brasil" if input_data.get("language", "en") == "pt" else "English"

    prompt_data = get_prompt("review")
    if not prompt_data:
        return {"review": {"score": 5, "status": "APROVADO", "pontos_fortes": [], "pontos_melhoria": [], "sugestoes": []}}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()
    run_config = None
    if tracker:
        tracker.set_step("review")
        run_config = {"callbacks": [tracker]}

    result = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({
            "post": post_content,
            "format": fmt,
            "angle": angle,
            "length_instruction": length_instruction,
            "language": language,
        }, config=run_config),
        description="post review",
    )

    review = _parse_review_text(result) if isinstance(result, str) else result
    return {"review": review}


async def _run_visual_suggestion(
    llm,
    input_data: Dict[str, Any],
    post_content: str,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 5: Suggest visual ideas."""
    topic = input_data.get("topic", "")

    prompt_data = get_prompt("visual_suggestion")
    if not prompt_data:
        return {"visual_suggestion": {}}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()
    run_config = None
    if tracker:
        tracker.set_step("visual_suggestion")
        run_config = {"callbacks": [tracker]}

    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({
            "topic": topic,
            "post_content": post_content,
        }, config=run_config),
        description="visual suggestion",
    )

    result = _parse_json(raw)
    return {"visual_suggestion": result if isinstance(result, dict) else {}}


async def _run_hashtag_suggestion(
    llm,
    input_data: Dict[str, Any],
    post_content: str,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 6: Suggest hashtags."""
    brand = input_data.get("brand", "TryMyPost")

    prompt_data = get_prompt("hashtag_suggestion")
    if not prompt_data:
        return {"hashtags": {"populares": [], "nicho": [], "marca": []}}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()
    run_config = None
    if tracker:
        tracker.set_step("hashtags")
        run_config = {"callbacks": [tracker]}

    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({
            "post_content": post_content,
            "brand": brand,
        }, config=run_config),
        description="hashtag suggestion",
    )

    result = _parse_json(raw)
    hashtags = result if isinstance(result, dict) else {
        "populares": [],
        "nicho": [],
        "marca": [],
    }

    return {"hashtags": hashtags}


async def _run_code_generation(
    llm,
    post_content: str,
    tracker: Optional[UsageTracker] = None,
) -> Dict[str, Any]:
    """Step 7: Generate code examples (if include_code)."""
    prompt_data = get_prompt("code_generator")
    if not prompt_data:
        return {"code_examples": []}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()
    run_config = None
    if tracker:
        tracker.set_step("code_generation")
        run_config = {"callbacks": [tracker]}

    raw = await invoke_with_rate_limit_retry(
        lambda: chain.ainvoke({
            "post": post_content,
        }, config=run_config),
        description="code generation",
    )

    result = _parse_json(raw)
    code_examples = result if isinstance(result, list) else [result] if result else []

    return {"code_examples": code_examples}


async def _set_task_state(
    db,
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


async def run_generation_pipeline(
    task_id: str,
    input_data: Dict[str, Any],
) -> None:
    """Run the full generation pipeline for a task."""
    async with AsyncSessionLocal() as db:
        try:
            await _set_task_state(
                db, task_id, status=PostStatus.PROCESSING, step="Starting...", progress=5
            )
            settings = await LLMService.get_settings(db)
            llm = LLMService.create_llm(settings)
            tracker = UsageTracker(settings.provider, settings.model_name)

            # Guidelines globais (Configurações) como fallback das guidelines por-post
            input_data["guidelines"] = (
                input_data.get("guidelines") or getattr(settings, "guidelines", "") or ""
            )

            input_mode = input_data.get("input_mode", "structured")

            # RAG: busca na base de conhecimento (pgvector) e injeta no contexto
            rag_context = ""
            if input_data.get("use_rag"):
                rag_query = (
                    input_data.get("description")
                    or input_data.get("topic")
                    or ""
                )
                rag_context = await rag_service.get_rag_context(
                    rag_query, app_settings=settings, llm=llm
                )
                if rag_context:
                    logger.info(f"[Task {task_id}] Knowledge base (RAG) context injected")

            if input_mode == "description":
                description = input_data.get("description", "")
                if rag_context:
                    input_data["description"] = (
                        f"{description}\n\n"
                        f"AUTHOR'S KNOWLEDGE BASE (use these facts when relevant, "
                        f"weaving references naturally into the post):\n{rag_context}"
                    )
                if not input_data.get("topic"):
                    input_data["topic"] = description[:120]
                research_briefing = ""
                researched_topics = []
            else:
                if rag_context:
                    research_briefing_extra = (
                        f"\n\nAUTHOR'S KNOWLEDGE BASE (use these facts when relevant):\n{rag_context}"
                    )
                else:
                    research_briefing_extra = ""
                logger.info(f"[Task {task_id}] Step 1: Topic research")
                topic_result = await _run_topic_research(
                    llm, input_data, settings.tavily_api_key, tracker=tracker
                )
                research_briefing = (
                    topic_result.get("research_briefing", "") + research_briefing_extra
                )
                researched_topics = topic_result.get("angles", [])

            include_hooks = bool(input_data.get("include_hooks", True))
            include_review = bool(input_data.get("include_review", True))
            include_visual = bool(input_data.get("include_visual", False))
            include_hashtags = bool(input_data.get("include_hashtags", True))
            include_code = bool(input_data.get("include_code", False))

            logger.info(f"[Task {task_id}] Step 2: Post generation")
            await _set_task_state(db, task_id, step="Generating posts", progress=20)
            if input_mode == "description":
                post_result = await _run_post_from_description(
                    llm, input_data, tracker=tracker
                )
            else:
                post_result = await _run_post_generation(
                    llm,
                    input_data,
                    research_briefing,
                    researched_topics,
                    settings.tavily_api_key,
                    tracker=tracker,
                )
            post_contents = post_result.get("content", [])

            if not post_contents:
                raise ValueError("No post content generated")

            variations = []
            for i, post_content in enumerate(post_contents):
                logger.info(f"[Task {task_id}] Processing variation {i+1}/{len(post_contents)}")
                await _set_task_state(
                    db,
                    task_id,
                    step=f"Processing variation {i+1}/{len(post_contents)}",
                    progress=20 + int(65 * (i + 1) / len(post_contents)),
                )

                hooks = None
                review = None
                visual = None
                hashtags = None
                code_examples = []

                if include_hooks:
                    hook_result = await _run_hook_generation(llm, input_data, post_content, tracker=tracker)
                    hooks = _normalize_hooks(hook_result.get("hooks", [])) or None

                if include_review:
                    review_result = await _run_post_review(llm, input_data, post_content, tracker=tracker)
                    review = _normalize_review(review_result.get("review", {}))

                if include_visual:
                    visual_input = input_data
                    if input_data.get("visual_brief"):
                        visual_input = {
                            **input_data,
                            "topic": (
                                f"{input_data.get('topic', '')} "
                                f"(author's requested visual direction: {input_data['visual_brief']})"
                            ),
                        }
                    visual_result = await _run_visual_suggestion(llm, visual_input, post_content, tracker=tracker)
                    visual = _normalize_visual(visual_result.get("visual_suggestion", {}))

                if include_hashtags:
                    hashtag_result = await _run_hashtag_suggestion(llm, input_data, post_content, tracker=tracker)
                    hashtags = _normalize_hashtags(hashtag_result.get("hashtags", {})) or None

                if include_code:
                    code_result = await _run_code_generation(llm, post_content, tracker=tracker)
                    code_examples = _normalize_code_examples(code_result.get("code_examples", []))

                variations.append({
                    "variation": i + 1,
                    "content": post_content,
                    "is_edited": False,
                    "review": review,
                    "visual_suggestion": visual,
                    "hashtags": hashtags,
                    "hooks": hooks,
                    "code_examples": code_examples,
                })

            first = variations[0] if variations else {}
            top_hashtags = first.get("hashtags")
            top_hooks = first.get("hooks")
            top_review = first.get("review")
            top_visual = first.get("visual_suggestion")

            # Geração real de imagem (se configurada nas Settings)
            generated_image_url = None
            if include_visual and image_service.is_configured(settings):
                try:
                    tracker.set_step("image_generation")
                    image_prompt = image_service.build_image_prompt(
                        top_visual, input_data.get("topic", "")
                    )
                    generated_image_url, image_cost = await image_service.generate_image(
                        settings, image_prompt
                    )
                    tracker.add_manual_record(
                        "image_generation",
                        provider=settings.image_provider,
                        model_name=settings.image_model or "default",
                        cost_usd=image_cost,
                    )
                except Exception:
                    logger.warning(f"[Task {task_id}] Image generation failed", exc_info=True)

            task = await db.get(GenerationTask, task_id)
            if task:
                task.status = PostStatus.COMPLETED
                task.current_step = 'Completed'
                task.progress = 100
                task.result = {
                    "posts_data": variations,
                    "researched_topics": researched_topics,
                    "hashtags": top_hashtags,
                    "hooks": top_hooks,
                    "review": top_review,
                    "visual_suggestion": top_visual,
                }
                task.completed_at = datetime.now(timezone.utc)

            # Persist a PostHistory record so it shows up in the history list
            post_history = PostHistory(
                id=str(uuid.uuid4()),
                topic=input_data.get("topic", ""),
                style=input_data.get("style", ""),
                audience=input_data.get("audience", ""),
                experience=input_data.get("experience", ""),
                objective=input_data.get("objective", ""),
                format=input_data.get("format", ""),
                include_code=bool(input_data.get("include_code", False)),
                include_visual=bool(input_data.get("include_visual", False)),
                status=PostStatus.COMPLETED,
                content=variations,
                researched_topics=researched_topics,
                hashtags=top_hashtags,
                hooks=top_hooks,
                review=top_review,
                visual_suggestion=top_visual,
                language=input_data.get("language", "pt"),
                completed_at=datetime.now(timezone.utc),
                generated_image_url=generated_image_url,
            )
            db.add(post_history)

            # Persiste o uso/custo de tokens coletado no pipeline
            for record in tracker.records:
                db.add(PostUsage(
                    id=str(uuid.uuid4()),
                    post_id=post_history.id,
                    task_id=task_id,
                    **record,
                ))

            # Persist code examples (all variations)
            for variation in variations:
                for item in (variation.get("code_examples") or []):
                    if not isinstance(item, dict):
                        continue
                    db.add(CodeExample(
                        id=str(uuid.uuid4()),
                        code=item.get("code", ""),
                        language=item.get("language", "plaintext"),
                        post_id=post_history.id,
                    ))

            if task:
                await notify_task_event(
                    db,
                    build_task_payload(
                        task_id, task.status,
                        current_step="Completed", progress=100,
                    ),
                )
            await db.commit()

            logger.info(f"[Task {task_id}] Generation completed successfully")

        except Exception as exc:
            logger.error(f"[Task {task_id}] Generation failed: {exc}")
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


async def consume_email_generation_tasks():
    """Consumer for email_generation_tasks queue."""
    import aio_pika
    from app.core.config import get_settings
    
    settings = get_settings()
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    
    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue("email_generation_tasks", durable=True)
        
        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        data = json.loads(message.body.decode())
                        task_id = data.get("task_id")
                        input_data = data.get("input_data", {})
                        logger.info(f"[Email Worker] Processing task {task_id}")
                        await run_email_generation_pipeline(task_id, input_data)
                    except Exception as exc:
                        logger.error(f"[Email Worker] Failed to process message: {exc}", exc_info=True)


async def consume_job_analysis_tasks():
    """Consumer for job_analysis_tasks queue."""
    import aio_pika
    from app.core.config import get_settings

    settings = get_settings()
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)

    async with connection:
        channel = await connection.channel()
        await channel.set_qos(prefetch_count=1)
        queue = await channel.declare_queue("job_analysis_tasks", durable=True)

        async with queue.iterator() as queue_iter:
            async for message in queue_iter:
                async with message.process():
                    try:
                        data = json.loads(message.body.decode())
                        task_id = data.get("task_id")
                        input_data = data.get("input_data", {})
                        logger.info(f"[Job Analysis Worker] Processing task {task_id}")
                        await run_job_analysis_pipeline(task_id, input_data)
                    except Exception as exc:
                        logger.error(f"[Job Analysis Worker] Failed to process message: {exc}", exc_info=True)


if __name__ == "__main__":
    import asyncio
    import sys
    
    # Check if running email worker
    if len(sys.argv) > 1 and sys.argv[1] == "email-worker":
        asyncio.run(consume_email_generation_tasks())
    elif len(sys.argv) > 1 and sys.argv[1] == "job-analysis-worker":
        asyncio.run(consume_job_analysis_tasks())
    else:
        # Original worker logic would go here
        pass