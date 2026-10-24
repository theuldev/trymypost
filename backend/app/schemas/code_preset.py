from datetime import datetime
from pydantic import BaseModel, ConfigDict


class CodePresetBase(BaseModel):
    name: str
    theme: str
    language: str
    font_family: str
    syntax_theme: str = "vscode-dark"
    font_size: str
    padding: str
    window_style: str
    show_line_numbers: bool = True


class CodePresetCreate(CodePresetBase):
    pass


class CodePresetResponse(CodePresetBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
