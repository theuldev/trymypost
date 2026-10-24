"""RAG: base de conhecimento vetorial (pgvector) para enriquecer a geração.

Documentos são cadastrados na página Armazenamento, quebrados em chunks,
embutidos com o modelo de embedding do Google (configurável via
GOOGLE_EMBEDDING_MODEL no .env) e buscados por similaridade durante a
geração de posts quando o usuário ativa "usar base de conhecimento".

O vector store roda em um Postgres/pgvector separado (VECTOR_DATABASE_URL)
para não impactar o SQLite principal. Se o serviço estiver fora do ar, a API
continua funcionando — as chamadas de RAG simplesmente retornam indisponível.
"""
import asyncio
import logging
import re
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.core.config import get_settings
from app.models.app_settings import AppSettings

logger = logging.getLogger(__name__)

DEFAULT_VECTOR_DIM = 768  # fallback se o probe do modelo falhar
CHUNK_SIZE = 1200
CHUNK_OVERLAP = 200

_engine: Optional[AsyncEngine] = None
_ready = False
_init_lock = asyncio.Lock()
_init_error: Optional[str] = None
_vector_dim = DEFAULT_VECTOR_DIM


def _get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = create_async_engine(
            get_settings().vector_database_url,
            pool_pre_ping=True,
        )
    return _engine


def _resolve_embedding_api_key(app_settings: Optional[AppSettings] = None) -> str:
    """Chave do Google para embeddings: settings do app (se provider GOOGLE) > .env."""
    if (
        app_settings
        and (app_settings.provider or "").upper() == "GOOGLE"
        and app_settings.api_key
    ):
        return app_settings.api_key
    return get_settings().google_api_key


def _create_embeddings(app_settings: Optional[AppSettings] = None):
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    settings = get_settings()
    return GoogleGenerativeAIEmbeddings(
        model=settings.google_embedding_model,
        google_api_key=_resolve_embedding_api_key(app_settings),
    )


def _chunk_text(
    content: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[str]:
    """Quebra o texto em chunks alinhados a parágrafos com overlap configurável."""
    chunk_size = max(200, int(chunk_size or CHUNK_SIZE))
    chunk_overlap = max(0, min(int(chunk_overlap or CHUNK_OVERLAP), chunk_size // 2))
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", content) if p.strip()]
    chunks: List[str] = []
    current = ""
    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 2 > chunk_size and current:
            chunks.append(current)
            current = current[-chunk_overlap:] + "\n\n" + paragraph
        else:
            current = paragraph if not current else current + "\n\n" + paragraph
    if current:
        chunks.append(current)
    # chunks únicos muito grandes (ex.: sem parágrafos) seguem corte rígido
    final: List[str] = []
    for chunk in chunks:
        while len(chunk) > chunk_size * 2:
            final.append(chunk[: chunk_size * 2])
            chunk = chunk[chunk_size * 2 - chunk_overlap:]
        final.append(chunk)
    return [c for c in final if c.strip()]


async def _embed_probe_vector_dim(embeddings) -> int:
    vector = await embeddings.aembed_query("dimension probe")
    return len(vector)


async def ensure_vector_store(app_settings: Optional[AppSettings] = None) -> bool:
    """Cria extensão/tabelas no pgvector na primeira utilização. Idempotente."""
    global _ready, _init_error, _vector_dim
    if _ready:
        return True

    async with _init_lock:
        if _ready:
            return True
        try:
            engine = _get_engine()
            async with engine.begin() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))

            # Descobre a dimensão real do modelo de embedding configurado
            embeddings = _create_embeddings(app_settings)
            _vector_dim = await _embed_probe_vector_dim(embeddings)

            async with engine.begin() as conn:
                await conn.execute(text(
                    """
                    CREATE TABLE IF NOT EXISTS rag_documents (
                        id TEXT PRIMARY KEY,
                        title VARCHAR(300) NOT NULL,
                        content TEXT NOT NULL,
                        chunk_count INTEGER NOT NULL DEFAULT 0,
                        embedding_model VARCHAR(100) NOT NULL,
                        vector_dim INTEGER NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                    """
                ))
                await conn.execute(text(
                    f"""
                    CREATE TABLE IF NOT EXISTS rag_chunks (
                        id TEXT PRIMARY KEY,
                        document_id TEXT NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
                        chunk_index INTEGER NOT NULL,
                        content TEXT NOT NULL,
                        embedding vector({_vector_dim}),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                    )
                    """
                ))
                await conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_rag_chunks_document ON rag_chunks(document_id)"
                ))
            _ready = True
            _init_error = None
        except Exception as exc:  # pgvector fora do ar, chave inválida, etc.
            _init_error = str(exc)
            logger.warning(f"Vector store indisponível: {_init_error}")
            return False
    return True


