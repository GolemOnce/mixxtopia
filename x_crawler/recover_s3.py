"""로컬 테스트용 LocalStack S3가 재시작으로 비워졌을 때, SQLite(data/archive.db)의
media 테이블을 기준으로 로컬 디스크 원본에서 재업로드해 복구한다.

LocalStack 3.0 커뮤니티 버전은 PERSISTENCE=1을 켜도 S3 상태를 실제로 디스크에
저장/복원하지 않는 것으로 확인됨(2026-10-10 기준 — 로그에 persist/restore 관련
기록이 전혀 없고 state/ 디렉터리가 계속 빈 채로 남음). 컨테이너 프로세스가 재시작될
때마다(WSL/Docker 재시작 등) 버킷이 통째로 사라지므로, 그때마다 이 스크립트로
재업로드하면 된다. Mongo의 photo_links/video_links URL은 키 구조가 그대로라 건드릴
필요 없음.

사용법(레포 루트 mixxtopia/에서):
    python -m x_crawler.recover_s3
"""

import sqlite3
from pathlib import Path

from . import s3_upload

BASE_DIR = Path(__file__).resolve().parent


def main() -> None:
    s3_upload.ensure_bucket()

    conn = sqlite3.connect(str(BASE_DIR / "data" / "archive.db"))
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT m.tweet_id, m.idx, m.local_path, t.username
        FROM media m JOIN tweets t ON t.id = m.tweet_id
        """
    ).fetchall()

    total = len(rows)
    uploaded = 0
    missing_local = []
    for i, row in enumerate(rows, start=1):
        local_path = Path(row["local_path"])
        if not local_path.exists():
            missing_local.append(str(local_path))
            continue
        key = f"{row['username']}/{row['tweet_id']}_{row['idx']}{local_path.suffix}"
        s3_upload.upload_file(local_path, key)
        uploaded += 1
        if i % 500 == 0:
            print(f"진행: {i}/{total}")

    print(
        f"완료: {uploaded}/{total}개 재업로드, 로컬에 없는 파일 {len(missing_local)}개"
    )
    if missing_local:
        print("로컬에 없는 파일 목록(최대 20개):")
        for p in missing_local[:20]:
            print(" ", p)


if __name__ == "__main__":
    main()
