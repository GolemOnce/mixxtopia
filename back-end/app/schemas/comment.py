from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=100)
    parent_id: str | None = None


class CommentResponse(BaseModel):
    comment_id: str
    post_id: str
    author: str
    parent_id: str | None
    mention_to: str | None
    content: str
    created_at: datetime
    reply_count: int = 0
    replies: list[CommentResponse] = Field(default_factory=list)


class CommentListResponse(BaseModel):
    items: list[CommentResponse]
    total: int
    page: int
    page_size: int


CommentResponse.model_rebuild()
