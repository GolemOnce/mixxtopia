from datetime import datetime

from pydantic import BaseModel, Field


class ScheduleCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=500)
    member: list[str] = Field(default_factory=list)
    category: str = Field(min_length=1, max_length=20)
    link: str = Field(max_length=200)
    organizer: str = Field(min_length=1, max_length=50)
    location: str = Field(min_length=1, max_length=50)
    start_at: datetime
    end_at: datetime


class ScheduleUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=500)
    member: list[str] | None = None
    category: str | None = Field(default=None, min_length=1, max_length=20)
    link: str | None = Field(default=None, max_length=200)
    organizer: str | None = Field(default=None, min_length=1, max_length=50)
    location: str | None = Field(default=None, min_length=1, max_length=50)
    start_at: datetime | None = None
    end_at: datetime | None = None


class ScheduleResponse(BaseModel):
    schedule_id: str
    title: str
    content: str
    member: list[str]
    category: str
    link: str
    organizer: str
    location: str
    start_at: datetime
    end_at: datetime
