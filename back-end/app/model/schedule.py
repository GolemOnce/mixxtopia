from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

schedules_col = db["schedules"]


class ScheduleCategory(str, Enum):
    """CLAUDE.md의 스케줄표 설명(방송출연/시상식/음악축제/콘서트/팬미팅/팬싸)을 그대로 매핑."""

    broadcast = "broadcast"
    award = "award"
    festival = "festival"
    concert = "concert"
    fanmeeting = "fanmeeting"
    fansign = "fansign"
    etc = "etc"


class Schedule(BaseEntity):
    schedule_id: UUID
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=500)
    member: list[str] = Field(default_factory=list)
    category: ScheduleCategory
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
