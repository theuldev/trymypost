import uuid

from sqlalchemy import Column, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.db.session import Base


class SuggestedTopic(Base):
    __tablename__ = "suggested_topics"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    topic = Column(String(500), nullable=False)
    justification = Column(Text, nullable=False, default="")
    context = Column(String(500), nullable=False, default="")
    country = Column(String(100), nullable=False, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_suggested_topics_context_country", "context", "country"),
    )
