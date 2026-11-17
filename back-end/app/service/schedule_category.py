import json
from uuid import UUID

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.database import redis_client
from app.model.base import utcnow
from app.model.schedule_category import (
    KEY_SCHEDULE_CATEGORIES,
    ScheduleCategory,
    schedule_categories_col,
)
from app.schemas.schedule_category import (
    ScheduleCategoryCreateRequest,
    ScheduleCategoryUpdateRequest,
)


class CategoryNotFoundError(Exception):
    pass


class CategoryAlreadyExistsError(Exception):
    pass


def _to_public(doc: dict) -> dict:
    return {
        "category_id": doc["_id"],
        "label": doc["label"],
        "color": doc["color"],
        "order": doc["order"],
    }


async def _invalidate_cache() -> None:
    await redis_client.delete(KEY_SCHEDULE_CATEGORIES)


async def list_categories() -> list[dict]:
    """일정 등록/수정마다 category_exists()로 조회되는 데이터라 캐싱한다. TTL 없이 두고
    추가/수정/삭제 시점에만 무효화한다(bustercall.py의 현재 캠페인 캐싱과 같은 방식)."""

    cached = await redis_client.get(KEY_SCHEDULE_CATEGORIES)
    if cached:
        return json.loads(cached)

    docs = [doc async for doc in schedule_categories_col.find().sort("order", 1)]
    categories = [_to_public(doc) for doc in docs]
    await redis_client.set(KEY_SCHEDULE_CATEGORIES, json.dumps(categories))
    return categories


async def category_exists(category_id: str) -> bool:
    categories = await list_categories()
    return any(c["category_id"] == category_id for c in categories)


async def create_category(payload: ScheduleCategoryCreateRequest, created_by: UUID) -> dict:
    last = await schedule_categories_col.find_one(sort=[("order", -1)])
    next_order = (last["order"] + 1) if last else 0

    category = ScheduleCategory(
        category_id=payload.category_id,
        label=payload.label,
        color=payload.color,
        order=next_order,
        created_by=created_by,
    )
    doc = category.model_dump(mode="json")
    doc["_id"] = doc.pop("category_id")
    try:
        await schedule_categories_col.insert_one(doc)
    except DuplicateKeyError as exc:
        raise CategoryAlreadyExistsError() from exc
    await _invalidate_cache()
    return doc


async def update_category(
    category_id: str, payload: ScheduleCategoryUpdateRequest, updated_by: UUID
) -> dict:
    updates = payload.model_dump(exclude_unset=True, mode="json")
    updates["updated_at"] = utcnow()
    updates["updated_by"] = str(updated_by)

    doc = await schedule_categories_col.find_one_and_update(
        {"_id": category_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise CategoryNotFoundError()
    await _invalidate_cache()
    return doc


async def delete_category(category_id: str) -> None:
    result = await schedule_categories_col.delete_one({"_id": category_id})
    if result.deleted_count == 0:
        raise CategoryNotFoundError()
    await _invalidate_cache()
