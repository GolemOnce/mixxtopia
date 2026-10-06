"""이미 SQLite(data/archive.db)에 저장된 트윗으로 data/posts/*.json을 다시 생성한다.
네트워크/미디어 재다운로드 전혀 없음 — formatter.py에 새 필드(post_type 등)가 추가됐을 때
이미 크롤링해둔 기존 글들에도 소급 적용하고 싶을 때 쓴다.

사용법(레포 루트 mixxtopia/에서):
    python -m x_crawler.regenerate_posts
"""
import sqlite3
from datetime import datetime
from pathlib import Path

import yaml

from .formatter import build_post, save_post
from .models import Media, Tweet

BASE_DIR = Path(__file__).resolve().parent


def main() -> None:
    cfg = yaml.safe_load((BASE_DIR / "config.yaml").read_text(encoding="utf-8"))
    labels = {a["username"]: a["label"] for a in cfg["accounts"]}

    conn = sqlite3.connect(str(BASE_DIR / cfg["db_path"]))
    conn.row_factory = sqlite3.Row

    tweet_rows = conn.execute("SELECT * FROM tweets").fetchall()
    regenerated = 0
    for row in tweet_rows:
        tweet = Tweet(
            id=row["id"],
            username=row["username"],
            text=row["text"] or "",
            created_at=datetime.fromisoformat(row["created_at"]),
            is_retweet=bool(row["is_retweet"]),
            is_reply=bool(row["is_reply"]),
            quoted_id=row["quoted_id"],
            conversation_id=row["conversation_id"],
        )
        media_rows = conn.execute(
            "SELECT idx, type, local_path FROM media WHERE tweet_id = ? ORDER BY idx",
            (row["id"],),
        ).fetchall()
        files = [
            (
                m["idx"],
                Media(type=m["type"], url="", ext=Path(m["local_path"]).suffix.lstrip(".")),
                Path(m["local_path"]),
            )
            for m in media_rows
        ]

        label = labels.get(tweet.username, tweet.username)
        post = build_post(tweet, files, label)
        save_post(post, BASE_DIR / cfg["post_dir"])
        regenerated += 1

    print(f"재생성 완료: {regenerated}개 (data/posts/*.json)")


if __name__ == "__main__":
    main()
