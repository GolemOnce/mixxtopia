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
    # category/detail/member까지 내려줘야 프론트에서 "{멤버이름} {종류} 해시태그 총공
    # 원클릭" 제목을 조립할 수 있다(생일=member, 컴백/n주년=detail — member는 그
    # 둘에서 항상 "nmixx"라 제목에 못 씀. docs/db-schema.md 참고).
    return {
        "pairs": doc["pairs"],
        "fixed2": doc["fixed2"],
        "fixed4": doc["fixed4"],
        "category": doc["category"],
        "detail": doc["detail"],
        "member": doc["member"],
    }


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


async def _archive_stats_if_switching(exclude_id: str) -> None:
    """is_current였던 캠페인이 exclude_id와 다를 때만(=진짜 다른 캠페인으로 전환할 때만)
    Redis 집계를 그 캠페인 문서에 영구 저장하고 카운터를 리셋한다. 같은 캠페인을 계속
    현재로 유지한 채 문구만 고치는 경우(진행 중 템플릿 추가 등)는 건드리지 않는다.

    "진행 중인 캠페인은 끝나기 전에 전환하지 않는다"는 운영 규칙을 전제로 한다 — 이
    전제가 깨지면(테스트 전환 등) 재전환 시 이전 집계가 덮어써질 수 있음을 감수한다."""

    previous = await phrases_col.find_one({"is_current": True, "deleted_at": None})
    if not previous or previous["_id"] == exclude_id:
        return

    total = int(await redis_client.get(KEY_TOTAL) or 0)
    unique_clients = int(await redis_client.scard(KEY_CLIENTS) or 0)
    await phrases_col.update_one(
        {"_id": previous["_id"]},
        {"$set": {"total_clicks": total, "unique_clients": unique_clients, "synced_at": utcnow()}},
    )
    await redis_client.delete(KEY_TOTAL, KEY_CLIENTS)


async def create_campaign(payload: BustercallCampaignCreateRequest, created_by: UUID) -> dict:
    """(category, detail, member) 조합이 이미 있으면 거절한다 — 관리자가 실수로 기존
    캠페인을 덮어쓰지 않도록, 바꾸고 싶으면 반드시 update_campaign(목록에서 선택)을 쓰게 한다.
    soft delete된 문서는 존재 체크에서 제외(같은 조합으로 재등록 가능).

    새로 만든 캠페인은 is_current=False(초안)로 저장된다 — 템플릿 추가가 곧바로 라이브
    전환으로 이어지면 안 되므로, 실제로 "현재 캠페인"으로 전환하려면 목록에서 선택해
    update_campaign으로 저장해야 한다."""

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
        is_current=False,
        created_by=created_by,
    )
    doc = phrase.model_dump(mode="json")
    doc["_id"] = doc.pop("phrases_id")

    try:
        await phrases_col.insert_one(doc)
    except DuplicateKeyError as exc:
        raise CampaignAlreadyExistsError() from exc

    return doc


async def update_campaign(
    phrases_id: str, payload: BustercallCampaignUpdateRequest, updated_by: UUID
) -> dict:
    """기존 캠페인의 문구 내용만 수정하고 is_current로 전환한다. category/detail/member(식별자)는
    바꾸지 않는다 — 바꾸고 싶으면 새 캠페인으로 등록해야 한다.

    이 함수가 "현재 캠페인"으로 전환되는 유일한 지점이라, 다른 캠페인에서 전환해오는
    경우에만 그 이전 캠페인의 Redis 집계를 아카이브+리셋한다(_archive_stats_if_switching)."""

    await _archive_stats_if_switching(phrases_id)

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
