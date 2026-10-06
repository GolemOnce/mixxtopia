from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

officials_col = db["officials"]


class OfficialAccount(str, Enum):
    nmixx_official = "nmixx_official"
    we_nmixx = "we_nmixx"


class Official(BaseEntity):
    """officials(official.py) 명세.

    X(nmixx_official=공식계정, we_nmixx=멤버 주도 공용계정)에 올라오는 트윗을 올리는 게시판.
    크롤링/스크래핑으로 자동 등록되거나 관리자가 수동으로 등록한다.
    created_by는 수동 등록 시 등록한 관리자의 UUID지만, 자동 등록 시 문자열 "auto"가
    들어갈 수 있어 BaseEntity의 UUID 타입을 str까지 허용하도록 넓힘.
    """

    official_id: UUID
    posted_at: datetime
    account: OfficialAccount
    link: str = Field(max_length=200)
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)
    photo_links: list[str] = Field(default_factory=list, max_length=4)  # 트윗당 최대 4장
    video_links: list[str] = Field(default_factory=list, max_length=4)
    created_by: UUID | str

    @classmethod
    def from_doc(cls, doc: dict) -> "Official":
        return cls(**{**doc, "official_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await officials_col.create_index("posted_at")
    await officials_col.create_index("account")
