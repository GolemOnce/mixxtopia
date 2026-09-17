import json
import time
from uuid import UUID, uuid4

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.database import redis_client
from app.model.base import utcnow
from app.model.bustercall import (
    KEY_CLIENTS,
    KEY_PAIRS_COUNT,
    KEY_PHRASES,
    KEY_PHRASES_ID,
    KEY_TOTAL,
    Phrase,
    phrases_col,
)
from app.schemas.bustercall import BustercallCampaignCreateRequest, BustercallCampaignUpdateRequest


class CampaignAlreadyExistsError(Exception):
    pass


class CampaignNotFoundError(Exception):
    pass


def _to_public(doc: dict) -> dict:
    return {"pairs": doc["pairs"], "fixed2": doc["fixed2"], "fixed4": doc["fixed4"]}


async def _cache_current(doc: dict) -> None:
    await redis_client.set(KEY_PHRASES, json.dumps(_to_public(doc)))
    await redis_client.set(KEY_PHRASES_ID, doc["_id"])
    await redis_client.set(KEY_PAIRS_COUNT, len(doc.get("pairs", [])))


async def get_phrases() -> dict:
    cached = await redis_client.get(KEY_PHRASES)
    if cached:
        return json.loads(cached)

    doc = await phrases_col.find_one({"is_current": True, "deleted_at": None})
    if not doc:
        return {}

    await _cache_current(doc)
    return _to_public(doc)


async def list_campaigns() -> list[dict]:
    return [doc async for doc in phrases_col.find({"deleted_at": None}).sort("updated_at", -1)]


async def create_campaign(payload: BustercallCampaignCreateRequest, created_by: UUID) -> dict:
    """(category, detail, member) 조합이 이미 있으면 거절한다 — 관리자가 실수로 기존
    캠페인을 덮어쓰지 않도록, 바꾸고 싶으면 반드시 update_campaign(목록에서 선택)을 쓰게 한다.
    soft delete된 문서는 존재 체크에서 제외(같은 조합으로 재등록 가능)."""

    existing = await phrases_col.find_one(
        {
            "category": payload.category.value,
            "detail": payload.detail,
            "member": payload.member,
            "deleted_at": None,
        }
    )
    if existing:
        raise CampaignAlreadyExistsError()

    phrase = Phrase(
        phrases_id=uuid4(),
        category=payload.category,
        detail=payload.detail,
        member=payload.member,
        pairs=[list(pair) for pair in payload.pairs],
        fixed2=payload.fixed2,
        fixed4=payload.fixed4,
        is_current=True,
        created_by=created_by,
    )
    doc = phrase.model_dump(mode="json")
    doc["_id"] = doc.pop("phrases_id")

    await phrases_col.update_many({"is_current": True}, {"$set": {"is_current": False}})
    try:
        await phrases_col.insert_one(doc)
    except DuplicateKeyError as exc:
        raise CampaignAlreadyExistsError() from exc

    await _cache_current(doc)
    return doc


async def update_campaign(
    phrases_id: str, payload: BustercallCampaignUpdateRequest, updated_by: UUID
) -> dict:
    """기존 캠페인의 문구 내용만 수정하고 is_current로 전환한다. category/detail/member(식별자)는
    바꾸지 않는다 — 바꾸고 싶으면 새 캠페인으로 등록해야 한다."""

    doc = await phrases_col.find_one_and_update(
        {"_id": phrases_id, "deleted_at": None},
        {
            "$set": {
                "pairs": [list(pair) for pair in payload.pairs],
                "fixed2": payload.fixed2,
                "fixed4": payload.fixed4,
                "is_current": True,
                "updated_at": utcnow(),
                "updated_by": str(updated_by),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise CampaignNotFoundError()

    await phrases_col.update_many(
        {"is_current": True, "_id": {"$ne": phrases_id}}, {"$set": {"is_current": False}}
    )
    await _cache_current(doc)
    return doc


async def delete_campaign(phrases_id: str, deleted_by: UUID) -> None:
    """soft delete. 실수로 만든 캠페인이어도 데이터는 지우지 않고 deleted_at만 남긴다."""

    before = await phrases_col.find_one_and_update(
        {"_id": phrases_id, "deleted_at": None},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(deleted_by), "is_current": False}},
    )
    if not before:
        raise CampaignNotFoundError()

    if before.get("is_current"):
        await redis_client.delete(KEY_PHRASES, KEY_PHRASES_ID, KEY_PAIRS_COUNT)


async def record_click(client_id: str) -> int:
    total = await redis_client.incr(KEY_TOTAL)
    if client_id:
        await redis_client.sadd(KEY_CLIENTS, client_id)
    return int(total)


async def get_stats() -> dict:
    total = int(await redis_client.get(KEY_TOTAL) or 0)
    unique_clients = int(await redis_client.scard(KEY_CLIENTS) or 0)
    pairs_count = int(await redis_client.get(KEY_PAIRS_COUNT) or 0)
    return {
        "totalClicks": total,
        "uniqueClients": unique_clients,
        "pairsCount": pairs_count,
        "ts": int(time.time()),
    }
