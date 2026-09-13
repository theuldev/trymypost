from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.code_example import CodeExampleResponse


class StyleEnum(str, Enum):
    TECHNICAL = "Technical"
    STORYTELLING = "Storytelling"
    OPINION = "Opinion/Controversial"
    EDUCATIONAL = "Educational"
    CAREER = "Career/Soft Skills"
    HUMOR = "Humor/Technology"
    MINIMALIST = "Minimalist"
    CASE_STUDY = "Case Study"
    TRENDS = "Trends/News"
    PERSONAL = "Personal/Autobiographical"


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
    topic: str = Field(..., min_length=1, max_length=500)
    style: StyleEnum
    audience: AudienceEnum
    experience: ExperienceEnum
    objective: ObjectiveEnum
    format: FormatEnum
    include_code: bool = False
    include_visual: bool = False
    include_hashtags: bool = True
    include_hooks: bool = True
    include_review: bool = True
    guidelines: Optional[str] = None
    quantity: int = Field(default=3, ge=1, le=10)
    language: Optional[str] = Field(default="en", pattern="^(pt|en|es)$")
    max_length: Optional[int] = Field(default=2000, ge=10, le=10000)


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
    is_favorite: bool
    tags: List[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    is_edited: bool = False

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