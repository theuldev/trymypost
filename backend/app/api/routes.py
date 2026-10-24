import asyncio

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Form, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from datetime import datetime, timezone
import json
import re
import uuid

from app.core.config import get_settings as get_app_settings
from app.db.session import get_db, AsyncSessionLocal
from app.models.post import PostHistory, PostStatus, EditorialStatus, GenerationTask
from app.models.code_example import CodeExample
from app.models.code_preset import CodeImagePreset
from app.models.app_settings import AppSettings
from app.models.post_edit import PostEdit
from app.models.post_usage import PostUsage
from app.models.suggested_topic import SuggestedTopic
from app.models.email_generation import EmailGeneration
from app.schemas.usage import (
    PostUsageRecord, PostUsageSummary, GlobalUsageSummary, GenerateImageResponse,
)
from app.services import rag_service
from app.services.image_service import ImageGenerationError, is_configured, build_image_prompt, generate_image
from app.schemas.rag import (
    RagStatusResponse, RagDocument, RagDocumentCreated,
    RagSearchRequest, RagSearchResult,
)
from app.schemas.post import (
    GeneratePostRequest, GeneratePostResponse, TaskStatusResponse,
    PostHistoryListResponse, PostHistoryDetail, PostHistoryBase,
    ToggleFavoriteRequest, UpdateTagsRequest, CodeFromPostRequest,
    CodeFromPostResponse, SuggestTopicsRequest, SuggestTopicsResponse,
    UpdateEditorialStatusRequest, CalendarItem,
    HealthResponse,
)
from app.schemas.code_example import CodeExampleResponse
from app.schemas.code_preset import CodePresetCreate, CodePresetResponse
from app.schemas.app_settings import AppSettingsUpdate, AppSettingsResponse
from app.schemas.post_edit import PostEditCreate, PostEditResponse
from app.schemas.email_generation import (
    UserProfileUpdate, UserProfileResponse,
    GenerateEmailRequest, GenerateEmailResponse,
    EmailGenerationResult, EmailGenerationHistoryItem,
    EmailGenerationHistoryResponse, EmailBodyUpdate,
    AuditLogResponse, AuditLogListResponse, AuditSummaryResponse,
)
from app.schemas.job_analysis import (
    AnalyzeJobRequest, AnalyzeJobResponse,
    JobAnalysisHistoryItem, JobAnalysisHistoryResponse,
    JobAnalysisDetail,
)
from app.models.job_analysis import JobAnalysis
from app.repositories.app_settings_repository import AppSettingsRepository
from app.repositories.user_profile_repository import UserProfileRepository
from app.repositories.email_generation_repository import EmailGenerationRepository
from app.repositories.job_analysis_repository import JobAnalysisRepository
from app.services.pipeline_service import (
    start_generation_task, start_email_generation_task, start_job_analysis_task,
)
from app.services.task_events import (
    CHANNEL as TASK_EVENTS_CHANNEL,
    TERMINAL_STATUSES,
    build_task_payload,
    notify_task_event,
)
from app.ai.generators.code_generator import CodeGenerator
from app.services.prompts_service import get_prompt
from app.services.audit_service import AuditService

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
    payload = request.model_dump(mode="json", exclude_none=True)
    if payload.get("input_mode") == "description":
        if not (payload.get("description") or "").strip():
            raise HTTPException(
                status_code=422,
                detail="description é obrigatória no modo 'description'",
            )
    elif not payload.get("topic"):
        raise HTTPException(status_code=422, detail="topic é obrigatório")
    task_id = await start_generation_task(db, payload)
    return GeneratePostResponse(task_id=task_id, status="pending")


def _task_event_payload(task: GenerationTask) -> dict:
    return build_task_payload(
        task.id,
        task.status,
        current_step=task.current_step,
        progress=task.progress,
        error=task.error,
    )


