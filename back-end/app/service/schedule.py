from uuid import UUID, uuid4

from pymongo import ReturnDocument

from app.model.base import utcnow
from app.model.schedule import Schedule, schedules_col
from app.schemas.schedule import ScheduleCreateRequest, ScheduleUpdateRequest


class ScheduleNotFoundError(Exception):
    pass


class InvalidTimeRangeError(Exception):
    pass


async def list_schedules(
    category: str | None = None,
    member: str | None = None,
) -> list[dict]:
    query: dict = {"deleted_at": None}
    if category is not None:
        query["category"] = category
    if member is not None:
        query["member"] = member

    return [doc async for doc in schedules_col.find(query).sort("start_at", 1)]


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
