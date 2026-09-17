from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_roles
from app.model.schedule import ScheduleCategory
from app.model.user import User, UserRole
from app.schemas.schedule import ScheduleCreateRequest, ScheduleResponse, ScheduleUpdateRequest
from app.service import schedule as schedule_service

router = APIRouter(prefix="/api/schedules", tags=["schedule"])


def _to_response(doc: dict) -> ScheduleResponse:
    return ScheduleResponse(
        schedule_id=doc["_id"],
        title=doc["title"],
        content=doc["content"],
        member=doc["member"],
        category=doc["category"],
        link=doc["link"],
        organizer=doc["organizer"],
        location=doc["location"],
        start_at=doc["start_at"],
        end_at=doc["end_at"],
    )


@router.get("", response_model=list[ScheduleResponse])
async def list_schedules(
    category: ScheduleCategory | None = None,
    member: str | None = None,
):
    docs = await schedule_service.list_schedules(category=category, member=member)
    return [_to_response(doc) for doc in docs]


@router.get("/{schedule_id}", response_model=ScheduleResponse)
async def get_schedule(schedule_id: str):
    try:
        doc = await schedule_service.get_schedule(schedule_id)
    except schedule_service.ScheduleNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "일정을 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.post("", response_model=ScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    payload: ScheduleCreateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await schedule_service.create_schedule(payload, current_user.user_id)
    except schedule_service.InvalidTimeRangeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "시작 시각은 종료 시각보다 빨라야 합니다."
        ) from exc
    return _to_response(doc)


@router.patch("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(
    schedule_id: str,
    payload: ScheduleUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await schedule_service.update_schedule(schedule_id, payload, current_user.user_id)
    except schedule_service.InvalidTimeRangeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "시작 시각은 종료 시각보다 빨라야 합니다."
        ) from exc
    except schedule_service.ScheduleNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "일정을 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        await schedule_service.delete_schedule(schedule_id, current_user.user_id)
    except schedule_service.ScheduleNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "일정을 찾을 수 없습니다.") from exc
