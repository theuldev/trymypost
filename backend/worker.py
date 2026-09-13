import asyncio
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import aio_pika

from fastapi import FastAPI

from app.ai.factory import LLMFactory
from app.core.config import get_settings
from app.db.session import AsyncSessionLocal, engine, init_db
from app.models.post import GenerationTask, PostHistory, PostStatus
from app.models.code_example import CodeExample
from app.models.app_settings import AppSettings
from app.services.llm_service import LLMService
from app.services.prompts_service import (
    PROMPT_TEMPLATES,
    STYLE_MAP,
    STRUCTURE_INSTRUCTIONS,
    get_prompt,
    load_prompts,
)
from app.services.code_example_service import store_code_examples

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
) -> Dict[str, Any]:
    """Step 1: Research topic using Tavily and the topic researcher prompt."""
    topic = input_data.get("topic", "")
    quantity = input_data.get("quantity", 3)
    web_trends = input_data.get("web_trends", "")

    prompt_data = get_prompt("topic_research")
    if not prompt_data:
        return {"researched_topics": [], "web_trends": web_trends}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()

    raw = await chain.ainvoke({
        "topic": topic,
        "web_trends": web_trends,
        "quantity": quantity,
    })

    result = _parse_json(raw)
    return {"researched_topics": result if isinstance(result, list) else [], "web_trends": web_trends}


