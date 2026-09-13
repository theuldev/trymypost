from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CodeExampleResponse(BaseModel):
    id: str
    code: str
    language: str
    post_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)