@router.get("/posts/generate/{task_id}", response_model=TaskStatusResponse)
async def get_generation_status(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == PostStatus.FAILED:
        raise HTTPException(
            status_code=500, detail=task.error or "Generation failed"
        )
    if task.status == PostStatus.CANCELLED:
        raise HTTPException(status_code=409, detail="Task was cancelled")
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status.value,
        current_step=task.current_step,
        progress=task.progress,
        result=task.result,
        error=task.error,
    )


@router.get("/posts/generate/{task_id}/events")
async def generation_events(task_id: str, request: Request):
    """Stream SSE com o progresso da geração (sem polling no cliente).

    Usa PostgreSQL LISTEN/NOTIFY: o worker publica cada mudança de estado da
    task e este endpoint repassa os eventos ao cliente. Também envia
    heartbeats e releituras de segurança periódicas."""
    async with AsyncSessionLocal() as db:
        task = await db.get(GenerationTask, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        initial = _task_event_payload(task)

    def sse(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    async def stream():
        last = initial
        yield sse(last)
        if last["status"] in TERMINAL_STATUSES:
            return

        dsn = get_app_settings().database_url.replace(
            "postgresql+asyncpg://", "postgresql://"
        )
        queue: asyncio.Queue = asyncio.Queue()

        def on_notify(connection, pid, channel, payload):
            try:
                data = json.loads(payload)
            except (TypeError, ValueError):
                return
            if data.get("task_id") == task_id:
                queue.put_nowait(data)

        conn = await asyncpg.connect(dsn)
        try:
            await conn.add_listener(TASK_EVENTS_CHANNEL, on_notify)

            # Releitura: cobre o gap entre o estado inicial e o LISTEN.
            async with AsyncSessionLocal() as db:
                task_now = await db.get(GenerationTask, task_id)
                if task_now:
                    current = _task_event_payload(task_now)
                    if current != last:
                        yield sse(current)
                        last = current
                    if last["status"] in TERMINAL_STATUSES:
                        return

            while True:
                if await request.is_disconnected():
                    return
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    # Heartbeat mantém proxies/conexão vivos + releitura de
                    # segurança caso algum NOTIFY tenha se perdido.
                    yield ": ping\n\n"
                    async with AsyncSessionLocal() as db:
                        task_now = await db.get(GenerationTask, task_id)
                        if task_now:
                            current = _task_event_payload(task_now)
                            if current != last:
                                yield sse(current)
                                last = current
                            if last["status"] in TERMINAL_STATUSES:
                                return
                    continue
                yield sse(data)
                last = data
                if data.get("status") in TERMINAL_STATUSES:
                    return
        finally:
            try:
                await conn.remove_listener(TASK_EVENTS_CHANNEL, on_notify)
                await conn.close()
            except Exception:
                pass

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/posts/generate/{task_id}/cancel")
async def cancel_generation(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status in [PostStatus.COMPLETED, PostStatus.FAILED, PostStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Task already finished")
    task.status = PostStatus.CANCELLED
    await notify_task_event(db, _task_event_payload(task))
    await db.commit()
    return {"message": "Generation cancelled"}


@router.get("/history", response_model=PostHistoryListResponse)
async def list_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    status: Optional[str] = None,
    editorial_status: Optional[str] = None,
    favorito: Optional[bool] = None,
    has_code: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    db: AsyncSession = Depends(get_db),
):
    sort_column = (
        PostHistory.updated_at if sort_by == "updated_at" else PostHistory.created_at
    )
    if sort_order == "asc":
        query = select(PostHistory).order_by(sort_column.asc())
    else:
        query = select(PostHistory).order_by(sort_column.desc())

    if search:
        query = query.where(PostHistory.topic.ilike(f"%{search}%"))
    if status:
        try:
            query = query.where(PostHistory.status == PostStatus(status))
        except ValueError:
            pass
    if editorial_status:
        try:
            query = query.where(
                PostHistory.editorial_status == EditorialStatus(editorial_status)
            )
        except ValueError:
            pass
    if favorito is not None:
        query = query.where(PostHistory.is_favorite == favorito)
    if has_code is not None:
        code_exists = select(CodeExample.id).where(
            CodeExample.post_id == PostHistory.id
        ).exists()
        query = query.where(code_exists if has_code else ~code_exists)
    if start_date:
        try:
            query = query.where(
                PostHistory.created_at >= datetime.fromisoformat(start_date)
            )
        except ValueError:
            pass
    if end_date:
        try:
            # Inclui o dia final inteiro
            end = datetime.fromisoformat(end_date)
            end = end.replace(hour=23, minute=59, second=59)
            query = query.where(PostHistory.created_at <= end)
        except ValueError:
            pass

    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query)
    
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    # Anexa custo/totais de uso estimado por post (dashboard de custo)
    if items:
        usage_rows = await db.execute(
            select(
                PostUsage.post_id,
                func.sum(PostUsage.cost_usd),
                func.sum(PostUsage.total_tokens),
            )
            .where(PostUsage.post_id.in_([i.id for i in items]))
            .group_by(PostUsage.post_id)
        )
        usage_map = {row[0]: (float(row[1] or 0), int(row[2] or 0)) for row in usage_rows.all()}
        for item in items:
            cost, tokens = usage_map.get(item.id, (None, None))
            item.total_cost_usd = cost
            item.total_tokens = tokens

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
        "editorial_status": history.editorial_status.value if hasattr(history.editorial_status, 'value') else history.editorial_status,
        "scheduled_at": history.scheduled_at,
        "published_at": history.published_at,
        "generated_image_url": history.generated_image_url,
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


@router.patch("/history/{history_id}/editorial", response_model=PostHistoryBase)
async def update_editorial_status(
    history_id: str,
    request: UpdateEditorialStatusRequest,
    db: AsyncSession = Depends(get_db),
):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    new_status = EditorialStatus(request.editorial_status.value)

    if new_status == EditorialStatus.SCHEDULED:
        scheduled_at = request.scheduled_at or history.scheduled_at
        if not scheduled_at:
            raise HTTPException(
                status_code=400,
                detail="scheduled_at é obrigatório para agendar um post",
            )
        history.scheduled_at = scheduled_at
        history.published_at = None
    elif new_status == EditorialStatus.PUBLISHED:
        history.published_at = request.published_at or datetime.now(timezone.utc)
    else:
        # draft / approved: limpa agendamento e publicação
        history.scheduled_at = None
        history.published_at = None

    history.editorial_status = new_status
    await db.commit()
    await db.refresh(history)
    return PostHistoryBase.model_validate(history)


@router.get("/calendar", response_model=List[CalendarItem])
async def get_calendar(
    limit: int = Query(500, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PostHistory)
        .where(PostHistory.status == PostStatus.COMPLETED)
        .order_by(PostHistory.created_at.desc())
        .limit(limit)
    )
    items = result.scalars().all()
    return [CalendarItem.model_validate(item) for item in items]


# --- Usage / Cost tracking ---

@router.get("/history/{history_id}/usage", response_model=PostUsageSummary)
async def get_post_usage(history_id: str, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    result = await db.execute(
        select(PostUsage)
        .where(PostUsage.post_id == history_id)
        .order_by(PostUsage.created_at.asc())
    )
    records = result.scalars().all()
    return PostUsageSummary(
        records=[PostUsageRecord.model_validate(r) for r in records],
        total_input_tokens=sum(r.input_tokens for r in records),
        total_output_tokens=sum(r.output_tokens for r in records),
        total_tokens=sum(r.total_tokens for r in records),
        total_cost_usd=sum(r.cost_usd for r in records),
    )


@router.get("/usage/summary", response_model=GlobalUsageSummary)
async def get_usage_summary(db: AsyncSession = Depends(get_db)):
    total_cost = await db.scalar(select(func.coalesce(func.sum(PostUsage.cost_usd), 0.0)))
    total_tokens = await db.scalar(select(func.coalesce(func.sum(PostUsage.total_tokens), 0)))
    posts_count = await db.scalar(
        select(func.count(func.distinct(PostUsage.post_id)))
        .where(PostUsage.post_id.isnot(None))
    )

    by_model_rows = await db.execute(
        select(
            PostUsage.provider,
            PostUsage.model_name,
            func.sum(PostUsage.total_tokens),
            func.sum(PostUsage.cost_usd),
        ).group_by(PostUsage.provider, PostUsage.model_name)
    )
    by_step_rows = await db.execute(
        select(PostUsage.step, func.sum(PostUsage.cost_usd))
        .group_by(PostUsage.step)
    )

    posts_count = posts_count or 0
    total_cost = float(total_cost or 0)

    return GlobalUsageSummary(
        total_cost_usd=total_cost,
        total_tokens=int(total_tokens or 0),
        posts_with_usage=posts_count,
        avg_cost_per_post=(total_cost / posts_count) if posts_count else 0.0,
        by_model=[
            {
                "provider": row[0],
                "model_name": row[1],
                "total_tokens": int(row[2] or 0),
                "cost_usd": float(row[3] or 0),
            }
            for row in by_model_rows.all()
        ],
        by_step=[
            {"step": row[0], "cost_usd": float(row[1] or 0)}
            for row in by_step_rows.all()
        ],
    )


@router.post("/history/{history_id}/image", response_model=GenerateImageResponse)
async def generate_post_image(history_id: str, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")

    settings = await AppSettingsRepository.get(db)
    if not settings or not is_configured(settings):
        raise HTTPException(
            status_code=400,
            detail="Geração de imagem não configurada. Defina provedor/modelo/chave nas Configurações.",
        )

    prompt = build_image_prompt(history.visual_suggestion, history.topic)
    try:
        image_url, cost = await generate_image(settings, prompt)
    except ImageGenerationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(status_code=502, detail="Falha ao gerar imagem no provedor")

    history.generated_image_url = image_url
    db.add(PostUsage(
        id=str(uuid.uuid4()),
        post_id=history.id,
        step="image_generation",
        provider=settings.image_provider,
        model_name=settings.image_model or "default",
        input_tokens=0,
        output_tokens=0,
        total_tokens=0,
        cost_usd=cost,
    ))
    await db.commit()

    return GenerateImageResponse(image_url=image_url, cost_usd=cost)


def _extract_file_text(filename: str, raw: bytes) -> str:
    """Extrai texto de arquivos .txt/.md (UTF-8), .pdf e .docx."""
    ext = (filename.rsplit(".", 1)[-1] if "." in filename else "").lower()

    if ext in ("txt", "md", "markdown"):
        try:
            return raw.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="Arquivo de texto deve ser UTF-8")

    if ext == "pdf":
        import io
        from pypdf import PdfReader

        try:
            reader = PdfReader(io.BytesIO(raw))
            return "\n\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            raise HTTPException(status_code=400, detail="Não foi possível ler o PDF")

    if ext == "docx":
        import io
        from docx import Document

        try:
            doc = Document(io.BytesIO(raw))
            return "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception:
            raise HTTPException(status_code=400, detail="Não foi possível ler o DOCX")

    raise HTTPException(
        status_code=400,
        detail="Formato não suportado. Use .txt, .md, .pdf ou .docx",
    )


# --- RAG / Knowledge Base ---

@router.get("/rag/status", response_model=RagStatusResponse)
async def rag_status(db: AsyncSession = Depends(get_db)):
    settings = await AppSettingsRepository.get(db)
    await rag_service.ensure_vector_store(settings)
    return RagStatusResponse(**rag_service.store_status())


@router.get("/rag/documents", response_model=List[RagDocument])
async def rag_list_documents():
    documents = await rag_service.list_documents()
    return [
        RagDocument.model_validate({**doc, "created_at": doc["created_at"]})
        for doc in documents
    ]


@router.post("/rag/documents", response_model=RagDocumentCreated)
async def rag_add_document(
    title: str = Form(""),
    content: str = Form(""),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    if file is not None:
        raw = await file.read()
        content = _extract_file_text(file.filename or "", raw)
        if not title and file.filename:
            title = file.filename

    if not title.strip():
        raise HTTPException(status_code=422, detail="Título é obrigatório")
    if len(content.strip()) < 20:
        raise HTTPException(status_code=422, detail="Conteúdo muito curto")

    settings = await AppSettingsRepository.get(db)
    try:
        result = await rag_service.add_document(title, content, settings)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    return RagDocumentCreated(**result)


@router.delete("/rag/documents/{document_id}")
async def rag_delete_document(document_id: str):
    deleted = await rag_service.delete_document(document_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    return {"message": "Deleted"}


@router.post("/rag/search", response_model=List[RagSearchResult])
async def rag_search(request: RagSearchRequest, db: AsyncSession = Depends(get_db)):
    settings = await AppSettingsRepository.get(db)
    matches = await rag_service.search(request.query, app_settings=settings, k=min(request.k, 10))
    return [RagSearchResult(**m) for m in matches]


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


TOPIC_EXCLUSION_LIMIT = 40


@router.post("/topics/suggest", response_model=SuggestTopicsResponse)
async def suggest_topics(request: SuggestTopicsRequest, db: AsyncSession = Depends(get_db)):
    from app.services.llm_service import LLMService
    from app.services.search_service import run_with_web_search
    from langchain_core.prompts import PromptTemplate

    settings = await LLMService.get_settings(db)
    llm = LLMService.create_llm(settings)

    prompt_data = get_prompt("topic_suggest")
    template = prompt_data.get("template", "")

    if not template:
        return SuggestTopicsResponse(topics=[])

    input_variables = prompt_data.get("input_variables") or ["area", "country", "quantity"]
    prompt = PromptTemplate(template=template, input_variables=input_variables)

    context = (request.context or "software development").strip()
    country = (request.country or "Brazil").strip()

    previous = (await db.execute(
        select(SuggestedTopic)
        .where(
            SuggestedTopic.context == context,
            SuggestedTopic.country == country,
        )
        .order_by(SuggestedTopic.created_at.desc())
        .limit(TOPIC_EXCLUSION_LIMIT)
    )).scalars().all()

    if previous:
        exclude_topics = "\n".join(f"- {row.topic}" for row in previous)
    else:
        exclude_topics = "(none yet — no restrictions)"

    raw = await run_with_web_search(
        llm,
        prompt.format(
            area=context,
            country=country,
            quantity=request.quantity,
            exclude_topics=exclude_topics,
        ),
        api_key=settings.tavily_api_key,
    )

    topics = _parse_json_array(raw)

    if topics:
        db.add_all([
            SuggestedTopic(
                topic=str(t.get("topic", ""))[:500],
                justification=str(t.get("justification", "")),
                context=context,
                country=country,
            )
            for t in topics
            if t.get("topic")
        ])
        await db.commit()

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


# --- Settings ---

@router.get("/settings", response_model=AppSettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    settings = await AppSettingsRepository.get(db)
    if not settings:
        settings = AppSettings(id=str(uuid.uuid4()))
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return AppSettingsResponse.model_validate(settings)


@router.put("/settings", response_model=AppSettingsResponse)
async def update_settings(
    request: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db),
):
    settings = await AppSettingsRepository.get(db)
    if not settings:
        settings = AppSettings(id=str(uuid.uuid4()))
        db.add(settings)
    for field, value in request.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return AppSettingsResponse.model_validate(settings)


# --- Post Edits ---

@router.get("/history/{history_id}/edits", response_model=List[PostEditResponse])
async def list_post_edits(history_id: str, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    result = await db.execute(
        select(PostEdit)
        .where(PostEdit.post_id == history_id)
        .order_by(PostEdit.created_at.desc())
    )
    edits = result.scalars().all()
    return [PostEditResponse.model_validate(e) for e in edits]


@router.post("/history/{history_id}/edits", response_model=PostEditResponse)
async def create_post_edit(
    history_id: str,
    request: PostEditCreate,
    db: AsyncSession = Depends(get_db),
):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    edit = PostEdit(
        id=str(uuid.uuid4()),
        post_id=history_id,
        **request.model_dump(),
    )
    db.add(edit)
    await db.commit()
    await db.refresh(edit)
    return PostEditResponse.model_validate(edit)


# --- User Profile ---

@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(db: AsyncSession = Depends(get_db)):
    settings = await AppSettingsRepository.get(db)
    if not settings:
        settings = AppSettings(id=str(uuid.uuid4()))
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    profile = await UserProfileRepository.get_or_create(db, settings.id)
    return UserProfileResponse.model_validate(profile)


@router.put("/profile", response_model=UserProfileResponse)
async def update_user_profile(
    request: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    settings = await AppSettingsRepository.get(db)
    if not settings:
        settings = AppSettings(id=str(uuid.uuid4()))
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    profile = await UserProfileRepository.get_or_create(db, settings.id)
    updated_profile = await UserProfileRepository.update(db, profile, request)
    return UserProfileResponse.model_validate(updated_profile)


# --- Email Generation ---

@router.post("/emails/generate", response_model=GenerateEmailResponse)
async def generate_email(
    request: GenerateEmailRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    if not request.job_description.strip():
        raise HTTPException(status_code=422, detail="Job description is required")
    
    task_id = await start_email_generation_task(db, {"job_description": request.job_description})
    return GenerateEmailResponse(task_id=task_id, status="pending")


@router.get("/emails/generate/{task_id}", response_model=TaskStatusResponse)
async def get_email_generation_status(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status == PostStatus.FAILED:
        raise HTTPException(
            status_code=500, detail=task.error or "Generation failed"
        )
    if task.status == PostStatus.CANCELLED:
        raise HTTPException(status_code=409, detail="Task was cancelled")
    return TaskStatusResponse(
        task_id=task.id,
        status=task.status.value,
        current_step=task.current_step,
        progress=task.progress,
        result=task.result,
        error=task.error,
    )


@router.get("/emails/generate/{task_id}/events")
async def email_generation_events(task_id: str, request: Request):
    """Stream SSE com o progresso da geração de e-mail."""
    async with AsyncSessionLocal() as db:
        task = await db.get(GenerationTask, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        initial = _task_event_payload(task)

    def sse(data: dict) -> str:
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

    async def stream():
        last = initial
        yield sse(last)
        if last["status"] in TERMINAL_STATUSES:
            return

        dsn = get_app_settings().database_url.replace(
            "postgresql+asyncpg://", "postgresql://"
        )
        queue: asyncio.Queue = asyncio.Queue()

        def on_notify(connection, pid, channel, payload):
            try:
                data = json.loads(payload)
            except (TypeError, ValueError):
                return
            if data.get("task_id") == task_id:
                queue.put_nowait(data)

        conn = await asyncpg.connect(dsn)
        try:
            await conn.add_listener(TASK_EVENTS_CHANNEL, on_notify)

            # Releitura: cobre o gap entre o estado inicial e o LISTEN.
            async with AsyncSessionLocal() as db:
                task_now = await db.get(GenerationTask, task_id)
                if task_now:
                    current = _task_event_payload(task_now)
                    if current != last:
                        yield sse(current)
                        last = current
                    if last["status"] in TERMINAL_STATUSES:
                        return

            while True:
                if await request.is_disconnected():
                    return
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    async with AsyncSessionLocal() as db:
                        task_now = await db.get(GenerationTask, task_id)
                        if task_now:
                            current = _task_event_payload(task_now)
                            if current != last:
                                yield sse(current)
                                last = current
                            if last["status"] in TERMINAL_STATUSES:
                                return
                    continue
                yield sse(data)
                last = data
                if data.get("status") in TERMINAL_STATUSES:
                    return
        finally:
            try:
                await conn.remove_listener(TASK_EVENTS_CHANNEL, on_notify)
                await conn.close()
            except Exception:
                pass

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/emails/generate/{task_id}/cancel")
async def cancel_email_generation(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(GenerationTask, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status in [PostStatus.COMPLETED, PostStatus.FAILED, PostStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Task already finished")
    task.status = PostStatus.CANCELLED
    await notify_task_event(db, _task_event_payload(task))
    await db.commit()
    return {"message": "Generation cancelled"}


@router.get("/emails/history", response_model=EmailGenerationHistoryResponse)
async def list_email_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    items, total = await EmailGenerationRepository.list_history(db, page, page_size, search)
    return EmailGenerationHistoryResponse(
        items=[EmailGenerationHistoryItem.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/emails/history/{email_id}", response_model=EmailGenerationResult)
async def get_email_detail(email_id: str, db: AsyncSession = Depends(get_db)):
    email_gen = await db.get(EmailGeneration, email_id)
    if not email_gen:
        raise HTTPException(status_code=404, detail="Email generation not found")
    
    extracted_info = {
        "job_title": email_gen.job_title,
        "company_name": email_gen.company_name,
        "recruiter_name": email_gen.recruiter_name,
        "recruiter_email": email_gen.recruiter_email,
        "key_requirements": email_gen.key_requirements or [],
        "technologies": email_gen.technologies or [],
        "experience_desired": email_gen.experience_desired or [],
        "location_modality": email_gen.location_modality,
        "salary_info": email_gen.salary_info,
        "salary_expectation_required": email_gen.salary_expectation_required,
    }
    
    return EmailGenerationResult(
        recipient_email=email_gen.recipient_email,
        subject=email_gen.subject,
        body=email_gen.body,
        extracted_info=extracted_info,
        email_id=email_gen.id,
    )


@router.patch("/emails/history/{email_id}", response_model=EmailGenerationResult)
async def update_email_body(
    email_id: str,
    request: EmailBodyUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Atualiza o corpo do e-mail gerado (edição pelo usuário)."""
    email_gen = await db.get(EmailGeneration, email_id)
    if not email_gen:
        raise HTTPException(status_code=404, detail="Email generation not found")
    email_gen.body = request.body.strip()
    await db.commit()
    await db.refresh(email_gen)

    extracted_info = {
        "job_title": email_gen.job_title,
        "company_name": email_gen.company_name,
        "recruiter_name": email_gen.recruiter_name,
        "recruiter_email": email_gen.recruiter_email,
        "key_requirements": email_gen.key_requirements or [],
        "technologies": email_gen.technologies or [],
        "experience_desired": email_gen.experience_desired or [],
        "location_modality": email_gen.location_modality,
        "salary_info": email_gen.salary_info,
        "salary_expectation_required": email_gen.salary_expectation_required,
    }

    return EmailGenerationResult(
        recipient_email=email_gen.recipient_email,
        subject=email_gen.subject,
        body=email_gen.body,
        extracted_info=extracted_info,
        email_id=email_gen.id,
    )


@router.delete("/emails/history/{email_id}")
async def delete_email_history(email_id: str, db: AsyncSession = Depends(get_db)):
    email_gen = await db.get(EmailGeneration, email_id)
    if not email_gen:
        raise HTTPException(status_code=404, detail="Email generation not found")
    await db.delete(email_gen)
    await db.commit()
    return {"message": "Deleted"}


# --- Audit Logs ---

from app.schemas.email_generation import (
    AuditLogResponse, AuditLogListResponse, AuditSummaryResponse,
)
from app.services.audit_service import AuditService


@router.get("/audit/logs", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = None,
    event_category: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    correlation_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    items, total = await AuditService.get_audit_logs(
        db=db,
        page=page,
        page_size=page_size,
        event_type=event_type,
        event_category=event_category,
        resource_type=resource_type,
        resource_id=resource_id,
        status=status,
        start_date=start_date,
        end_date=end_date,
        correlation_id=correlation_id,
    )
    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/audit/logs/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(log_id: str, db: AsyncSession = Depends(get_db)):
    log = await AuditService.get_audit_log_by_id(db, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return AuditLogResponse.model_validate(log)


@router.get("/audit/summary", response_model=AuditSummaryResponse)
async def get_audit_summary(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
):
    summary = await AuditService.get_audit_summary(db, start_date, end_date)
    return AuditSummaryResponse(**summary)