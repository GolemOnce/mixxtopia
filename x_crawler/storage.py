import json
import sqlite3
from pathlib import Path

from .models import Media, Tweet

SCHEMA = """
CREATE TABLE IF NOT EXISTS tweets (
    id              TEXT PRIMARY KEY,
    username        TEXT NOT NULL,
    text            TEXT,
    created_at      TEXT NOT NULL,
    is_retweet      INTEGER,
    is_reply        INTEGER,
    quoted_id       TEXT,
    conversation_id TEXT,
    raw_json        TEXT,
    fetched_at      TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS media (
    tweet_id   TEXT,
    idx        INTEGER,
    type       TEXT,
    src_url    TEXT,
    local_path TEXT,
    PRIMARY KEY (tweet_id, idx)
);
CREATE TABLE IF NOT EXISTS crawl_state (
    username TEXT PRIMARY KEY,
    last_id  TEXT
);
"""


class Storage:
    def __init__(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(path)
        self.conn.executescript(SCHEMA)

    def get_last_id(self, username: str) -> int | None:
        row = self.conn.execute(
            "SELECT last_id FROM crawl_state WHERE username = ?", (username,)
        ).fetchone()
        return int(row[0]) if row else None

    def set_last_id(self, username: str, last_id: int) -> None:
        with self.conn:
            self.conn.execute(
                "INSERT INTO crawl_state (username, last_id) VALUES (?, ?) "
                "ON CONFLICT(username) DO UPDATE SET last_id = excluded.last_id",
                (username, str(last_id)),
            )

    def exists(self, tweet_id: str) -> bool:
        return self.conn.execute("SELECT 1 FROM tweets WHERE id = ?", (tweet_id,)).fetchone() is not None

    def save(self, t: Tweet, files: list[tuple[int, Media, Path]]) -> None:
        """트윗 + 미디어를 한 트랜잭션으로 저장."""
        with self.conn:
            self.conn.execute(
                "INSERT OR IGNORE INTO tweets "
                "(id, username, text, created_at, is_retweet, is_reply, quoted_id, conversation_id, raw_json) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (t.id, t.username, t.text, t.created_at.isoformat(), int(t.is_retweet),
                 int(t.is_reply), t.quoted_id, t.conversation_id,
                 json.dumps(t.raw, ensure_ascii=False)),
            )
            self.conn.executemany(
                "INSERT OR REPLACE INTO media (tweet_id, idx, type, src_url, local_path) VALUES (?, ?, ?, ?, ?)",
                [(t.id, i, m.type, m.url, str(p)) for i, m, p in files],
            )
