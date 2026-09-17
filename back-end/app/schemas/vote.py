from datetime import datetime

from pydantic import BaseModel, Field


class VoteCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=500)
    member: list[str] = Field(default_factory=list)
    link: str = Field(max_length=200)
    organizer: str = Field(min_length=1, max_length=50)
    start_at: datetime
    end_at: datetime


class VoteUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=500)
    member: list[str] | None = None
    link: str | None = Field(default=None, max_length=200)
    organizer: str | None = Field(default=None, min_length=1, max_length=50)
    start_at: datetime | None = None
    end_at: datetime | None = None


class VoteResponse(BaseModel):
    vote_id: str
    title: str
    content: str
    member: list[str]
    link: str
    organizer: str
    start_at: datetime
    end_at: datetime
