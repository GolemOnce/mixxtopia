from enum import Enum
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

suggests_col = db["suggests"]


class SuggestCategory(str, Enum):
    """건의(suggestion) + 도메인별 신고(report)를 category로 구분해 한 컬렉션에서 관리."""

    suggestion = "suggestion"
    report_user = "report_user"
    report_post = "report_post"
    report_comment = "report_comment"
    report_photo = "report_photo"
    report_schedule = "report_schedule"
    report_vote = "report_vote"
    report_bustercall = "report_bustercall"


class SuggestStatus(str, Enum):
    pending = "pending"
    read = "read"
    done = "done"


class Suggest(BaseEntity):
    """suggest(suggest.py) 명세 + report 통합용 target_id 확장.

    target_id는 명세에 없던 필드로, report_* 카테고리일 때 신고 대상(유저/게시글 등)의 id를
    남기기 위해 추가함. suggestion(건의)일 때는 None.
    """

    suggest_id: UUID
    category: SuggestCategory
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)
    email: str | None = None
    status: SuggestStatus = SuggestStatus.pending
    target_id: str | None = None


async def ensure_indexes() -> None:
    await suggests_col.create_index("created_at")
