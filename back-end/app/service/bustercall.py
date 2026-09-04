import json
import time

from app.database import redis_client
from app.model.bustercall import (
    KEY_CLIENTS,
    KEY_PAIRS_COUNT,
    KEY_PHRASES,
    KEY_TOTAL,
    phrases_col,
)


async def get_phrases() -> dict:
    cached = await redis_client.get(KEY_PHRASES)
    if cached:
        return json.loads(cached)
    doc = await phrases_col.find_one({"active": True}, {"_id": 0})
    if doc:
        await redis_client.set(KEY_PHRASES, json.dumps(doc))
        await redis_client.set(KEY_PAIRS_COUNT, len(doc.get("pairs", [])))
    return doc or {}


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
