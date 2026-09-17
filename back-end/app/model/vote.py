from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

votes_col = db["votes"]


class Vote(BaseEntity):
    vote_id: UUID
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=500)
    member: list[str] = Field(default_factory=list)
    link: str = Field(max_length=200)
    organizer: str = Field(min_length=1, max_length=50)
    start_at: datetime
    end_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "Vote":
        return cls(**{**doc, "vote_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await votes_col.create_index("start_at")
    await votes_col.create_index("member")
    await votes_col.create_index("organizer")
