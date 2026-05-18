from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import redis.asyncio as aioredis
import time
import json

import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("hashtag-api.env")

app = FastAPI()

#mongoDB
MONGODB_URI = os.environ["MONGODB_URI"]
mongo = AsyncIOMotorClient(MONGODB_URI)
db = mongo["hashtag"]
phrases_col = db["kyujin_26"]
clients_col = db["clients"]
stats_col = db["stats"]

#redis
r = aioredis.Redis(host="127.0.0.1", port=6379, decode_responses=True)
KEY_TOTAL = "hashtag:clicks:total"
KEY_CLIENTS = "hashtag:clients:set"
KEY_PHRASES = "hashtag:phrases"
KEY_PAIRS_COUNT = "hashtag:phrases:count"


@app.get("/api/phrases")
async def get_phrases():
    cached = await r.get(KEY_PHRASES)
    if cached:
        return json.loads(cached)
    doc = await phrases_col.find_one({"active": True}, {"_id": 0})
    if doc:
        await r.set(KEY_PHRASES, json.dumps(doc))
        await r.set(KEY_PAIRS_COUNT, len(doc.get("pairs", [])))
    return doc or {}

@app.post("/api/click")
async def click(req: Request):
    try:
        body = await req.json()
    except Exception:
        body = {}

    client_id = (body.get("clientId") or "").strip()
    total = await r.incr(KEY_TOTAL)

    if client_id:
        await r.sadd(KEY_CLIENTS, client_id)

    return JSONResponse({"ok": True, "total": int(total)})

@app.get("/api/stats")
async def stats():
    total = int(await r.get(KEY_TOTAL) or 0)
    unique_clients = int(await r.scard(KEY_CLIENTS) or 0)
    pairs_count = int(await r.get(KEY_PAIRS_COUNT) or 0)
    return {"totalClicks": total, "uniqueClients": unique_clients, "pairsCount": pairs_count, "ts": int(time.time())}
