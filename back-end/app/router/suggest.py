from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import get_current_user, require_roles
from app.model.suggest import SuggestCategory, SuggestStatus
from app.model.user import User, UserRole
from app.schemas.suggest import SuggestCreateRequest, SuggestListResponse, SuggestResponse
from app.service import suggest as suggest_service

router = APIRouter(prefix="/api/suggests", tags=["suggest"])


def _to_response(doc: dict) -> SuggestResponse:
    return SuggestResponse(
        suggest_id=doc["_id"],
        category=doc["category"],
        title=doc["title"],
        content=doc["content"],
        email=doc.get("email"),
        status=doc["status"],
        target_id=doc.get("target_id"),
        created_at=doc["created_at"],
    )


@router.get("", response_model=SuggestListResponse)
async def list_suggests(
    category: SuggestCategory | None = None,
    status: SuggestStatus | None = None,
    page: int = 1,
    page_size: int = 20,
    _current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    docs, total = await suggest_service.list_suggests(category, status, page, page_size)
    return SuggestListResponse(
        items=[_to_response(doc) for doc in docs], total=total, page=page, page_size=page_size
    )


@router.get("/{suggest_id}", response_model=SuggestResponse)
async def get_suggest(
    suggest_id: str,
    _current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await suggest_service.get_suggest(suggest_id)
    except suggest_service.SuggestNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "건의를 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.post("", response_model=SuggestResponse, status_code=status.HTTP_201_CREATED)
async def create_suggest(
    payload: SuggestCreateRequest, current_user: User = Depends(get_current_user)
):
    doc = await suggest_service.create_suggest(payload, current_user.user_id)
    return _to_response(doc)


@router.post("/{suggest_id}", response_model=SuggestResponse)
async def complete_suggest(
    suggest_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await suggest_service.complete_suggest(suggest_id, current_user.user_id)
    except suggest_service.SuggestNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "건의를 찾을 수 없습니다.") from exc
    return _to_response(doc)
