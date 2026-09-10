from datetime import datetime, timezone
from uuid import UUID

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BaseEntity(BaseModel):
    created_at: datetime = Field(default_factory=utcnow)
    created_by: UUID
    updated_at: datetime | None = None
    updated_by: UUID | None = None
    deleted_at: datetime | None = None
    deleted_by: UUID | None = None
