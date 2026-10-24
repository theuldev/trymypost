from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class PostUsageRecord(BaseModel):
    id: str
    post_id: Optional[str] = None
    task_id: Optional[str] = None
    step: str
    provider: str
    model_name: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PostUsageSummary(BaseModel):
    records: List[PostUsageRecord]
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    total_cost_usd: float


class GlobalUsageSummary(BaseModel):
    total_cost_usd: float
    total_tokens: int
    posts_with_usage: int
    avg_cost_per_post: float
    by_model: List[dict]
    by_step: List[dict]


class GenerateImageResponse(BaseModel):
    image_url: str
    cost_usd: float
