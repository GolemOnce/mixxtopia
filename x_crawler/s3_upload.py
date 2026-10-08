"""미디어를 S3(프로덕션) 또는 LocalStack(로컬 테스트, S3 호환 API)에 업로드.
boto3는 endpoint_url만 바꾸면 그대로 붙는다 — 엔드포인트 외엔 코드 차이 없음."""
import json
import logging
import mimetypes
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from . import env

log = logging.getLogger(__name__)

_client = None


def _s3():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=env.S3_ENDPOINT_URL,
            aws_access_key_id=env.S3_ACCESS_KEY,
            aws_secret_access_key=env.S3_SECRET_KEY,
            region_name=env.S3_REGION,
        )
    return _client


def ensure_bucket() -> None:
    """버킷이 없으면 만들고, 공개 읽기 정책 + CORS를 건다(이미 있어도 매번 다시 적용 —
    멱등적이라 비용이 거의 없고, 예전에 버킷만 만들고 CORS 없이 운영됐던 경우도 따라잡게 함).
    실제 S3+CloudFront에서는 버킷을 비공개로 두고 CloudFront OAC로 가리는 게 맞지만,
    로컬 테스트에서는 photo_link를 바로 브라우저로 열어볼 수 있어야 해서 공개로 둔다."""
    s3 = _s3()
    try:
        s3.head_bucket(Bucket=env.S3_BUCKET)
    except ClientError:
        s3.create_bucket(Bucket=env.S3_BUCKET)
        log.info("S3 버킷 생성: %s", env.S3_BUCKET)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{env.S3_BUCKET}/*",
            }
        ],
    }
    s3.put_bucket_policy(Bucket=env.S3_BUCKET, Policy=json.dumps(policy))

    # CORS 없으면 크롬의 ORB(Opaque Response Blocking)가 교차 출처 <video> 로딩을
    # net::ERR_BLOCKED_BY_ORB로 막아버린다(<img>는 더 관대해서 안 걸림) — 실제로 겪은 문제.
    s3.put_bucket_cors(
        Bucket=env.S3_BUCKET,
        CORSConfiguration={
            "CORSRules": [
                {
                    "AllowedOrigins": ["*"],
                    "AllowedMethods": ["GET", "HEAD"],
                    "AllowedHeaders": ["*"],
                    "MaxAgeSeconds": 3600,
                }
            ]
        },
    )
    log.info("S3 공개 읽기 정책 + CORS 설정 완료: %s", env.S3_BUCKET)


def upload_file(local_path: Path, key: str) -> str:
    """local_path를 key로 업로드하고 공개 URL을 반환.
    boto3.upload_file()은 Content-Type을 자동으로 안 붙여줘서(기본 binary/octet-stream),
    브라우저 <video>가 재생을 거부한다(<img>는 내용 보고 알아서 처리해서 상대적으로 관대함) —
    확장자로 추측해서 명시적으로 지정."""
    content_type = mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
    _s3().upload_file(
        str(local_path), env.S3_BUCKET, key, ExtraArgs={"ContentType": content_type}
    )
    return f"{env.S3_PUBLIC_BASE_URL}/{key}"
