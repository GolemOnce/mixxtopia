from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_roles
from app.model.official import OfficialAccount
from app.model.user import User, UserRole
from app.schemas.official import (
    OfficialCreateRequest,
    OfficialListResponse,
    OfficialResponse,
    OfficialUpdateRequest,
)
from app.service import official as official_service

router = APIRouter(prefix="/api/officials", tags=["official"])


def _to_response(doc: dict) -> OfficialResponse:
    return OfficialResponse(
        official_id=doc["_id"],
        posted_at=doc["posted_at"],
        account=doc["account"],
        link=doc["link"],
        title=doc["title"],
        content=doc["content"],
        photo_links=doc.get("photo_links", []),
        video_links=doc.get("video_links", []),
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at"),
    )


@router.get("", response_model=OfficialListResponse)
async def list_officials(
    account: OfficialAccount | None = None, page: int = 1, page_size: int = 20
):
    docs, total = await official_service.list_officials(account, page, page_size)
    return OfficialListResponse(
        items=[_to_response(doc) for doc in docs], total=total, page=page, page_size=page_size
    )


@router.get("/{official_id}", response_model=OfficialResponse)
async def get_official(official_id: str):
    try:
        doc = await official_service.get_official(official_id)
    except official_service.OfficialNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "오피셜 게시글을 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.post("", response_model=OfficialResponse, status_code=status.HTTP_201_CREATED)
async def create_official(
    payload: OfficialCreateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    doc = await official_service.create_official(payload, current_user.user_id)
    return _to_response(doc)


@router.patch("/{official_id}", response_model=OfficialResponse)
async def update_official(
    official_id: str,
    payload: OfficialUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await official_service.update_official(official_id, payload, current_user.user_id)
    except official_service.OfficialNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "오피셜 게시글을 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.delete("/{official_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_official(
    official_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        await official_service.delete_official(official_id, current_user.user_id)
    except official_service.OfficialNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "오피셜 게시글을 찾을 수 없습니다.") from exc
