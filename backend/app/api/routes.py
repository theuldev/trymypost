from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.models.post import PostHistory, PostStatus, GenerationTask
from app.schemas.post import (
    GeneratePostRequest, GeneratePostResponse, TaskStatusResponse,
    PostHistoryListResponse, PostHistoryDetail, PostHistoryBase,
    ToggleFavoriteRequest, UpdateTagsRequest, CodeFromPostRequest,
    CodeFromPostResponse, SuggestTopicsRequest, SuggestTopicsResponse,
    HealthResponse,
)
from app.services.pipeline import start_generation_task
from app.services.code_gen import CodeGenerator
from app.services.prompts import get_prompt

router = APIRouter()
code_generator = CodeGenerator()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")


@router.post("/posts/generate", response_model=GeneratePostResponse)
async def generate_post(
    request: GeneratePostRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    task_id = await start_generation_task(db, request.model_dump())
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
        query = query.where(PostHistory.tema.ilike(f"%{search}%"))
    if status:
        query = query.where(PostHistory.status == status)
    if favorito is not None:
        query = query.where(PostHistory.favorito == favorito)
    
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
async def get_history_detail(history_id: int, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    
    # Convert ORM to dict and parse review string if needed
    data = {
        "id": history.id,
        "tema": history.tema,
        "estilo": history.estilo,
        "publico": history.publico,
        "experiencia": history.experiencia,
        "objetivo": history.objetivo,
        "formato": history.formato,
        "incluir_codigo": history.incluir_codigo,
        "incluir_visual": history.incluir_visual,
        "status": history.status.value if hasattr(history.status, 'value') else history.status,
        "favorito": history.favorito,
        "tags": history.tags or [],
        "created_at": history.created_at,
        "updated_at": history.updated_at,
        "completed_at": history.completed_at,
        "error_message": history.error_message,
        "posts_data": history.posts_data,
        "topicos_pesquisados": history.topicos_pesquisados,
        "hashtags": history.hashtags,
        "hooks": history.hooks,
        "review": history.review,
        "visual_sugestao": history.visual_sugestao,
    }
    
    # Parse review string to dict if needed
    if isinstance(data.get("review"), str):
        import re
        v = data["review"]
        result = {
            "score": 0,
            "pontos_fortes": [],
            "pontos_melhoria": [],
            "sugestoes": []
        }
        # Extract SCORE FINAL
        score_match = re.search(r'SCORE FINAL:\s*([\d.]+)/10', v)
        if score_match:
            result["score"] = float(score_match.group(1))
        
        # Extract PROBLEMAS -> pontos_melhoria
        problemas_match = re.search(r'PROBLEMAS:?\s*\n(.*?)(?:\n\s*(?:RESULTADO|POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
        if problemas_match:
            points = problemas_match.group(1).strip()
            for line in points.split('\n'):
                line = line.strip()
                # Remove markdown formatting and bullet points
                line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
                line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)  # Remove **bold**
                if line:
                    result["pontos_melhoria"].append(line.strip())
        
        # Extract RESULTADO for pontos_fortes and sugestoes
        resultado_match = re.search(r'RESULTADO:?\s*\n(.*?)(?:\n\s*(?:POST REESCRITO|POST APROVADO)|$)', v, re.IGNORECASE | re.DOTALL)
        if resultado_match:
            result_text = resultado_match.group(1).strip()
            # Split by sentences or bullet points
            for line in result_text.split('\n'):
                line = line.strip()
                # Remove markdown formatting
                line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)
                line = re.sub(r'^\s*[\*\-\•]\s*', '', line)
                if line:
                    # Check if it's a suggestion (contains suggestion keywords)
                    if any(kw in line.lower() for kw in ['suger', 'ajust', 'melhor', 'recomend', 'poderia', 'deveria']):
                        result["sugestoes"].append(line.strip())
                    else:
                        result["pontos_fortes"].append(line.strip())
        
        data["review"] = result
    
    return PostHistoryDetail.model_validate(data)


@router.delete("/history/{history_id}")
async def delete_history(history_id: int, db: AsyncSession = Depends(get_db)):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    await db.delete(history)
    await db.commit()
    return {"message": "Deleted"}


@router.patch("/history/{history_id}/favorite", response_model=PostHistoryBase)
async def toggle_favorite(
    history_id: int,
    request: ToggleFavoriteRequest,
    db: AsyncSession = Depends(get_db),
):
    history = await db.get(PostHistory, history_id)
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    history.favorito = request.favorito
    await db.commit()
    await db.refresh(history)
    return PostHistoryBase.model_validate(history)


@router.patch("/history/{history_id}/tags", response_model=PostHistoryBase)
async def update_tags(
    history_id: int,
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


@router.post("/topics/suggest", response_model=SuggestTopicsResponse)
async def suggest_topics(request: SuggestTopicsRequest, db: AsyncSession = Depends(get_db)):
    from app.services.pipeline import AIPipeline
    
    pipeline = AIPipeline(db)
    prompt_data = get_prompt("topic_suggest")
    template = prompt_data.get("template", "")
    
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    from langchain_google_genai import ChatGoogleGenerativeAI
    from app.core.config import get_settings
    
    settings = get_settings()
    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        temperature=0.7,
        google_api_key=settings.google_api_key,
    )
    prompt = PromptTemplate(template=template, input_variables=["area", "web_trends"])
    chain = prompt | llm | JsonOutputParser()
    
    result = await chain.ainvoke({
        "area": request.contexto or "desenvolvimento de software",
        "web_trends": "",
    })
    
    return SuggestTopicsResponse(topics=result.get("topics", []))


@router.post("/code/from-post", response_model=CodeFromPostResponse)
async def generate_code_from_post(request: CodeFromPostRequest):
    result = await code_generator.generate(request.post)
    return CodeFromPostResponse(**result)