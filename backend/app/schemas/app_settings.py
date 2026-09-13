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

    model_config = ConfigDict(protected_namespaces=())


class AppSettingsResponse(BaseModel):
    id: int
    provider: str
    model_name: str
    api_key: Optional[str] = None
    tavily_api_key: Optional[str] = None
    temperature: float
    language: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
