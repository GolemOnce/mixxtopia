from datetime import datetime

from pydantic import BaseModel, Field

from app.model.post import PostCategory


class PostCreateRequest(BaseModel):
    category: PostCategory
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)


class PostUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=1000)


class PostResponse(BaseModel):
    post_id: str
    post_num: int
    author: str
    category: PostCategory
    title: str
    content: str
    created_at: datetime
    updated_at: datetime | None = None


class PostListResponse(BaseModel):
    items: list[PostResponse]
    total: int
    page: int
    page_size: int
