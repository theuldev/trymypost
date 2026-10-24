from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.code_example import CodeExampleResponse


class StyleEnum(str, Enum):
    TECHNICAL = "Technical"
    HUMOR = "Humor/Technology"
    MINIMALIST = "Minimalist"
    TRENDS = "Trends/News"


class AudienceEnum(str, Enum):
    JUNIOR = "Junior Developers"
    MID = "Mid Developers"
    SENIOR = "Senior Developers"
    TECH_LEADS = "Tech Leads / Architects"
    MANAGERS = "Managers / CTOs"
    FULLSTACK = "Full Stack"
    BACKEND = "Backend"
    FRONTEND = "Frontend"
    DEVOPS = "DevOps / SRE"
    DATA = "Data / AI"
    MOBILE = "Mobile"
    GENERAL = "General / All"


class ExperienceEnum(str, Enum):
    BEGINNER = "Beginner (0-2 years)"
    INTERMEDIATE = "Intermediate (2-5 years)"
    ADVANCED = "Advanced (5-10 years)"
    EXPERT = "Expert (10+ years)"


class ObjectiveEnum(str, Enum):
    ENGAGEMENT = "Engagement / Comments"
    AUTHORITY = "Authority / Personal Branding"
    LEADS = "Lead Generation / Sales"
    NETWORKING = "Networking / Connections"
    EDUCATE = "Educate / Share Knowledge"
    HIRING = "Attract Opportunities / Hiring"


class FormatEnum(str, Enum):
    LISTICLE = "Listicle (5 tips, 3 mistakes...)"
    STORYTELLING = "Storytelling (Personal story)"
    BEFORE_AFTER = "Before/After (Transformation)"
    OPEN_QUESTION = "Open Question (Engagement)"
    STRONG_OPINION = "Strong Opinion (Controversial)"
    TUTORIAL = "Mini Tutorial (Step by step)"


class GeneratePostRequest(BaseModel):
    topic: str = Field(default="", max_length=500)
    input_mode: str = Field(default="structured", pattern="^(structured|description)$")
    description: Optional[str] = Field(default=None, max_length=5000)
    visual_brief: Optional[str] = Field(default=None, max_length=1000)
    style: Optional[StyleEnum] = None
    audience: Optional[AudienceEnum] = None
    experience: Optional[ExperienceEnum] = None
    objective: Optional[ObjectiveEnum] = None
    format: Optional[FormatEnum] = None
    include_code: bool = False
    include_visual: bool = False
    include_hashtags: bool = True
    include_hooks: bool = True
    include_review: bool = True
    use_rag: bool = False
    guidelines: Optional[str] = None
    quantity: int = Field(default=3, ge=1, le=10)
    language: Optional[str] = Field(default="en", pattern="^(pt|en|es)$")
    max_length: Optional[int] = Field(default=None, ge=10, le=10000)


class GeneratePostResponse(BaseModel):
    task_id: str
    status: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    current_step: Optional[str] = None
    progress: int = 0
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class EditorialStatusEnum(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"


class PostHistoryBase(BaseModel):
    id: str
    topic: str
    style: str
    audience: str
    experience: str
    objective: str
    format: str
    include_code: bool
    include_visual: bool
    status: str
    editorial_status: str = "draft"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    generated_image_url: Optional[str] = None
    is_favorite: bool
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    is_edited: bool = False
    total_cost_usd: Optional[float] = None
    total_tokens: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class UpdateEditorialStatusRequest(BaseModel):
    editorial_status: EditorialStatusEnum
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None


class CalendarItem(BaseModel):
    id: str
    topic: str
    style: str
    format: str
    editorial_status: str
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: datetime
    is_favorite: bool

    model_config = ConfigDict(from_attributes=True)


class PostHistoryDetail(PostHistoryBase):
    posts_data: Optional[List[Dict[str, Any]]] = None
    researched_topics: Optional[List[str]] = None
    hashtags: Optional[List[Dict[str, Any]]] = None
    hooks: Optional[List[Dict[str, Any]]] = None
    review: Optional[Dict[str, Any]] = None
    visual_suggestion: Optional[Dict[str, Any]] = None
    code_examples: Optional[List[CodeExampleResponse]] = None


class PostHistoryListResponse(BaseModel):
    items: List[PostHistoryBase]
    total: int
    page: int
    page_size: int


class ToggleFavoriteRequest(BaseModel):
    is_favorite: bool


class UpdateTagsRequest(BaseModel):
    tags: List[str]


class CodeFromPostRequest(BaseModel):
    post: str = Field(..., min_length=1)


class CodeFromPostResponse(BaseModel):
    code: str
    language: str
    title: str


class SuggestTopicsRequest(BaseModel):
    context: Optional[str] = None
    country: Optional[str] = None
    quantity: int = Field(default=5, ge=1, le=10)


class SuggestTopicsResponse(BaseModel):
    topics: List[Dict[str, Any]]


class TopicSuggestion(BaseModel):
    title: str
    description: str
    suggested_format: str
    angle: str
    suggested_hashtags: List[str]


class HealthResponse(BaseModel):
    status: str
    version: str