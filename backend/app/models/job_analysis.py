from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, JSON, DateTime
from sqlalchemy.sql import func
from app.db.session import Base


class JobAnalysis(Base):
    __tablename__ = "job_analyses"

    id = Column(String(36), primary_key=True, index=True)
    task_id = Column(String(36), index=True, nullable=False)
    job_description = Column(Text, nullable=False)
    job_url = Column(String(500), nullable=True)

    # Campos normalizados para listagem/filtros (resultado completo em JSON)
    job_title = Column(String(200), nullable=True)
    company_name = Column(String(200), nullable=True)
    seniority = Column(String(50), nullable=True)
    work_model = Column(String(50), nullable=True)
    location = Column(String(200), nullable=True)
    contract_type = Column(String(100), nullable=True)

    score = Column(Integer, nullable=True)
    match_classification = Column(String(30), nullable=True)

    salary_recommended_min = Column(Integer, nullable=True)
    salary_recommended_max = Column(Integer, nullable=True)
    salary_suggested = Column(Integer, nullable=True)

    result = Column(JSON, nullable=True)
    model_used = Column(String(100), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
