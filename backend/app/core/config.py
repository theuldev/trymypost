from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
from dotenv import load_dotenv

# Carrega .env da raiz do projeto explicitamente
ROOT_DIR = Path(__file__).parent.parent.parent.parent
load_dotenv(ROOT_DIR / ".env")


class Settings(BaseSettings):
    app_name: str = "TryMyPost API"
    debug: bool = False
    api_prefix: str = "/api/v1"

    database_url: str = Field(default="sqlite+aiosqlite:///./trymypost.db", env="DATABASE_URL")

    google_api_key: str = Field(..., env="GOOGLE_API_KEY")
    tavily_api_key: str = Field(default="", env="TAVILY_API_KEY")  # opcional para não quebrar se faltar

    gemini_model: str = "gemini-2.5-flash"
    gemini_temperature: float = 0.9

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    jwt_secret: str = Field(..., env="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60 * 24 * 7

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()