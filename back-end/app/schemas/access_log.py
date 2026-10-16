from datetime import datetime

from pydantic import BaseModel

from app.core.access_log import AccessLogAction


class AccessLogResponse(BaseModel):
    user_id: str
    ip: str
    action: AccessLogAction
    created_at: datetime


class AccessLogListResponse(BaseModel):
    items: list[AccessLogResponse]
    total: int
    page: int
    page_size: int
