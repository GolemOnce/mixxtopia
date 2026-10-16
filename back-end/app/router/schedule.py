from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_roles
from app.model.user import User, UserRole
from app.schemas.schedule import ScheduleCreateRequest, ScheduleResponse, ScheduleUpdateRequest
from app.service import schedule as schedule_service

router = APIRouter(prefix="/api/schedules", tags=["schedule"])

_ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def _month_range(year: int, month: int) -> tuple[str, str]:
    """[이 달의 시작, 다음 달의 시작) 문자열 범위. start_at/end_at이 DB에 ISO 문자열로
    저장돼 있어(app.model.base의 mode="json" dump) datetime 객체가 아니라 같은 포맷의
    문자열로 비교해야 한다 — 그래야 사전식 비교가 시간 순서와 일치한다."""

    start = datetime(year, month, 1, tzinfo=timezone.utc)
    next_month = (
        datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        if month == 12
        else datetime(year, month + 1, 1, tzinfo=timezone.utc)
    )
    return start.strftime(_ISO_FORMAT), next_month.strftime(_ISO_FORMAT)


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
    category: str | None = None,
    member: str | None = None,
    year: int | None = None,
    month: int | None = None,
):
    range_start = range_end_exclusive = None
    if year is not None and month is not None:
        if not 1 <= month <= 12:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "month는 1~12 사이여야 합니다.")
        range_start, range_end_exclusive = _month_range(year, month)

    docs = await schedule_service.list_schedules(
        category=category,
        member=member,
        range_start=range_start,
        range_end_exclusive=range_end_exclusive,
    )
    return [_to_response(doc) for doc in docs]


@router.get("/categories", response_model=list[str])
async def list_schedule_categories():
    return await schedule_service.list_categories()


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
