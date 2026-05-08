from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import redis
import time

import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("hashtag-api.env")

app = FastAPI()

#mongoDB
MONGODB_URI = os.environ["MONGODB_URI"]
mongo = AsyncIOMotorClient(MONGODB_URI)
db = mongo["hashtag"]
phrases_col = db["Heavy_Serenade"]
clients_col = db["clients"]
stats_col = db["stats"]

#redis
r = redis.Redis(host="127.0.0.1", port=6379, decode_responses=True)
KEY_TOTAL = "hashtag:clicks:total" # 
KEY_CLIENTS = "hashtag:clients:set"


@app.get("/api/phrases")
async def get_phrases():
    """
    Atlas에 저장된 active=true 문구 세트 1개를 반환
    """
    doc = await phrases_col.find_one({"active": True}, {"_id": 0})
    return doc or {}

@app.post("/api/click")
async def click(req: Request):
    """
    payload 예시:
      { "clientId": "uuid-string" }
    """
    try:
        body = await req.json()
    except Exception:
        body = {}

    client_id = (body.get("clientId") or "").strip()
    # 클릭 수 증가
    total = r.incr(KEY_TOTAL)

    # 고유 클라이언트 증가(가능하면)
    if client_id:
        r.sadd(KEY_CLIENTS, client_id)

    # 아주 가벼운 메타(원하면 더 저장 가능)
    # ip = req.client.host if req.client else None
    # ua = req.headers.get("user-agent")

    return JSONResponse({"ok": True, "total": int(total)})

@app.get("/api/stats")
def stats():
    total = int(r.get(KEY_TOTAL) or 0)
    unique_clients = int(r.scard(KEY_CLIENTS) or 0)
    return {"totalClicks": total, "uniqueClients": unique_clients, "ts": int(time.time())}
