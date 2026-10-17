from uuid import UUID, uuid4

from pymongo import ReturnDocument

from app.model.base import utcnow
from app.model.schedule import Schedule, schedules_col
from app.schemas.schedule import ScheduleCreateRequest, ScheduleUpdateRequest


class ScheduleNotFoundError(Exception):
    pass


class InvalidTimeRangeError(Exception):
    pass


# year/month 등 아무 필터 없이 호출되는 경우(ScheduleNew.tsx의 카테고리 자동완성 등)를 대비한
# 상한선. 달력 뷰(연/월 필터)는 실제로 이 한도에 걸릴 만큼 한 달에 일정이 쌓이지 않는다.
MAX_LIST_LIMIT = 500


async def list_schedules(
    category: str | None = None,
    member: str | None = None,
    range_start: str | None = None,
    range_end_exclusive: str | None = None,
) -> list[dict]:
    query: dict = {"deleted_at": None}
    if category is not None:
        query["category"] = category
    if member is not None:
        query["member"] = member
    if range_start is not None and range_end_exclusive is not None:
        # 달력 뷰: 그 달과 "겹치는" 일정 전부(월을 걸친 일정도 포함) 가져온다.
        # start_at/end_at이 ISO 문자열로 저장돼 있어 문자열끼리 비교한다(router._month_range 참고).
        query["start_at"] = {"$lt": range_end_exclusive}
        query["end_at"] = {"$gte": range_start}

    return [
        doc async for doc in schedules_col.find(query).sort("start_at", 1).limit(MAX_LIST_LIMIT)
    ]


async def list_categories() -> list[str]:
    return await schedules_col.distinct("category", {"deleted_at": None})


async def get_schedule(schedule_id: str) -> dict:
    doc = await schedules_col.find_one({"_id": schedule_id, "deleted_at": None})
    if not doc:
        raise ScheduleNotFoundError()
    return doc


async def create_schedule(payload: ScheduleCreateRequest, created_by: UUID) -> dict:
    if payload.start_at > payload.end_at:
        raise InvalidTimeRangeError()

    schedule = Schedule(
        schedule_id=uuid4(),
        title=payload.title,
        content=payload.content,
        member=payload.member,
        category=payload.category,
        link=payload.link,
        organizer=payload.organizer,
        location=payload.location,
        start_at=payload.start_at,
        end_at=payload.end_at,
        created_by=created_by,
    )
    doc = schedule.model_dump(mode="json")
    doc["_id"] = doc.pop("schedule_id")
    # source_official_id가 unique+sparse 인덱스라서, None을 그대로 저장하면("명시적
    # null") sparse가 걸러주는 "필드 없음"과 달리 유니크 체크에 걸려 두 번째 수동 등록부터
    # E11000 중복키 에러로 500이 났다 — 필드 자체를 아예 빼서 sparse가 제대로 스킵하게 한다.
    if doc.get("source_official_id") is None:
        doc.pop("source_official_id", None)
    await schedules_col.insert_one(doc)
    return doc


async def update_schedule(
    schedule_id: str, payload: ScheduleUpdateRequest, updated_by: UUID
) -> dict:
    if payload.start_at is not None and payload.end_at is not None:
        if payload.start_at > payload.end_at:
            raise InvalidTimeRangeError()

    updates = payload.model_dump(exclude_unset=True, mode="json")
    updates["updated_at"] = utcnow()
    updates["updated_by"] = str(updated_by)

    doc = await schedules_col.find_one_and_update(
        {"_id": schedule_id, "deleted_at": None},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise ScheduleNotFoundError()
    return doc


async def delete_schedule(schedule_id: str, deleted_by: UUID) -> None:
    doc = await schedules_col.find_one_and_update(
        {"_id": schedule_id, "deleted_at": None},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(deleted_by)}},
    )
    if not doc:
        raise ScheduleNotFoundError()
