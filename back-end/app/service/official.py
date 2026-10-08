from uuid import UUID, uuid4

from pymongo import ReturnDocument

from app.model.base import utcnow
from app.model.official import Official, OfficialAccount, officials_col
from app.schemas.official import OfficialCreateRequest, OfficialUpdateRequest


class OfficialNotFoundError(Exception):
    pass


async def list_officials(
    account: OfficialAccount | None, page: int, page_size: int
) -> tuple[list[dict], int]:
    query: dict = {"deleted_at": None}
    if account is not None:
        query["account"] = account.value

    total = await officials_col.count_documents(query)
    skip = (page - 1) * page_size
    docs = [
        doc
        async for doc in officials_col.find(query).sort("posted_at", -1).skip(skip).limit(page_size)
    ]
    return docs, total


async def get_official_page(official_id: str, page_size: int) -> int:
    """list_officials와 같은 정렬(posted_at desc) 기준으로, 이 글이 몇 페이지에 있는지
    계산한다. posted_at이 ISO 문자열로 저장돼 있어 문자열 비교로도 시간 순서와 일치한다."""
    doc = await officials_col.find_one({"_id": official_id, "deleted_at": None})
    if not doc:
        raise OfficialNotFoundError()

    rank = await officials_col.count_documents(
        {"deleted_at": None, "posted_at": {"$gt": doc["posted_at"]}}
    )
    return rank // page_size + 1


async def get_official(official_id: str) -> dict:
    doc = await officials_col.find_one({"_id": official_id, "deleted_at": None})
    if not doc:
        raise OfficialNotFoundError()
    return doc


async def create_official(payload: OfficialCreateRequest, created_by: UUID) -> dict:
    official = Official(
        official_id=uuid4(),
        posted_at=payload.posted_at,
        account=payload.account,
        link=payload.link,
        title=payload.title,
        content=payload.content,
        photo_links=payload.photo_links,
        video_links=payload.video_links,
        created_by=created_by,
    )
    doc = official.model_dump(mode="json")
    doc["_id"] = doc.pop("official_id")
    await officials_col.insert_one(doc)
    return doc


async def update_official(
    official_id: str, payload: OfficialUpdateRequest, updated_by: UUID
) -> dict:
    updates = payload.model_dump(exclude_unset=True, mode="json")
    updates["updated_at"] = utcnow()
    updates["updated_by"] = str(updated_by)

    doc = await officials_col.find_one_and_update(
        {"_id": official_id, "deleted_at": None},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise OfficialNotFoundError()
    return doc


async def delete_official(official_id: str, deleted_by: UUID) -> None:
    doc = await officials_col.find_one_and_update(
        {"_id": official_id, "deleted_at": None},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(deleted_by)}},
    )
    if not doc:
        raise OfficialNotFoundError()
