from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from pydantic_settings import ConfigDict


# --- Request / task flow ---

class AnalyzeJobRequest(BaseModel):
    job_description: str
    job_url: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class AnalyzeJobResponse(BaseModel):
    task_id: str
    status: str

    model_config = ConfigDict(protected_namespaces=())


# --- Structured result ---

class SalaryRange(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None
    currency: Optional[str] = None
    raw: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class SalaryMarketData(BaseModel):
    min: Optional[int] = None
    max: Optional[int] = None
    currency: Optional[str] = None
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class SalaryRecommendation(BaseModel):
    required: bool = False
    recommended_min: Optional[int] = None
    recommended_max: Optional[int] = None
    suggested_value: Optional[int] = None
    currency: Optional[str] = None
    confidence: Optional[str] = None
    reasoning: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class JobInfo(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    department: Optional[str] = None
    title_seniority: Optional[str] = None
    responsibility_seniority: Optional[str] = None
    location: Optional[str] = None
    work_model: Optional[str] = None
    contract_type: Optional[str] = None
    workload: Optional[str] = None
    experience_required: Optional[str] = None
    salary_raw: Optional[str] = None
    benefits: List[str] = Field(default_factory=list)
    process_notes: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    source_url: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class JobRequirement(BaseModel):
    description: str
    technology: Optional[str] = None
    category: Optional[str] = None
    required: bool = True
    importance: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class RequirementMatch(BaseModel):
    requirement: str
    category: Optional[str] = None
    importance: Optional[str] = None
    required: bool = True
    match: str = "no_evidence"
    confidence: Optional[str] = None
    evidence: List[str] = Field(default_factory=list)
    note: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class ProfileMatch(BaseModel):
    score: Optional[int] = None
    technical: Optional[int] = None
    experience: Optional[int] = None
    seniority: Optional[int] = None
    languages: Optional[int] = None
    soft_skills: Optional[int] = None
    education: Optional[int] = None
    candidate_seniority: Optional[str] = None
    seniority_reasoning: Optional[str] = None
    requirements: List[RequirementMatch] = Field(default_factory=list)

    model_config = ConfigDict(protected_namespaces=())


class CompanyInfo(BaseModel):
    name: Optional[str] = None
    about: Optional[str] = None
    segment: Optional[str] = None
    products: Optional[str] = None
    location: Optional[str] = None
    size: Optional[str] = None
    from_job: List[str] = Field(default_factory=list)
    from_web: List[str] = Field(default_factory=list)
    sources: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(protected_namespaces=())


class RedFlag(BaseModel):
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class Recommendation(BaseModel):
    classification: Optional[str] = None
    score: Optional[int] = None
    summary: Optional[str] = None
    strengths: List[str] = Field(default_factory=list)
    gaps: List[str] = Field(default_factory=list)
    apply_advice: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class JobAnalysisResult(BaseModel):
    """Resultado completo e estruturado da análise de vaga."""
    job: JobInfo = Field(default_factory=JobInfo)
    requirements: List[JobRequirement] = Field(default_factory=list)
    profile_match: ProfileMatch = Field(default_factory=ProfileMatch)
    salary: Dict[str, Any] = Field(default_factory=dict)
    company: CompanyInfo = Field(default_factory=CompanyInfo)
    red_flags: List[RedFlag] = Field(default_factory=list)
    questions: List[str] = Field(default_factory=list)
    recommendation: Recommendation = Field(default_factory=Recommendation)
    knowledge_base_available: bool = True
    model_used: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


# --- History ---

class JobAnalysisHistoryItem(BaseModel):
    id: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = None
    work_model: Optional[str] = None
    location: Optional[str] = None
    score: Optional[int] = None
    match_classification: Optional[str] = None
    salary_suggested: Optional[int] = None
    job_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(protected_namespaces=())


class JobAnalysisHistoryResponse(BaseModel):
    items: List[JobAnalysisHistoryItem]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(protected_namespaces=())


class JobAnalysisDetail(JobAnalysisResult):
    id: str
    job_description: str
    job_url: Optional[str] = None
    task_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(protected_namespaces=())
