#!/usr/bin/env python3
"""officials 컬렉션의 photo_links/video_links에 박혀있는 LocalStack URL
(기본값 http://localhost:4566/mixxtopia-media/...)을 실 S3/CloudFront 도메인으로
일괄 치환한다. s3_upload.py의 upload_file()이 URL을 "{S3_PUBLIC_BASE_URL}/{key}" 형태로
그대로 저장해두기 때문에, 접두사만 문자열 치환하면 된다(키 구조는 그대로 유지).

반드시 Atlas로 mongorestore를 먼저 끝낸 뒤, --mongo-uri에 그 Atlas 연결 문자열을 주고
실행할 것(이 스크립트는 LocalStack이 아니라 실제 운영 DB를 직접 수정함).

기본은 --dry-run처럼 "몇 건이 바뀔지"만 보여주고, --apply를 줘야 실제로 반영된다.

사용법(x_crawler/ 안에서):
    # 먼저 바뀔 건수만 확인
    python migrate_urls_to_s3.py --mongo-uri "mongodb+srv://..." \\
        --new-prefix "https://d111111abcdef8.cloudfront.net"

    # 실제 반영
    python migrate_urls_to_s3.py --mongo-uri "mongodb+srv://..." \\
        --new-prefix "https://d111111abcdef8.cloudfront.net" --apply
"""

import argparse

from pymongo import MongoClient


def _rewrite(urls: list[str], old_prefix: str, new_prefix: str) -> tuple[list[str], int]:
    changed = 0
    result = []
    for url in urls:
        if url.startswith(old_prefix):
            result.append(new_prefix + url[len(old_prefix) :])
            changed += 1
        else:
            result.append(url)
    return result, changed


def main() -> None:
    ap = argparse.ArgumentParser(
        description="officials의 미디어 URL을 S3/CloudFront 도메인으로 치환"
    )
    ap.add_argument("--mongo-uri", required=True, help="대상 Mongo 접속 URI(반드시 Atlas 쪽)")
    ap.add_argument("--db", default="mixxtopia", help="DB 이름")
    ap.add_argument(
        "--old-prefix",
        default="http://localhost:4566/mixxtopia-media",
        help="치환 대상이 될 기존 URL 접두사(LocalStack 기본값)",
    )
    ap.add_argument("--new-prefix", required=True, help="새 URL 접두사(예: CloudFront 도메인)")
    ap.add_argument("--apply", action="store_true", help="실제로 DB에 반영(기본은 미리보기만)")
    args = ap.parse_args()

    new_prefix = args.new_prefix.rstrip("/")

    client = MongoClient(args.mongo_uri)
    col = client[args.db]["officials"]

    docs_changed = 0
    links_changed = 0
    for doc in col.find(
        {"$or": [{"photo_links.0": {"$exists": True}}, {"video_links.0": {"$exists": True}}]}
    ):
        new_photo, n1 = _rewrite(doc.get("photo_links", []), args.old_prefix, new_prefix)
        new_video, n2 = _rewrite(doc.get("video_links", []), args.old_prefix, new_prefix)
        if n1 + n2 == 0:
            continue

        docs_changed += 1
        links_changed += n1 + n2
        tag = "적용" if args.apply else "미리보기"
        print(f"[{tag}] official_id={doc['_id']} 링크 {n1 + n2}개 변경")

        if args.apply:
            col.update_one(
                {"_id": doc["_id"]}, {"$set": {"photo_links": new_photo, "video_links": new_video}}
            )

    status = "반영 완료" if args.apply else "변경 예정(--apply로 실제 반영)"
    print(f"\n문서 {docs_changed}건, 링크 {links_changed}개 {status}")


if __name__ == "__main__":
    main()
