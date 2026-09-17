from datetime import datetime

from pydantic import BaseModel, Field

from app.model.suggest import SuggestCategory, SuggestStatus


class SuggestCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)
    email: str | None = Field(default=None, max_length=200)


class SuggestResponse(BaseModel):
    suggest_id: str
    category: SuggestCategory
    title: str
    content: str
    email: str | None
    status: SuggestStatus
    target_id: str | None
    created_at: datetime


class SuggestListResponse(BaseModel):
    items: list[SuggestResponse]
    total: int
    page: int
    page_size: int