def store_status() -> Dict[str, Any]:
    settings = get_settings()
    return {
        "available": _ready,
        "error": None if _ready else _init_error,
        "database_url": settings.vector_database_url.split("@")[-1]
        if "@" in settings.vector_database_url
        else settings.vector_database_url,
        "embedding_model": settings.google_embedding_model,
        "vector_dim": _vector_dim,
    }


async def add_document(
    title: str,
    content: str,
    app_settings: Optional[AppSettings] = None,
) -> Dict[str, Any]:
    if not await ensure_vector_store(app_settings):
        raise RuntimeError(f"Vector store indisponível: {_init_error}")

    content = content.strip()
    if len(content) < 20:
        raise ValueError("O conteúdo do documento é muito curto.")

    chunks = _chunk_text(
        content,
        chunk_size=getattr(app_settings, "rag_chunk_size", None) or CHUNK_SIZE,
        chunk_overlap=getattr(app_settings, "rag_chunk_overlap", None) or CHUNK_OVERLAP,
    )
    embeddings = _create_embeddings(app_settings)
    vectors = await embeddings.aembed_documents(chunks)

    settings = get_settings()
    doc_id = str(uuid.uuid4())

    async with _get_engine().begin() as conn:
        await conn.execute(
            text(
                "INSERT INTO rag_documents (id, title, content, chunk_count, embedding_model, vector_dim) "
                "VALUES (:id, :title, :content, :chunk_count, :model, :dim)"
            ),
            {
                "id": doc_id,
                "title": title.strip()[:300],
                "content": content,
                "chunk_count": len(chunks),
                "model": settings.google_embedding_model,
                "dim": _vector_dim,
            },
        )
        for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
            await conn.execute(
                text(
                    "INSERT INTO rag_chunks (id, document_id, chunk_index, content, embedding) "
                    "VALUES (:id, :document_id, :chunk_index, :content, CAST(:embedding AS vector))"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "document_id": doc_id,
                    "chunk_index": index,
                    "content": chunk,
                    "embedding": "[" + ",".join(f"{v:.8f}" for v in vector) + "]",
                },
            )

    logger.info(f"Documento RAG '{title}' indexado com {len(chunks)} chunks (dim {_vector_dim})")
    return {"id": doc_id, "title": title, "chunk_count": len(chunks)}


async def list_documents() -> List[Dict[str, Any]]:
    await ensure_vector_store()
    if not _ready:
        return []
    async with _get_engine().begin() as conn:
        result = await conn.execute(text(
            "SELECT id, title, chunk_count, embedding_model, created_at, "
            "LEFT(content, 300) AS preview FROM rag_documents ORDER BY created_at DESC"
        ))
        return [dict(row._mapping) for row in result.fetchall()]


async def delete_document(document_id: str) -> bool:
    await ensure_vector_store()
    if not _ready:
        return False
    async with _get_engine().begin() as conn:
        result = await conn.execute(
            text("DELETE FROM rag_documents WHERE id = :id"), {"id": document_id}
        )
        return result.rowcount > 0


