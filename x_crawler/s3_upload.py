"""미디어를 S3(프로덕션) 또는 LocalStack(로컬 테스트, S3 호환 API)에 업로드.
boto3는 endpoint_url만 바꾸면 그대로 붙는다 — 엔드포인트 외엔 코드 차이 없음."""
import json
import logging
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
    """버킷이 없으면 만들고, 공개 읽기 정책을 건다.
    실제 S3+CloudFront에서는 버킷을 비공개로 두고 CloudFront OAC로 가리는 게 맞지만,
    로컬 테스트에서는 photo_link를 바로 브라우저로 열어볼 수 있어야 해서 공개로 둔다."""
    s3 = _s3()
    try:
        s3.head_bucket(Bucket=env.S3_BUCKET)
        return
    except ClientError:
        pass

    s3.create_bucket(Bucket=env.S3_BUCKET)
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
    log.info("S3 버킷 생성 + 공개 읽기 정책 설정: %s", env.S3_BUCKET)


def upload_file(local_path: Path, key: str) -> str:
    """local_path를 key로 업로드하고 공개 URL을 반환."""
    _s3().upload_file(str(local_path), env.S3_BUCKET, key)
    return f"{env.S3_PUBLIC_BASE_URL}/{key}"
