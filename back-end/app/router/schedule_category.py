from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_roles
from app.model.user import User, UserRole
from app.schemas.schedule_category import (
    ScheduleCategoryCreateRequest,
    ScheduleCategoryResponse,
    ScheduleCategoryUpdateRequest,
)
from app.service import schedule_category as schedule_category_service

router = APIRouter(prefix="/api/schedule-categories", tags=["schedule-category"])


def _to_response(doc: dict) -> ScheduleCategoryResponse:
    return ScheduleCategoryResponse(
        category_id=doc["_id"],
        label=doc["label"],
        color=doc["color"],
        order=doc["order"],
    )


@router.get("", response_model=list[ScheduleCategoryResponse])
async def list_schedule_categories():
    # list_categories()는 캐시 적중 시 이미 _to_response와 같은 모양(category_id/label/
    # color/order)을 반환하므로 그대로 내려준다.
    return await schedule_category_service.list_categories()


@router.post("", response_model=ScheduleCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule_category(
    payload: ScheduleCategoryCreateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await schedule_category_service.create_category(payload, current_user.user_id)
    except schedule_category_service.CategoryAlreadyExistsError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 존재하는 종류입니다.") from exc
    return _to_response(doc)


@router.patch("/{category_id}", response_model=ScheduleCategoryResponse)
async def update_schedule_category(
    category_id: str,
    payload: ScheduleCategoryUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await schedule_category_service.update_category(
            category_id, payload, current_user.user_id
        )
    except schedule_category_service.CategoryNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "종류를 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule_category(
    category_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        await schedule_category_service.delete_category(category_id)
    except schedule_category_service.CategoryNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "종류를 찾을 수 없습니다.") from exc
