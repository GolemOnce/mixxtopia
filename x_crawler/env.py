"""로컬 테스트용 설정. .env는 .gitignore에 걸려 있음(.env.example 참고).
mixxtopia 백엔드가 Atlas/실S3를 쓰는 것과 분리된, x_crawler 전용 설정이다."""
import os
from pathlib import Path

from dotenv import load_dotenv

# load_dotenv()는 cwd에서 "위로" 올라가며 찾아서, 레포 루트(python -m x_crawler.main)에서
# 실행하면 x_crawler/.env를 못 찾는다 — 이 파일 위치 기준으로 명시적으로 지정.
load_dotenv(Path(__file__).resolve().parent / ".env")

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27018")
MONGODB_DB = os.environ.get("MONGODB_DB", "mixxtopia")

# 빈 문자열("")로 지정하면 LocalStack이 아닌 실제 AWS S3를 쓰겠다는 뜻이므로, boto3가
# 받아들이는 None으로 바꿔준다(빈 문자열 그대로 넘기면 "Invalid endpoint" 에러가 난다).
S3_ENDPOINT_URL = os.environ.get("S3_ENDPOINT_URL", "http://localhost:4566") or None
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "test")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "test")
S3_REGION = os.environ.get("S3_REGION", "ap-northeast-2")
S3_BUCKET = os.environ.get("S3_BUCKET", "mixxtopia-media")
# 프로덕션에서는 CloudFront 도메인으로 교체. 로컬은 LocalStack을 path-style로 그대로 공개 노출.
# .env.example처럼 빈 문자열로 둔 경우도 "안 정해짐"으로 취급해서 기본값을 쓴다
# (os.environ.get의 fallback은 키가 아예 없을 때만 적용되고 빈 문자열엔 안 먹어서).
S3_PUBLIC_BASE_URL = os.environ.get("S3_PUBLIC_BASE_URL") or f"{S3_ENDPOINT_URL}/{S3_BUCKET}"
