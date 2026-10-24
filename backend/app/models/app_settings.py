from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
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
    image_provider = Column(String(50), default="NONE", nullable=False)
    image_model = Column(String(100), default="", nullable=False)
    image_api_key = Column(String(255), nullable=True)
    guidelines = Column(Text, default="", nullable=False)
    rag_chunk_size = Column(Integer, default=1200, nullable=False)
    rag_chunk_overlap = Column(Integer, default=200, nullable=False)
    rag_top_k = Column(Integer, default=4, nullable=False)
    rag_min_score = Column(Float, default=0.5, nullable=False)
    rag_rerank = Column(Boolean, default=False, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user_profile = relationship("UserProfile", back_populates="app_settings", uselist=False, cascade="all, delete-orphan")
