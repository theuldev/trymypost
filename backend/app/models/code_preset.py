from sqlalchemy import Column, Integer, String, Boolean, DateTime, Index
from sqlalchemy.sql import func
from app.db.session import Base


class CodeImagePreset(Base):
    __tablename__ = "code_image_presets"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    theme = Column(String(50), nullable=False)
    language = Column(String(50), nullable=False)
    font_family = Column(String(200), nullable=False)
    font_size = Column(String(10), nullable=False)
    padding = Column(String(10), nullable=False)
    window_style = Column(String(20), nullable=False)
    show_line_numbers = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_code_image_presets_name", "name"),
    )
