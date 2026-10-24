from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean
from sqlalchemy.sql import func
from app.db.session import Base


class EmailGeneration(Base):
    __tablename__ = "email_generations"

    id = Column(String(36), primary_key=True, index=True)
    task_id = Column(String(36), nullable=False, index=True)

    # Input
    job_description = Column(Text, nullable=False)

    # Extracted job info
    job_title = Column(String(200), nullable=True)
    company_name = Column(String(200), nullable=True)
    recruiter_name = Column(String(200), nullable=True)
    recruiter_email = Column(String(200), nullable=True)
    key_requirements = Column(JSON, nullable=True)
    technologies = Column(JSON, nullable=True)
    experience_desired = Column(JSON, nullable=True)
    location_modality = Column(String(200), nullable=True)
    salary_info = Column(String(500), nullable=True)
    salary_expectation_required = Column(Boolean, default=False, nullable=False)

    # Generated output
    recipient_email = Column(String(200), nullable=True)
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)

    # Metadata
    model_used = Column(String(100), nullable=True)
    tavily_searches_performed = Column(String(10), default="0", nullable=False)
    generation_time_ms = Column(String(20), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)