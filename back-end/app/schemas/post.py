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
    view_count: int
    created_at: datetime
    updated_at: datetime | None = None
    # 목록 조회에서 "전체" 탭(카테고리 미지정)에 쓰는 가상 번호. DB에 저장하지 않고
    # 응답 생성 시 total/page/page_size로 계산(app.router.post._to_response 참고).
    # 상세 조회 응답에서는 항상 None.
    display_num: int | None = None


class PostListResponse(BaseModel):
    items: list[PostResponse]
    total: int
    page: int
    page_size: int
