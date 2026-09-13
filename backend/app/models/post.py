import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Enum, JSON, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class PostStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PostHistory(Base):
    __tablename__ = "posts"

    id = Column(String(36), primary_key=True, index=True)

    topic = Column(String(500), nullable=False)
    style = Column(String(50), nullable=False)
    audience = Column(String(100), nullable=False)
    experience = Column(String(50), nullable=False)
    objective = Column(String(50), nullable=False)
    format = Column(String(50), nullable=False)
    include_code = Column(Boolean, default=False)
    include_visual = Column(Boolean, default=False)
    
    status = Column(Enum(PostStatus), default=PostStatus.PENDING, nullable=False)
    
    content = Column(JSON, nullable=True)
    researched_topics = Column(JSON, nullable=True)
    hashtags = Column(JSON, nullable=True)
    hooks = Column(JSON, nullable=True)
    review = Column(JSON, nullable=True)
    visual_suggestion = Column(JSON, nullable=True)
    
    is_favorite = Column(Boolean, default=False, nullable=False)
    tags = Column(JSON, default=list, nullable=False)
    language = Column(String(10), default="pt", nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    error_message = Column(Text, nullable=True)

    code_examples = relationship(
        "CodeExample",
        back_populates="post",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_posts_created_at", "created_at"),
        Index("ix_posts_status", "status"),
        Index("ix_posts_favorito", "is_favorite"),
    )


class GenerationTask(Base):
    __tablename__ = "generation_tasks"

    id = Column(String(36), primary_key=True, index=True)
    status = Column(Enum(PostStatus), default=PostStatus.PENDING, nullable=False)
    current_step = Column(String(100), nullable=True)
    progress = Column(Integer, default=0, nullable=False)
    result = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)