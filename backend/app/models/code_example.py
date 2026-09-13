from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.session import Base


class CodeExample(Base):
    __tablename__ = "code_examples"

    id = Column(String(36), primary_key=True)
    code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    post_id = Column(
        String(36),
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    post = relationship("PostHistory", back_populates="code_examples")