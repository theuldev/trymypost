from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(String(36), primary_key=True, index=True)
    provider = Column(String(50), default="GOOGLE", nullable=False)
    model_name = Column(String(100), default="gemini-2.5-flash", nullable=False)
    api_key = Column(String(255), nullable=True)
    tavily_api_key = Column(String(255), nullable=True)
    temperature = Column(Float, default=0.7, nullable=False)
    language = Column(String(10), default="pt-BR", nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
