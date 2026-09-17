from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

phrases_col = db["phrases"]

KEY_TOTAL = "hashtag:clicks:total"
KEY_CLIENTS = "hashtag:clients:set"
KEY_PHRASES = "hashtag:phrases"
KEY_PHRASES_ID = "hashtag:phrases:id"
KEY_PAIRS_COUNT = "hashtag:phrases:count"


class BustercallCategory(str, Enum):
    comeback = "comeback"
    birthday = "birthday"
    anniversary = "anniversary"


class Phrase(BaseEntity):
    """phrases(bustercall.py) 명세 + record(총공 집계 로그) 필드 통합.

    record를 별도 컬렉션으로 두지 않고 total_clicks/unique_clients/synced_at을 여기 직접
    둠 — 캠페인 재실행 시 이전 집계는 덮어써진다(과거 회차별 이력은 남기지 않음).
    """

    phrases_id: UUID
    category: BustercallCategory
    detail: str = Field(min_length=1, max_length=16)
    member: str = Field(min_length=1, max_length=16)
    pairs: list[list[str]] = Field(min_length=1)
    fixed2: str = Field(min_length=1, max_length=50)
    fixed4: str = Field(min_length=1, max_length=50)
    is_current: bool = False
    total_clicks: int | None = None
    unique_clients: int | None = None
    synced_at: datetime | None = None


async def ensure_indexes() -> None:
    # deleted_at:None인 문서끼리만 유일하면 되므로 partial index — soft delete 후 같은
    # (category, detail, member)로 재등록 가능
    await phrases_col.create_index(
        [("category", 1), ("detail", 1), ("member", 1)],
        unique=True,
        partialFilterExpression={"deleted_at": None},
    )
