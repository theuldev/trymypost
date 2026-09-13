from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PostEditBase(BaseModel):
    post_index: int
    content: str
    original_content: Optional[str] = None


class PostEditCreate(PostEditBase):
    pass


class PostEditResponse(PostEditBase):
    id: int
    post_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
