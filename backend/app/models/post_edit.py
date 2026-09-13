from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class PostEdit(Base):
    __tablename__ = "posts_edits"

    id = Column(String(36), primary_key=True, index=True)
    post_id = Column(String(36), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    post_index = Column(Integer, default=0, nullable=False)
    content = Column(Text, nullable=False)
    original_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
