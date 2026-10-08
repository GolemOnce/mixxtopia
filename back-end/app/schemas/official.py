from datetime import datetime

from pydantic import BaseModel, Field

from app.model.official import OfficialAccount


class OfficialCreateRequest(BaseModel):
    posted_at: datetime
    account: OfficialAccount
    link: str = Field(max_length=200)
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)
    photo_links: list[str] = Field(default_factory=list, max_length=4)
    video_links: list[str] = Field(default_factory=list, max_length=4)


class OfficialUpdateRequest(BaseModel):
    posted_at: datetime | None = None
    account: OfficialAccount | None = None
    link: str | None = Field(default=None, max_length=200)
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=1000)
    photo_links: list[str] | None = Field(default=None, max_length=4)
    video_links: list[str] | None = Field(default=None, max_length=4)


class OfficialResponse(BaseModel):
    official_id: str
    posted_at: datetime
    account: OfficialAccount
    link: str
    title: str
    content: str
    photo_links: list[str] = Field(default_factory=list)
    video_links: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime | None = None


class OfficialListResponse(BaseModel):
    items: list[OfficialResponse]
    total: int
    page: int
    page_size: int


class OfficialPageResponse(BaseModel):
    # 이 글이 /api/officials 목록(해당 page_size 기준, "전체" 탭 정렬)에서 몇 페이지에 있는지.
    page: int
