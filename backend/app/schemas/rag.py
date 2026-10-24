from typing import List, Optional, Any
from pydantic import BaseModel


class RagStatusResponse(BaseModel):
    available: bool
    error: Optional[str] = None
    database_url: str
    embedding_model: str
    vector_dim: int


class RagDocument(BaseModel):
    id: str
    title: str
    chunk_count: int
    embedding_model: str
    created_at: Any
    preview: Optional[str] = None


class RagDocumentCreated(BaseModel):
    id: str
    title: str
    chunk_count: int


class RagSearchRequest(BaseModel):
    query: str
    k: int = 4


class RagSearchResult(BaseModel):
    content: str
    title: str
    score: float
