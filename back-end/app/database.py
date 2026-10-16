import boto3
import redis.asyncio as aioredis
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

# tz_aware=True가 없으면 BSON Date를 읽어올 때 타임존 정보 없는(naive) datetime으로
# 돌아와서, API 응답 JSON에 UTC 표시(Z/+00:00)가 안 붙어 프론트가 로컬시간으로 오인한다
# (access_logs.created_at처럼 모델을 거치지 않고 datetime 객체를 그대로 저장하는 필드에서
# 특히 문제가 됨 — 다른 도메인은 model_dump(mode="json")으로 문자열 저장이라 영향 없음).
mongo_client = AsyncIOMotorClient(settings.mongodb_uri, tz_aware=True)
redis_client = aioredis.Redis(
    host=settings.redis_host, port=settings.redis_port, decode_responses=True
)


def get_db(name: str):
    return mongo_client[name]


# 사진을 제외한 도메인 전용 mongo DB. model 파일에서 `from app.database import db`로 가져다 쓴다.
# bustercall은 기존 "hashtag" DB를 별도로 쓰므로 여기 포함하지 않는다.
db = get_db("mixxtopia")


def get_s3():
    """S3 클라이언트. EC2에서는 인스턴스 IAM 역할로 자동 인증되고,
    로컬 개발에서는 `aws configure`로 세팅한 자격증명을 그대로 사용한다."""

    return boto3.client("s3", region_name=settings.aws_region)