async def _run_hook_generation(
    llm,
    input_data: Dict[str, Any],
    post_content: Optional[str] = None,
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

    context = f"Topic: {topic}. Style: {style}. Audience: {audience}. Experience: {experience}. Objective: {objective}"
    if post_content:
        context += f"\n\nPost content to base the hooks on:\n{post_content}"

    raw = await chain.ainvoke({
        "context": context,
        "objective": objective,
        "tone": style,
        "experience": experience,
        "target_audience": audience,
        "language": _language_label(input_data.get("language", "en")),
    })

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


async def _run_post_generation(
    llm,
    input_data: Dict[str, Any],
) -> Dict[str, Any]:
    """Step 3: Generate the post using the post generator prompt."""
    topic = input_data.get("topic", "")
    style = input_data.get("style", "Technical")
    audience = input_data.get("audience", "Senior Developers")
    experience = input_data.get("experience", "Advanced (5-10 years)")
    objective = input_data.get("objective", "Authority / Personal Branding")
    fmt = input_data.get("format", "Listicle (5 tips, 3 mistakes...)")
    include_code = input_data.get("include_code", False)
    guidelines = input_data.get("guidelines", "") or ""
    quantity = input_data.get("quantity", 3)
    max_length = input_data.get("max_length", 2000)
    language = _language_label(input_data.get("language", "en"))
    structure_instructions = STRUCTURE_INSTRUCTIONS.get(fmt, "")
    voice_example = STYLE_MAP.get(style, style)

    prompt_data = get_prompt("post_generation")
    if not prompt_data:
        return {"content": [], "researched_topics": []}

    template = prompt_data.get("template", "")
    input_variables = prompt_data.get("input_variables", [])

    prompt = PromptTemplate(
        template=template, input_variables=input_variables
    )

    chain = prompt | llm | StrOutputParser()

    posts = []
    for idx in range(quantity):
        try:
            result = await chain.ainvoke({
                "context": f"Topic: {topic}.",
                "format": fmt,
                "structure_instructions": structure_instructions,
                "voice_example": voice_example,
                "angle": f"Angle variation #{idx + 1}",
                "objective": objective,
                "tone": style,
                "experience": experience,
                "cta_objective": "",
                "emoji_intensity": "None",
                "length": max_length,
                "target_audience": audience,
                "rules": guidelines,
                "include_code": str(include_code).lower(),
                "language": language,
            })
            if result and str(result).strip():
                posts.append(str(result))
        except Exception:
            logger.warning("Failed to generate a post variation", exc_info=True)

    return {"content": posts, "researched_topics": []}


async def _run_post_review(
    llm,
    input_data: Dict[str, Any],
    post_content: str,
) -> Dict[str, Any]:
    """Step 4: Review the post using the post reviewer prompt."""
    fmt = input_data.get("format", "Listicle (5 tips, 3 mistakes...)")
    length = input_data.get("max_length", 2000)
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

    result = await chain.ainvoke({
        "post": post_content,
        "format": fmt,
        "angle": angle,
        "length": length,
        "language": language,
    })

    review = _parse_review_text(result) if isinstance(result, str) else result
    return {"review": review}


async def _run_visual_suggestion(
    llm,
    input_data: Dict[str, Any],
    post_content: str,
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

    raw = await chain.ainvoke({
        "topic": topic,
        "post_content": post_content,
    })

    result = _parse_json(raw)
    return {"visual_suggestion": result if isinstance(result, dict) else {}}


async def _run_hashtag_suggestion(
    llm,
    input_data: Dict[str, Any],
    post_content: str,
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

    raw = await chain.ainvoke({
        "post_content": post_content,
        "brand": brand,
    })

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

    raw = await chain.ainvoke({
        "post": post_content,
    })

    result = _parse_json(raw)
    code_examples = result if isinstance(result, list) else [result] if result else []

    return {"code_examples": code_examples}


async def run_generation_pipeline(
    task_id: str,
    input_data: Dict[str, Any],
) -> None:
    """Run the full generation pipeline for a task."""
    async with AsyncSessionLocal() as db:
        try:
            settings = await LLMService.get_settings(db)
            llm = LLMService.create_llm(settings)

            # Step 1: Topic research
            logger.info(f"[Task {task_id}] Step 1: Topic research")
            topic_result = await _run_topic_research(llm, input_data)
            researched_topics = topic_result.get("researched_topics", [])

            include_hooks = bool(input_data.get("include_hooks", True))
            include_review = bool(input_data.get("include_review", True))
            include_visual = bool(input_data.get("include_visual", False))
            include_hashtags = bool(input_data.get("include_hashtags", True))
            include_code = bool(input_data.get("include_code", False))

            # Step 2: Post generation
            logger.info(f"[Task {task_id}] Step 2: Post generation")
            post_result = await _run_post_generation(llm, input_data)
            post_contents = post_result.get("content", [])

            if not post_contents:
                raise ValueError("No post content generated")

            # Generate per-variation content
            variations = []
            for i, post_content in enumerate(post_contents):
                logger.info(f"[Task {task_id}] Processing variation {i+1}/{len(post_contents)}")

                hooks = None
                review = None
                visual = None
                hashtags = None
                code_examples = []

                if include_hooks:
                    hook_result = await _run_hook_generation(llm, input_data, post_content)
                    hooks = _normalize_hooks(hook_result.get("hooks", [])) or None

                if include_review:
                    review_result = await _run_post_review(llm, input_data, post_content)
                    review = _normalize_review(review_result.get("review", {}))

                if include_visual:
                    visual_result = await _run_visual_suggestion(llm, input_data, post_content)
                    visual = _normalize_visual(visual_result.get("visual_suggestion", {}))

                if include_hashtags:
                    hashtag_result = await _run_hashtag_suggestion(llm, input_data, post_content)
                    hashtags = _normalize_hashtags(hashtag_result.get("hashtags", {})) or None

                if include_code:
                    code_result = await _run_code_generation(llm, post_content)
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

            # Top-level fields keep the first variation for history/detail compatibility
            first = variations[0] if variations else {}
            top_hashtags = first.get("hashtags")
            top_hooks = first.get("hooks")
            top_review = first.get("review")
            top_visual = first.get("visual_suggestion")

            # Update task as completed
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
            )
            db.add(post_history)

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

            await db.commit()

            logger.info(f"[Task {task_id}] Generation completed successfully")

        except Exception as exc:
            logger.error(f"[Task {task_id}] Generation failed: {exc}")
            task = await db.get(GenerationTask, task_id)
            if task:
                task.status = PostStatus.FAILED
                task.current_step = 'Generation failed'
                task.progress = 0
                task.error = str(exc)
                task.completed_at = datetime.now(timezone.utc)
                await db.commit()