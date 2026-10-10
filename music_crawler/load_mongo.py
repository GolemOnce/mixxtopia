#!/usr/bin/env python3
"""nmixx_songs_final.json(finalize.py 결과)을 mixxtopia의 music 컬렉션에 적재한다.

이 컬렉션은 아직 백엔드에 모델/스키마/API로 노출돼 있지 않다 — 음원사이트별 순위를
보여주는 기능(CLAUDE.md의 "메인 화면에서 현재 멜론/벅스/지니/플로/바이브/유튜브뮤직 등
주요 음원사이트에서 NMIXX 곡들의 순위 표시")을 만들 때, 곡마다 사이트별 코드(melon/
genie/bugs/flo/vibe)가 있어야 각 사이트에서 실시간 순위를 조회할 수 있어서 그 코드
수집 결과만 우선 넣어두는 것.

nmixx_songs.json(crawler.py 병합 결과) 자체엔 review.json에 걸린 노이즈(피아노 커버,
8-bit 리믹스, 노래방 버전 등)가 그대로 섞여 있어서, finalize.py로 한 번 걸러낸
nmixx_songs_final.json(= nmixx_songs.json - review.json 항목 + manual.json 항목)을
읽는다. 반드시 먼저 `python finalize.py`를 실행해서 최신 상태로 만들어둘 것.

nmixx_songs_final.json 전체를 기준으로 교체한다(기존 music 컬렉션 문서를 전부 지우고
다시 넣음) — 증분 삽입보다 "매번 통째로 교체"가 더 안전하고 단순하다.

사용법(music_crawler/ 안에서, 상대 임포트가 없어 -m 없이 바로 실행 가능):
    python load_mongo.py                 # 로컬 테스트 Mongo(localhost:27018)
    python load_mongo.py --mongo-uri mongodb+srv://...  # Atlas 등 다른 Mongo
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from pymongo import MongoClient

BASE = Path(__file__).resolve().parent
SONGS_FILE = BASE / "music" / "nmixx_songs_final.json"


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def main() -> None:
    ap = argparse.ArgumentParser(description="nmixx_songs.json을 Mongo music 컬렉션에 적재")
    ap.add_argument("--mongo-uri", default="mongodb://localhost:27018", help="Mongo 접속 URI")
    ap.add_argument("--db", default="mixxtopia", help="DB 이름")
    args = ap.parse_args()

    songs = json.loads(SONGS_FILE.read_text(encoding="utf-8"))

    client = MongoClient(args.mongo_uri)
    col = client[args.db]["music"]

    now = iso_now()
    docs = []
    for s in songs:
        docs.append({
            "_id": str(uuid4()),
            "song": s["song"],
            "album": s["album"],
            "artist": s["artist"],
            "duration": s.get("duration"),
            "melon": s.get("melon"),
            "genie": s.get("genie"),
            "bugs": s.get("bugs"),
            "flo": s.get("flo"),
            "vibe": s.get("vibe"),
            "created_at": now,
            "created_by": "auto",
            "updated_at": None,
            "updated_by": None,
            "deleted_at": None,
            "deleted_by": None,
        })

    deleted = col.delete_many({}).deleted_count
    col.insert_many(docs)
    col.create_index("song")

    print(f"기존 {deleted}건 삭제, {len(docs)}건 새로 적재 → {args.db}.music")


if __name__ == "__main__":
    main()
