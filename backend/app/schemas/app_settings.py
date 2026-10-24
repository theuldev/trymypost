from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AppSettingsUpdate(BaseModel):
    provider: Optional[str] = "GOOGLE"
    model_name: Optional[str] = "gemini-2.5-flash"
    api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    temperature: Optional[float] = 0.7
    language: Optional[str] = "pt-BR"
    image_provider: Optional[str] = "NONE"
    image_model: Optional[str] = ""
    image_api_key: Optional[str] = None
    guidelines: Optional[str] = ""
    rag_chunk_size: Optional[int] = 1200
    rag_chunk_overlap: Optional[int] = 200
    rag_top_k: Optional[int] = 4
    rag_min_score: Optional[float] = 0.5
    rag_rerank: Optional[bool] = False

    model_config = ConfigDict(protected_namespaces=())


class AppSettingsResponse(BaseModel):
    id: str
    provider: str
    model_name: str
    api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    temperature: float
    language: str
    image_provider: str = "NONE"
    image_model: str = ""
    image_api_key: Optional[str] = None
    guidelines: str = ""
    rag_chunk_size: int = 1200
    rag_chunk_overlap: int = 200
    rag_top_k: int = 4
    rag_min_score: float = 0.5
    rag_rerank: bool = False
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
