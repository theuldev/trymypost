from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from datetime import datetime
import json
import re
import uuid

from app.db.session import get_db
from app.models.post import PostHistory, PostStatus, GenerationTask
from app.models.code_example import CodeExample
from app.models.code_preset import CodeImagePreset
from app.schemas.post import (
    GeneratePostRequest, GeneratePostResponse, TaskStatusResponse,
    PostHistoryListResponse, PostHistoryDetail, PostHistoryBase,
    ToggleFavoriteRequest, UpdateTagsRequest, CodeFromPostRequest,
    CodeFromPostResponse, SuggestTopicsRequest, SuggestTopicsResponse,
    HealthResponse,
)
from app.schemas.code_example import CodeExampleResponse
from app.schemas.code_preset import CodePresetCreate, CodePresetResponse
from app.services.pipeline_service import start_generation_task
from app.ai.generators.code_generator import CodeGenerator
from app.services.prompts_service import get_prompt

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")


@router.post("/posts/generate", response_model=GeneratePostResponse)
async def generate_post(
    request: GeneratePostRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    task_id = await start_generation_task(db, request.model_dump(mode="json"))
    return GeneratePostResponse(task_id=task_id, status="pending")


@router.get("/posts/generate/{task_id}", response_model=TaskStatusResponse)
async def get_generation_status(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status.value,
        current_step=task.current_step,
        progress=task.progress,
        result=task.result,
        error=task.error,
    )


@router.post("/posts/generate/{task_id}/cancel")
async def cancel_generation(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status in [PostStatus.COMPLETED, PostStatus.FAILED, PostStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Task already finished")
    task.status = PostStatus.CANCELLED
    await db.commit()
    return {"message": "Generation cancelled"}


@router.get("/history", response_model=PostHistoryListResponse)
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    status: Optional[str] = None,
    favorito: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(PostHistory).order_by(PostHistory.created_at.desc())
    
    if search:
        query = query.where(PostHistory.topic.ilike(f"%{search}%"))
    if status:
        try:
            query = query.where(PostHistory.status == PostStatus(status))
        except ValueError:
            pass
    if favorito is not None:
        query = query.where(PostHistory.is_favorite == favorito)
    
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()
    
    return PostHistoryListResponse(
        items=[PostHistoryBase.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/history/{history_id}", response_model=PostHistoryDetail)
async def get_history_detail(history_id: str, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    code_examples_result = await db.execute(
        select(CodeExample).where(CodeExample.post_id == history_id).order_by(CodeExample.created_at.asc())
    )
    code_examples = list(code_examples_result.scalars().all())

    # Convert ORM to dict and parse review string if needed
    data = {
        "id": history.id,
        "topic": history.topic,
        "style": history.style,
        "audience": history.audience,
        "experience": history.experience,
        "objective": history.objective,
        "format": history.format,
        "include_code": history.include_code,
        "include_visual": history.include_visual,
        "status": history.status.value if hasattr(history.status, 'value') else history.status,
        "is_favorite": history.is_favorite,
        "tags": history.tags or [],
        "created_at": history.created_at,
        "updated_at": history.updated_at,
        "completed_at": history.completed_at,
        "error_message": history.error_message,
        "posts_data": history.content,
        "researched_topics": history.researched_topics,
        "hashtags": history.hashtags,
        "hooks": history.hooks,
        "review": history.review,
        "visual_suggestion": history.visual_suggestion,
        "code_examples": [CodeExampleResponse.model_validate(ce) for ce in code_examples],
    }

    return PostHistoryDetail.model_validate(data)


@router.delete("/history/{history_id}")
async def delete_history(history_id: str, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    await db.delete(history)
    await db.commit()
    return {"message": "Deleted"}


@router.patch("/history/{history_id}/favorite", response_model=PostHistoryBase)
async def toggle_favorite(
    history_id: str,
    request: ToggleFavoriteRequest,
    db: AsyncSession = Depends(get_db),
):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    history.is_favorite = request.is_favorite
    await db.commit()
    await db.refresh(history)
    return PostHistoryBase.model_validate(history)


@router.patch("/history/{history_id}/tags", response_model=PostHistoryBase)
async def update_tags(
    history_id: str,
    request: UpdateTagsRequest,
    db: AsyncSession = Depends(get_db),
):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    history.tags = request.tags
    await db.commit()
    await db.refresh(history)
    return PostHistoryBase.model_validate(history)


def _parse_json_array(raw) -> List[dict]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    s = raw if isinstance(raw, str) else str(raw)
    fence = re.search(r'```(?:json)?\s*([\s\S]*?)```', s)
    if fence:
        s = fence.group(1)
    s = s.strip()
    try:
        parsed = json.loads(s)
        return parsed if isinstance(parsed, list) else []
    except Exception:
        pass
    m = re.search(r'\[[\s\S]*\]', s)
    if m:
        try:
            parsed = json.loads(m.group(0))
            return parsed if isinstance(parsed, list) else []
        except Exception:
            pass
    return []


@router.post("/topics/suggest", response_model=SuggestTopicsResponse)
async def suggest_topics(request: SuggestTopicsRequest, db: AsyncSession = Depends(get_db)):
    from app.services.llm_service import LLMService
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    llm = await LLMService.get_llm(db)
    prompt_data = get_prompt("topic_suggest")
    template = prompt_data.get("template", "")

    if not template:
        return SuggestTopicsResponse(topics=[])

    prompt = PromptTemplate(template=template, input_variables=["area", "country", "web_trends", "quantity"])
    chain = prompt | llm | StrOutputParser()

    raw = await chain.ainvoke({
        "area": request.context or "software development",
        "country": request.country or "Brazil",
        "web_trends": "",
        "quantity": request.quantity,
    })

    topics = _parse_json_array(raw)
    return SuggestTopicsResponse(topics=topics)


@router.post("/code/from-post", response_model=CodeFromPostResponse)
async def generate_code_from_post(request: CodeFromPostRequest):
    result = await code_generator.generate(request.post)
    return CodeFromPostResponse(**result)


@router.get("/code-presets", response_model=List[CodePresetResponse])
async def list_code_presets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CodeImagePreset).order_by(CodeImagePreset.created_at.desc())
    )
    presets = result.scalars().all()
    return [CodePresetResponse.model_validate(p) for p in presets]


@router.post("/code-presets", response_model=CodePresetResponse)
async def create_code_preset(
    request: CodePresetCreate,
    db: AsyncSession = Depends(get_db),
):
    preset = CodeImagePreset(
        id=str(uuid.uuid4()),
        **request.model_dump(),
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    return CodePresetResponse.model_validate(preset)


@router.delete("/code-presets/{preset_id}")
async def delete_code_preset(preset_id: str, db: AsyncSession = Depends(get_db)):
    preset = await db.get(CodeImagePreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    await db.delete(preset)
    await db.commit()
    return {"message": "Deleted"}