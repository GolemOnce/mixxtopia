from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.database import db
from app.model.base import utcnow

schedule_categories_col = db["schedule_categories"]

# 글쓰기(일정 등록/수정)마다 조회되는데 자주 바뀌지 않는 데이터라 Redis에 캐싱한다
# (app.service.schedule_category 참고). TTL 없이 두고 관리자가 추가/수정/삭제할 때만
# 무효화한다 — bustercall.py의 현재 캠페인 캐싱과 같은 방식.
KEY_SCHEDULE_CATEGORIES = "schedule:categories"

# 기존에 enum으로 고정했던 9종 — 관리자 CRUD 도입 전 하위호환을 위해 그대로 시드한다.
DEFAULT_SCHEDULE_CATEGORIES = [
    {"category_id": "musicbroad", "label": "음방", "color": "#f87171"},
    {"category_id": "radio", "label": "라디오", "color": "#fb923c"},
    {"category_id": "broadcast", "label": "방송", "color": "#fbbf24"},
    {"category_id": "award", "label": "시상식", "color": "#facc15"},
    {"category_id": "festival", "label": "축제", "color": "#34d399"},
    {"category_id": "concert", "label": "콘서트", "color": "#38bdf8"},
    {"category_id": "fanmeeting", "label": "팬미팅", "color": "#818cf8"},
    {"category_id": "fansign", "label": "팬싸인회", "color": "#c084fc"},
    {"category_id": "etc", "label": "기타", "color": "#94a3b8"},
]


class ScheduleCategory(BaseModel):
    category_id: str = Field(min_length=1, max_length=20, pattern=r"^[a-z0-9_]+$")
    label: str = Field(min_length=1, max_length=20)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    order: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    created_by: UUID
    updated_at: datetime | None = None
    updated_by: UUID | None = None


async def ensure_indexes() -> None:
    # 처음 뜰 때(컬렉션이 비어 있을 때)만 기존 9종을 기본값으로 채워 넣는다.
    # created_by는 시스템 시드라 특정 유저에 귀속시키지 않고 nil UUID로 둔다.
    if await schedule_categories_col.count_documents({}) > 0:
        return

    docs = []
    for order, item in enumerate(DEFAULT_SCHEDULE_CATEGORIES):
        category = ScheduleCategory(
            created_by=UUID(int=0),
            order=order,
            **item,
        )
        doc = category.model_dump(mode="json")
        doc["_id"] = doc.pop("category_id")
        docs.append(doc)
    await schedule_categories_col.insert_many(docs)
