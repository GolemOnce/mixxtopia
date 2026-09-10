from datetime import datetime, timezone
from enum import Enum
from uuid import UUID

from app.database import db

access_logs_col = db["access_logs"]

ACCESS_LOG_TTL_SECONDS = 90 * 24 * 60 * 60


class AccessLogAction(str, Enum):
    signup = "signup"
    post_create = "post_create"
    comment_create = "comment_create"


async def ensure_indexes() -> None:
    await access_logs_col.create_index("created_at", expireAfterSeconds=ACCESS_LOG_TTL_SECONDS)


async def write_access_log(user_id: UUID, ip: str, action: AccessLogAction) -> None:
    await access_logs_col.insert_one(
        {
            "user_id": str(user_id),
            "ip": ip,
            "action": action.value,
            "created_at": datetime.now(timezone.utc),
        }
    )
