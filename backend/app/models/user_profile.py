from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(String(36), primary_key=True, index=True)
    app_settings_id = Column(String(36), ForeignKey("app_settings.id"), unique=True, nullable=False)
    full_name = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    whatsapp = Column(String(50), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    experience_summary = Column(Text, nullable=True)
    salary_expectation = Column(String(200), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    app_settings = relationship("AppSettings", back_populates="user_profile")

    @property
    def phone_or_whatsapp(self) -> str | None:
        """Return WhatsApp if available, otherwise phone."""
        return self.whatsapp or self.phone