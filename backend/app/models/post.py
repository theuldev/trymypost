import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Enum, JSON, Index
)
from sqlalchemy.sql import func
from app.db.session import Base


class PostStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PostHistory(Base):
    __tablename__ = "posts_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    tema = Column(String(500), nullable=False)
    estilo = Column(String(50), nullable=False)
    publico = Column(String(100), nullable=False)
    experiencia = Column(String(50), nullable=False)
    objetivo = Column(String(50), nullable=False)
    formato = Column(String(50), nullable=False)
    incluir_codigo = Column(Boolean, default=False)
    incluir_visual = Column(Boolean, default=False)
    
    status = Column(Enum(PostStatus), default=PostStatus.PENDING, nullable=False)
    
    posts_data = Column(JSON, nullable=True)
    topicos_pesquisados = Column(JSON, nullable=True)
    hashtags = Column(JSON, nullable=True)
    hooks = Column(JSON, nullable=True)
    review = Column(JSON, nullable=True)
    visual_sugestao = Column(JSON, nullable=True)
    
    favorito = Column(Boolean, default=False, nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    error_message = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_posts_history_created_at", "created_at"),
        Index("ix_posts_history_status", "status"),
        Index("ix_posts_history_favorito", "favorito"),
    )


class GenerationTask(Base):
    __tablename__ = "generation_tasks"

    id = Column(String(36), primary_key=True, index=True)
    post_history_id = Column(Integer, nullable=True)
    status = Column(Enum(PostStatus), default=PostStatus.PENDING, nullable=False)
    current_step = Column(String(100), nullable=True)
    progress = Column(Integer, default=0, nullable=False)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)