#!/usr/bin/env python3
"""nmixx_songs.json(crawler.py 병합 결과)에서 review.json에 걸린 항목(5개 사이트 중
하나라도 못 찾은 것 — 피아노 커버/8-bit 리믹스/노래방 버전 등 노이즈가 섞여 있음)을
빼고, manual.json(review.json을 사람이 검토해서 살릴 건 살리고 보강한 결과)을 더해서
최종본을 만든다.

제외 비교는 song+album 텍스트만으로 하면 안 된다 — 원본 사이트 데이터 자체에 같은
곡이 중복으로 들어있는 경우(예: 멜론이 같은 트랙을 두 번 내놓는 경우), 완전히 매칭된
항목과 review.json에 걸린 불완전한 항목이 song+album 텍스트는 같고 사이트 코드만
다를 수 있어서, 텍스트만 비교하면 완성된 항목까지 같이 날아간다. 그래서 사이트 코드를
포함한 전체 필드가 review.json 항목과 정확히 같을 때만 제외한다.

사용법(music_crawler/ 안에서):
    python finalize.py
출력:
    nmixx_songs_final.json
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
MUSIC_DIR = BASE / "music"
FIELDS = ("song", "album", "artist", "duration", "melon", "genie", "bugs", "flo", "vibe")


def sig(d: dict) -> tuple:
    return tuple(d.get(f) for f in FIELDS)


def main() -> None:
    nmixx = json.loads((MUSIC_DIR / "nmixx_songs.json").read_text(encoding="utf-8"))
    review = json.loads((MUSIC_DIR / "review.json").read_text(encoding="utf-8"))
    manual = json.loads((MUSIC_DIR / "manual.json").read_text(encoding="utf-8"))

    review_sigs = {sig(r) for r in review}
    kept = [s for s in nmixx if sig(s) not in review_sigs]
    kept_sigs = {sig(s) for s in kept}

    # manual.json 중 review.json 항목을 보강하려던 게 아니라, 이미 kept에 있는
    # 완전매칭 항목과 전체 필드(사이트 코드 포함)가 똑같은 건 — 다수 사이트가 이미
    # 합의한 그룹을 그대로 베낀 것뿐이라 더할 게 없다(실제로 Caution/MEXE/오렌지
    # 마말레이드 건에서 발생 — review.json에 걸린 "소수파 표기" 그룹을 고치려던
    # 입력이었는데, 그 소수파 그룹은 지금 제외돼서 다수파 그룹과 완전히 겹침).
    added, skipped_dup = [], 0
    for m in manual:
        rec = {f: m.get(f) for f in FIELDS}
        if sig(rec) in kept_sigs:
            skipped_dup += 1
            continue
        added.append(rec)

    final = kept + added

    out = MUSIC_DIR / "nmixx_songs_final.json"
    out.write_text(json.dumps(final, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"nmixx_songs.json {len(nmixx)}건 - review.json {len(review)}건(정확매칭 제외) "
          f"= {len(kept)}건 + manual.json {len(manual)}건(완전중복 {skipped_dup}건 제외, "
          f"{len(added)}건 추가) = {len(final)}건 → {out.relative_to(BASE)}")


if __name__ == "__main__":
    main()
