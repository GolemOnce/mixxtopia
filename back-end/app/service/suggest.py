from uuid import UUID, uuid4

from pymongo import ReturnDocument

from app.model.base import utcnow
from app.model.suggest import Suggest, SuggestCategory, SuggestStatus, suggests_col
from app.schemas.suggest import SuggestCreateRequest


class SuggestNotFoundError(Exception):
    pass


async def list_suggests(
    category: SuggestCategory | None,
    status: SuggestStatus | None,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    query: dict = {"deleted_at": None}
    if category is not None:
        query["category"] = category.value
    if status is not None:
        query["status"] = status.value

    total = await suggests_col.count_documents(query)
    skip = (page - 1) * page_size
    docs = [
        doc
        async for doc in suggests_col.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    ]
    return docs, total


async def get_suggest(suggest_id: str) -> dict:
    """조회 시 pending 상태였다면 read로 전환한다(1회성 side effect)."""

    doc = await suggests_col.find_one({"_id": suggest_id, "deleted_at": None})
    if not doc:
        raise SuggestNotFoundError()

    if doc["status"] == SuggestStatus.pending.value:
        doc = await suggests_col.find_one_and_update(
            {"_id": suggest_id},
            {"$set": {"status": SuggestStatus.read.value, "updated_at": utcnow()}},
            return_document=ReturnDocument.AFTER,
        )
    return doc


async def create_suggest(payload: SuggestCreateRequest, created_by: UUID) -> dict:
    suggest = Suggest(
        suggest_id=uuid4(),
        category=SuggestCategory.suggestion,
        title=payload.title,
        content=payload.content,
        email=payload.email,
        created_by=created_by,
    )
    doc = suggest.model_dump(mode="json")
    doc["_id"] = doc.pop("suggest_id")
    await suggests_col.insert_one(doc)
    return doc


async def complete_suggest(suggest_id: str, actor_id: UUID) -> dict:
    doc = await suggests_col.find_one_and_update(
        {"_id": suggest_id, "deleted_at": None},
        {
            "$set": {
                "status": SuggestStatus.done.value,
                "updated_at": utcnow(),
                "updated_by": str(actor_id),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise SuggestNotFoundError()
    return doc
