from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    experience_summary: Optional[str] = None
    salary_expectation: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())


class UserProfileResponse(BaseModel):
    id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    experience_summary: Optional[str] = None
    salary_expectation: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class GenerateEmailRequest(BaseModel):
    job_description: str = Field(..., min_length=50, max_length=10000)

    model_config = ConfigDict(protected_namespaces=())


class ExtractedJobInfo(BaseModel):
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    recruiter_name: Optional[str] = None
    recruiter_email: Optional[str] = None
    key_requirements: List[str] = []
    technologies: List[str] = []
    experience_desired: List[str] = []
    location_modality: Optional[str] = None
    salary_info: Optional[str] = None
    salary_expectation_required: bool = False

    model_config = ConfigDict(protected_namespaces=())


class GenerateEmailResponse(BaseModel):
    task_id: str
    status: str

    model_config = ConfigDict(protected_namespaces=())


class EmailGenerationResult(BaseModel):
    recipient_email: Optional[str] = None
    subject: str
    body: str
    extracted_info: ExtractedJobInfo
    email_id: Optional[str] = None  # id do registro salvo (para edição)

    model_config = ConfigDict(protected_namespaces=())


class EmailGenerationHistoryItem(BaseModel):
    id: str
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    recipient_email: Optional[str] = None
    subject: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class EmailGenerationHistoryResponse(BaseModel):
    items: List[EmailGenerationHistoryItem]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(protected_namespaces=())


class EmailBodyUpdate(BaseModel):
    body: str = Field(..., min_length=1)

    model_config = ConfigDict(protected_namespaces=())


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: str
    event_type: str
    event_category: str
    action: str
    status: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    message: Optional[str] = None
    request_data: Optional[dict] = None
    response_data: Optional[dict] = None
    error_details: Optional[dict] = None
    duration_ms: Optional[str] = None
    correlation_id: Optional[str] = None
    parent_event_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class AuditLogListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int

    model_config = ConfigDict(protected_namespaces=())


class AuditSummaryResponse(BaseModel):
    total_events: int
    by_category: dict
    by_status: dict
    by_event_type: dict

    model_config = ConfigDict(protected_namespaces=())