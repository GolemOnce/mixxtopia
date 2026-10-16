from fastapi import APIRouter, Depends

from app.core.access_log import AccessLogAction
from app.core.deps import require_roles
from app.model.user import User, UserRole
from app.schemas.access_log import AccessLogListResponse, AccessLogResponse
from app.service import access_log as access_log_service

router = APIRouter(prefix="/api/access-logs", tags=["access-log"])


def _to_response(doc: dict) -> AccessLogResponse:
    return AccessLogResponse(
        user_id=doc["user_id"],
        ip=doc["ip"],
        action=doc["action"],
        created_at=doc["created_at"],
    )


@router.get("", response_model=AccessLogListResponse)
async def list_access_logs(
    action: AccessLogAction | None = None,
    user_id: str | None = None,
    page: int = 1,
    page_size: int = 20,
    _current_user: User = Depends(require_roles(UserRole.admin)),
):
    docs, total = await access_log_service.list_access_logs(action, user_id, page, page_size)
    return AccessLogListResponse(
        items=[_to_response(doc) for doc in docs], total=total, page=page, page_size=page_size
    )
