"""크롤링한 트윗을 mixxtopia의 officials 컬렉션에 직접 적재.
docs/api-spec.md 정책대로 HTTP API(POST /api/officials)를 거치지 않고 DB에 바로 쓴다
(created_by="auto" — app.model.official.Official.created_by가 UUID | str인 이유).

문서 형태는 app/service/official.py의 create_official()이 만드는 것과 동일해야
백엔드가 그대로 읽을 수 있다 — 특히 날짜는 datetime 객체가 아니라 Pydantic의
model_dump(mode="json")과 같은 포맷의 ISO 문자열로 넣어야 한다(다른 도메인도 전부
문자열로 저장돼 있어서, 날짜 범위 비교·정렬이 타입 불일치로 깨짐)."""
import logging
from datetime import datetime, timezone
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorClient

from . import env
from .models import Tweet

log = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None


def _officials_col():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(env.MONGODB_URI)
    return _client[env.MONGODB_DB]["officials"]


def _iso(dt: datetime) -> str:
    """app.model.base.BaseEntity가 Pydantic mode="json"으로 찍는 포맷과 맞춘다."""
    dt = dt.astimezone(timezone.utc)
    if dt.microsecond:
        return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def ensure_indexes() -> None:
    # source_tweet_id로 중복 체크(로컬 SQLite가 리셋돼도 Mongo 기준으로 또 막아준다)
    await _officials_col().create_index("source_tweet_id")


async def official_exists(tweet_id: str) -> bool:
    doc = await _officials_col().find_one({"source_tweet_id": tweet_id}, {"_id": 1})
    return doc is not None


async def insert_official(
    tweet: Tweet, official_account: str, title: str, content: str, photo_links: list[str]
) -> dict:
    doc = {
        "_id": str(uuid4()),
        "posted_at": _iso(tweet.created_at),
        "account": official_account,
        "link": f"https://x.com/{tweet.username}/status/{tweet.id}",
        "title": title[:100],
        "content": (content or "(본문 없음)")[:1000],
        "photo_links": photo_links[:4],  # app.model.official.Official과 동일하게 최대 4장
        "created_at": _iso(datetime.now(timezone.utc)),
        "created_by": "auto",
        "updated_at": None,
        "updated_by": None,
        "deleted_at": None,
        "deleted_by": None,
        # 중복 삽입 방지용 — officials 컬렉션 자체 스키마엔 없는 필드지만,
        # Official 모델은 알 수 없는 필드를 무시하므로(ConfigDict 기본값) 안전하게 같이 저장 가능.
        "source_tweet_id": tweet.id,
    }
    await _officials_col().insert_one(doc)
    return doc
