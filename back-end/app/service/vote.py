from uuid import UUID, uuid4

from pymongo import ReturnDocument

from app.model.base import utcnow
from app.model.vote import Vote, votes_col
from app.schemas.vote import VoteCreateRequest, VoteUpdateRequest


class VoteNotFoundError(Exception):
    pass


class InvalidTimeRangeError(Exception):
    pass


async def list_votes(member: str | None = None, organizer: str | None = None) -> list[dict]:
    query: dict = {"deleted_at": None}
    if member is not None:
        query["member"] = member
    if organizer is not None:
        query["organizer"] = organizer

    return [doc async for doc in votes_col.find(query).sort("start_at", 1)]


async def get_vote(vote_id: str) -> dict:
    doc = await votes_col.find_one({"_id": vote_id, "deleted_at": None})
    if not doc:
        raise VoteNotFoundError()
    return doc


async def create_vote(payload: VoteCreateRequest, created_by: UUID) -> dict:
    if payload.start_at > payload.end_at:
        raise InvalidTimeRangeError()

    vote = Vote(
        vote_id=uuid4(),
        title=payload.title,
        content=payload.content,
        member=payload.member,
        link=payload.link,
        organizer=payload.organizer,
        start_at=payload.start_at,
        end_at=payload.end_at,
        created_by=created_by,
    )
    doc = vote.model_dump(mode="json")
    doc["_id"] = doc.pop("vote_id")
    await votes_col.insert_one(doc)
    return doc


async def update_vote(vote_id: str, payload: VoteUpdateRequest, updated_by: UUID) -> dict:
    if payload.start_at is not None and payload.end_at is not None:
        if payload.start_at > payload.end_at:
            raise InvalidTimeRangeError()

    updates = payload.model_dump(exclude_unset=True, mode="json")
    updates["updated_at"] = utcnow()
    updates["updated_by"] = str(updated_by)

    doc = await votes_col.find_one_and_update(
        {"_id": vote_id, "deleted_at": None},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise VoteNotFoundError()
    return doc


async def delete_vote(vote_id: str, deleted_by: UUID) -> None:
    doc = await votes_col.find_one_and_update(
        {"_id": vote_id, "deleted_at": None},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(deleted_by)}},
    )
    if not doc:
        raise VoteNotFoundError()
