from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

schedules_col = db["schedules"]

# CLAUDE.md의 스케줄표 설명(음방/라디오/방송출연/시상식/음악축제/콘서트/팬미팅/팬싸)을 기본값으로
# 제공하되, 강제하지 않는다(아래 참고) — 프론트 자동완성 힌트용일 뿐 검증에는 안 쓰임.
SUGGESTED_SCHEDULE_CATEGORIES = [
    "musicbroad",
    "radio",
    "broadcast",
    "award",
    "festival",
    "concert",
    "fanmeeting",
    "fansign",
    "etc",
]


class Schedule(BaseEntity):
    """category는 원래 고정 enum이었으나, 새 스케줄 종류가 생길 때마다 코드 배포가 필요해지는
    문제가 있어 자유 문자열로 완화함 — 이 값에 따라 분기하는 로직이 없어 enum으로 강제할
    실익이 없다고 판단(post의 notice/suggestion처럼 권한이 갈리는 카테고리와는 다름)."""

    schedule_id: UUID
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=500)
    member: list[str] = Field(default_factory=list)
    category: str = Field(min_length=1, max_length=20)
    link: str = Field(max_length=200)
    organizer: str = Field(min_length=1, max_length=50)
    location: str = Field(min_length=1, max_length=50)
    start_at: datetime
    end_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "Schedule":
        return cls(**{**doc, "schedule_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await schedules_col.create_index("start_at")
    await schedules_col.create_index("category")
    await schedules_col.create_index("member")
