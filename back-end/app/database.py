import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

mongo_client = AsyncIOMotorClient(settings.mongodb_uri)
redis_client = aioredis.Redis(
    host=settings.redis_host, port=settings.redis_port, decode_responses=True
)


def get_db(name: str):
    return mongo_client[name]
