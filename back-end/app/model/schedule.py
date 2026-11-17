from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

schedules_col = db["schedules"]


class Schedule(BaseEntity):
    """category는 고정 enum이 아니라 app.model.schedule_category.ScheduleCategory로 관리자가
    추가/수정/삭제하는 값 — 유효성 검사는 service 계층에서 그 컬렉션을 조회해 확인한다."""

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
    # officials 트윗에서 자동 추출한 스케줄(유튜브 콘텐츠/라이브 등)만 채워진다. 수동 등록은
    # None — 크롤러가 같은 트윗을 다시 가져와도 이 값으로 중복 생성을 막는 용도일 뿐,
    # API 요청/응답 스키마에는 노출하지 않는다(관리자가 직접 다룰 값이 아니라서).
    source_official_id: str | None = None

    @classmethod
    def from_doc(cls, doc: dict) -> "Schedule":
        return cls(**{**doc, "schedule_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await schedules_col.create_index("start_at")
    await schedules_col.create_index("category")
    await schedules_col.create_index("member")
    await schedules_col.create_index("source_official_id", unique=True, sparse=True)