async def _llm_rerank(
    query: str,
    matches: List[Dict[str, Any]],
    llm,
) -> List[Dict[str, Any]]:
    """Reordena os candidatos pedindo nota de relevância ao LLM (0-10)."""
    import json

    blocks = "\n\n".join(
        f"[{i}] {m['content'][:600]}" for i, m in enumerate(matches)
    )
    prompt = (
        f'Given the user query below, rate each candidate chunk from 0 (irrelevant) to 10 '
        f'(directly answers the query). Answer ONLY with a JSON array of numbers, one per chunk, '
        f'in order. No explanations.\n\n'
        f'QUERY: {query}\n\nCANDIDATES:\n{blocks}'
    )
    response = await llm.ainvoke(prompt)
    content = response.content
    if isinstance(content, list):
        raw = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
    else:
        raw = str(content)
    try:
        scores = json.loads(raw[raw.index("["): raw.rindex("]") + 1])
    except Exception:
        return matches

    reranked = []
    for i, match in enumerate(matches):
        score = scores[i] if i < len(scores) and isinstance(scores[i], (int, float)) else 0
        reranked.append({**match, "rerank_score": float(score)})
    reranked.sort(key=lambda m: m["rerank_score"], reverse=True)
    return reranked


async def search(
    query: str,
    app_settings: Optional[AppSettings] = None,
    k: int = 4,
    llm=None,
) -> List[Dict[str, Any]]:
    """Busca os chunks mais relevantes. Com rag_rerank ativo, pega mais candidatos
    e reranqueia via LLM antes de devolver os top-k."""
    if not (query or "").strip():
        return []
    if not await ensure_vector_store(app_settings):
        return []

    rerank_enabled = bool(getattr(app_settings, "rag_rerank", False)) and llm is not None
    fetch_k = k * 3 if rerank_enabled else k

    embeddings = _create_embeddings(app_settings)
    vector = await embeddings.aembed_query(query)
    embedding_literal = "[" + ",".join(f"{v:.8f}" for v in vector) + "]"

    async with _get_engine().begin() as conn:
        result = await conn.execute(
            text(
                "SELECT c.content, d.title, 1 - (c.embedding <=> CAST(:embedding AS vector)) AS score "
                "FROM rag_chunks c JOIN rag_documents d ON d.id = c.document_id "
                "ORDER BY c.embedding <=> CAST(:embedding AS vector) LIMIT :k"
            ),
            {"embedding": embedding_literal, "k": fetch_k},
        )
        matches = [dict(row._mapping) for row in result.fetchall()]

    if rerank_enabled and matches:
        try:
            matches = await _llm_rerank(query, matches, llm)
        except Exception as exc:
            logger.warning(f"Rerank LLM falhou, usando ordem vetorial: {exc}")

    return matches[:k]


async def get_rag_context(
    query: str,
    app_settings: Optional[AppSettings] = None,
    k: Optional[int] = None,
    min_score: Optional[float] = None,
    llm=None,
) -> str:
    """Retorna o contexto formatado para injeção no prompt (ou string vazia)."""
    k = k or getattr(app_settings, "rag_top_k", None) or 4
    min_score = (
        min_score
        if min_score is not None
        else getattr(app_settings, "rag_min_score", None) or 0.5
    )
    try:
        matches = await search(query, app_settings=app_settings, k=k, llm=llm)
    except Exception as exc:
        logger.warning(f"Busca RAG falhou: {exc}")
        return ""

    relevant = [m for m in matches if (m.get("score") or 0) >= min_score]
    if not relevant:
        return ""
    logger.info(
        "RAG: %d chunk(s) usados | scores=%s",
        len(relevant),
        [round(m["score"], 3) for m in relevant],
    )
    blocks = [
        f"- (fonte: {m['title']}) {m['content']}" for m in relevant
    ]
    return "\n\n".join(blocks)
