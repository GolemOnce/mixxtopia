#!/usr/bin/env python3
"""
NMIXX 음원 메타데이터 수집기 (멜론 / 지니 / 벅스 / 플로 / 바이브)

각 음원사이트의 '곡' 검색 결과를 Playwright로 수집하고, 곡+앨범 기준으로 병합한다.
노이즈(커버, MR, 타 아티스트 곡 등)는 걸러내지 않고 전부 포함한다.

설치:
    pip install playwright
    playwright install chromium

실행:
    python nmixx_crawler.py                     # 전체 수집 + 병합
    python nmixx_crawler.py --sites flo,vibe    # 일부 사이트만 다시 수집 (나머지는 raw/ 기존 결과 사용)
    python nmixx_crawler.py --merge-only        # 수집 없이 raw/ + manual.json 으로 병합만
    python nmixx_crawler.py --debug             # 사이트별 첫 화면 HTML/스크린샷을 debug/ 에 저장
    python nmixx_crawler.py --headless          # 브라우저 창 없이 실행 (차단될 수 있음)

출력:
    raw/<site>.json     사이트별 원본 수집 결과
    music/nmixx_songs.json    곡+앨범 기준 병합 결과
    music/review.json         일부 사이트에서만 발견된 항목 (수동 확인용)

수동 추가:
    manual.json 에 nmixx_songs.json 과 같은 형식으로 넣으면 병합할 때 반영된다.
    곡+앨범이 같은 항목이 이미 있으면 manual 값(null 이 아닌 것)으로 덮어쓰고, 없으면 새로 추가한다.

재생시간:
    멜론/지니/벅스 검색 목록에는 재생시간이 없어서, 플로/바이브에서 매칭된 값을 쓴다.
    둘 다 매칭 안 된 곡은 duration 이 null 이다.
"""

import argparse
import json
import re
import time
import unicodedata
import xml.etree.ElementTree as ET
from difflib import SequenceMatcher
from pathlib import Path
from urllib.parse import quote

SITES = ["melon", "genie", "bugs", "flo", "vibe"]
PAGE_DELAY = 1.5        # 페이지/스크롤 사이 대기(초). 줄이지 말 것
MAX_PAGES = 60          # 페이지네이션 안전장치
MAX_SCROLLS = 150       # 무한 스크롤 안전장치
STALE_LIMIT = 4         # 스크롤해도 새 곡이 안 늘어나는 횟수가 이만큼 되면 종료

BASE = Path(__file__).resolve().parent
RAW_DIR = BASE / "raw"
DEBUG_DIR = BASE / "debug"
MUSIC_DIR = BASE / "music"
OUT_FILE = MUSIC_DIR / "nmixx_songs.json"
REVIEW_FILE = MUSIC_DIR / "review.json"
MANUAL_FILE = MUSIC_DIR / "manual.json"


# ---------------------------------------------------------------------------
# 공통 유틸
# ---------------------------------------------------------------------------

def clean(s):
    if s is None:
        return ""
    s = unicodedata.normalize("NFKC", str(s))
    return re.sub(r"\s+", " ", s).strip()


def clean_title(s):
    s = clean(s)
    # 지니 등에서 제목 앞에 붙는 배지 텍스트 제거
    return re.sub(r"^(TITLE|타이틀|19금|19)\s+", "", s, flags=re.I)


def fmt_duration(v):
    if v in (None, ""):
        return None
    if isinstance(v, (int, float)) or str(v).strip().isdigit():
        sec = int(v)
        if sec > 36000:          # 밀리초로 온 경우
            sec //= 1000
        return f"{sec // 60}:{sec % 60:02d}"
    m = re.match(r"^(?:(\d+):)?(\d{1,2}):(\d{2})$", str(v).strip())
    if m:
        minutes = int(m.group(2)) + int(m.group(1) or 0) * 60
        return f"{minutes}:{m.group(3)}"
    return clean(v) or None


def dump(page, site, tag):
    DEBUG_DIR.mkdir(exist_ok=True)
    try:
        (DEBUG_DIR / f"{site}_{tag}.html").write_text(page.content(), encoding="utf-8")
        page.screenshot(path=str(DEBUG_DIR / f"{site}_{tag}.png"), full_page=True)
        print(f"  [{site}] debug/{site}_{tag}.html / .png 저장")
    except Exception as e:
        print(f"  [{site}] debug 저장 실패: {e}")


def normalize_rows(site, rows):
    out, seen = [], set()
    for r in rows:
        rid = clean(r.get("id"))
        song = clean_title(r.get("song"))
        if not rid or not song or rid in seen:
            continue
        seen.add(rid)
        out.append({
            "site": site,
            "id": rid,
            "song": song,
            "album": clean(r.get("album")),
            "artist": clean(r.get("artist")),
            "duration": fmt_duration(r.get("duration")),
        })
    return out


# ---------------------------------------------------------------------------
# 멜론 / 지니 / 벅스 : 페이지네이션 목록에서 DOM 파싱
#   selector 가 바뀌면 이 JS 만 고치면 된다. (--debug 로 HTML 저장해서 확인)
# ---------------------------------------------------------------------------

MELON_JS = r"""
() => {
  const uniq = a => [...new Set(a.map(s => (s || '').trim()).filter(Boolean))];
  const out = [];
  document.querySelectorAll('#frm_defaultList tbody tr, #pageList tbody tr').forEach(tr => {
    const html = tr.innerHTML;
    let id = tr.querySelector('input[type=checkbox]')?.value || '';
    if (!/^\d+$/.test(id)) {
      const m = html.match(/goSongDetail\(\s*'?(\d+)'?\s*\)/) ||
                html.match(/playSong\([^,]*,\s*'?(\d+)'?\s*\)/);
      id = m ? m[1] : '';
    }
    if (!id) return;
    const titleEl = tr.querySelector('a.fc_gray') ||
                    tr.querySelector('a[href*="playSong"]');
    const artists = uniq([...tr.querySelectorAll('a[href*="goArtistDetail"]')].map(a => a.textContent));
    const album = tr.querySelector('a[href*="goAlbumDetail"]')?.textContent || '';
    out.push({id, song: titleEl ? titleEl.textContent : '', artist: artists.join(', '), album});
  });
  return out;
}
"""

GENIE_JS = r"""
() => {
  const uniq = a => [...new Set(a.map(s => (s || '').trim()).filter(Boolean))];
  const out = [];
  document.querySelectorAll('tr.list, tr[songid]').forEach(tr => {
    let id = tr.getAttribute('songid') || '';
    if (!id) {
      const m = tr.innerHTML.match(/fnPlaySong\(\s*'(\d+)'/) || tr.innerHTML.match(/xgnm=(\d+)/);
      id = m ? m[1] : '';
    }
    if (!id) return;
    let song = '';
    const t = tr.querySelector('a.title');
    if (t) {
      const c = t.cloneNode(true);
      c.querySelectorAll('[class*="icon"]').forEach(e => e.remove());
      song = c.textContent;
    }
    const artists = uniq([...tr.querySelectorAll('a.artist')].map(a => a.textContent));
    const album = tr.querySelector('a.albumtitle')?.textContent || '';
    out.push({id, song, artist: artists.join(', '), album});
  });
  return out;
}
"""

BUGS_JS = r"""
() => {
  const uniq = a => [...new Set(a.map(s => (s || '').trim()).filter(Boolean))];
  const out = [];
  document.querySelectorAll('table.trackList tbody tr, tr[trackid]').forEach(tr => {
    let id = tr.getAttribute('trackid') || '';
    if (!id) {
      const m = tr.innerHTML.match(/\/track\/(\d+)/);
      id = m ? m[1] : '';
    }
    if (!id) return;
    const t = tr.querySelector('p.title a') || tr.querySelector('p.title');
    const artists = uniq([...tr.querySelectorAll('p.artist a')]
      .filter(a => !/more|btn/.test(a.className))
      .map(a => a.textContent))
      .filter(s => s !== '외');
    const album = tr.querySelector('a.album')?.textContent || '';
    out.push({id, song: t ? (t.getAttribute('title') || t.textContent) : '', artist: artists.join(', '), album});
  });
  return out;
}
"""

PAGED_SITES = {
    "melon": {
        "url": "https://www.melon.com/search/song/index.htm?q={q}&section=&searchGnbYn=Y&kkoSpl=N&kkoDpType=",
        "pager": "#pageObjNavgation, .page_wrap",
        "js": MELON_JS,
    },
    "genie": {
        "url": "https://www.genie.co.kr/search/searchSong?query={q}",
        "pager": ".page-nav, .paging",
        "js": GENIE_JS,
    },
    "bugs": {
        "url": "https://music.bugs.co.kr/search/track?q={q}",
        "pager": ".paging, .pagination",
        "js": BUGS_JS,
    },
}


def goto_next_page(page, pager_sel, target):
    pager = page.locator(pager_sel).first
    if pager.count() == 0:
        return False
    link = pager.locator("a", has_text=re.compile(rf"^\s*{target}\s*$"))
    if link.count() == 0:
        # 페이지 번호 블록의 끝이면 '다음' 버튼
        link = pager.locator("a[class*='next'], button[class*='next']")
    if link.count() == 0:
        return False
    try:
        link.first.click(timeout=5000)
    except Exception:
        return False
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(1000)
    return True


def collect_paged(ctx, site, query, debug):
    cfg = PAGED_SITES[site]
    page = ctx.new_page()
    page.goto(cfg["url"].format(q=quote(query)), wait_until="domcontentloaded")
    page.wait_for_timeout(2500)

    results, seen = [], set()
    for n in range(1, MAX_PAGES + 1):
        rows = page.evaluate(cfg["js"])
        if n == 1 and (debug or not rows):
            dump(page, site, "p1")
            if not rows:
                print(f"  [{site}] 첫 페이지에서 곡을 못 찾음 → selector 확인 필요 (debug/ 참고)")
        new = [r for r in rows if r.get("id") and r["id"] not in seen]
        if not new:
            break
        for r in new:
            seen.add(r["id"])
            results.append(r)
        print(f"  [{site}] {n}페이지 +{len(new)} (누적 {len(results)})")
        time.sleep(PAGE_DELAY)
        if not goto_next_page(page, cfg["pager"], n + 1):
            break

    page.close()
    return normalize_rows(site, results)


# ---------------------------------------------------------------------------
# 플로 / 바이브 : 무한 스크롤 + 내부 API 응답 가로채기
#   응답 구조가 바뀌어도 '곡처럼 생긴 객체'를 재귀로 찾기 때문에 비교적 튼튼하다.
# ---------------------------------------------------------------------------

def iter_dicts(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from iter_dicts(v)
    elif isinstance(o, list):
        for v in o:
            yield from iter_dicts(v)


def names(v, key):
    if isinstance(v, dict):
        v = [v]
    if not isinstance(v, list):
        return []
    return [clean(x.get(key)) for x in v if isinstance(x, dict) and x.get(key)]


def flo_tracks(body):
    data = json.loads(body)
    for d in iter_dicts(data):
        if "id" in d and "name" in d and isinstance(d.get("album"), dict) \
                and ("artistList" in d or "representationArtist" in d):
            artists = names(d.get("artistList"), "name") or names(d.get("representationArtist"), "name")
            yield {
                "id": str(d["id"]),
                "song": d.get("name"),
                "album": d["album"].get("title", ""),
                "artist": ", ".join(dict.fromkeys(artists)),
                "duration": d.get("playTime"),
            }


def vibe_tracks(body):
    body = body.strip()
    if body.startswith("<"):
        root = ET.fromstring(body)
        for t in root.iter("track"):
            tid, title = t.findtext("trackId"), t.findtext("trackTitle")
            if not tid or not title:
                continue
            artists = [a.findtext("artistName") for a in t.findall("./artists/artist")]
            yield {
                "id": tid,
                "song": title,
                "album": t.findtext("./album/albumTitle") or "",
                "artist": ", ".join(dict.fromkeys(a for a in artists if a)),
                "duration": t.findtext("playTime"),
            }
        return
    data = json.loads(body)
    for d in iter_dicts(data):
        if "trackId" in d and "trackTitle" in d:
            album = d.get("album") if isinstance(d.get("album"), dict) else {}
            artists = names(d.get("artists"), "artistName") or names(d.get("artist"), "artistName")
            yield {
                "id": str(d["trackId"]),
                "song": d.get("trackTitle"),
                "album": album.get("albumTitle", ""),
                "artist": ", ".join(dict.fromkeys(artists)),
                "duration": d.get("playTime"),
            }


SCROLL_SITES = {
    "flo": {
        "url": "https://www.music-flo.com/search/track?keyword={q}&sortType=ACCURACY",
        "url_filter": "search",
        "parser": flo_tracks,
    },
    "vibe": {
        "url": "https://vibe.naver.com/search/tracks?query={q}",
        "url_filter": "search",
        "parser": vibe_tracks,
        # 검색 결과 페이지에 곡/앨범/아티스트 등 섹션마다 "더보기"가 따로 있어서
        # 범용 선택자로 찾으면 곡 섹션이 아닌 엉뚱한 "더보기"를 눌러 더 이상 안 불러와진다
        # (실제로 100곡에서 멈추는 문제로 발견됨 — 곡 섹션은 .track_section 안의 "더보기").
        "more_selector": ".track_section a:has-text('더보기'), .track_section button:has-text('더보기')",
    },
}


def collect_scroll(ctx, site, query, debug):
    cfg = SCROLL_SITES[site]
    page = ctx.new_page()
    pending, found = [], {}

    def on_response(resp):
        # 핸들러 안에서는 body 를 읽지 않고 모아두기만 한다 (sync API 데드락 방지)
        if resp.request.resource_type in ("xhr", "fetch") and cfg["url_filter"] in resp.url:
            pending.append(resp)

    def drain():
        while pending:
            resp = pending.pop(0)
            try:
                body = resp.text()
                for r in cfg["parser"](body):
                    found.setdefault(r["id"], r)
            except Exception:
                continue

    page.on("response", on_response)
    page.goto(cfg["url"].format(q=quote(query)), wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    drain()
    if debug:
        dump(page, site, "p1")

    last, stale = -1, 0
    for i in range(MAX_SCROLLS):
        page.mouse.move(700, 600)
        page.mouse.wheel(0, 4000)
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(int(PAGE_DELAY * 1000))
        more = page.locator(cfg.get("more_selector", "button:has-text('더보기'), a:has-text('더보기')"))
        try:
            if more.count() and more.first.is_visible():
                more.first.click(timeout=3000)
                page.wait_for_timeout(1000)
        except Exception:
            pass
        drain()
        n = len(found)
        if n != last:
            print(f"  [{site}] 스크롤 {i + 1}: 누적 {n}")
        stale = stale + 1 if n == last else 0
        last = n
        if stale >= STALE_LIMIT:
            break

    if not found:
        dump(page, site, "p1")
        print(f"  [{site}] API 응답에서 곡을 못 찾음 → url_filter/파서 확인 필요 (debug/ 참고)")
    page.close()
    return normalize_rows(site, list(found.values()))


def collect(ctx, site, query, debug):
    if site in PAGED_SITES:
        return collect_paged(ctx, site, query, debug)
    return collect_scroll(ctx, site, query, debug)


# ---------------------------------------------------------------------------
# 병합 : 곡+앨범 기준
# ---------------------------------------------------------------------------

FEAT_RE = re.compile(r"[\(\[]\s*(feat\.?|ft\.?|with|prod\.?)\b[^\)\]]*[\)\]]", re.I)
KEEP_RE = re.compile(r"[^0-9a-z぀-ヿ㐀-鿿가-힣]")


def norm(s, drop_feat=False):
    s = unicodedata.normalize("NFKC", s or "").lower()
    if drop_feat:
        s = FEAT_RE.sub("", s)
    return KEEP_RE.sub("", s)


def album_similar(a, b):
    if not a or not b:
        return False
    if a == b or a in b or b in a:
        return True
    return SequenceMatcher(None, a, b).ratio() >= 0.85


def merge(raw, manual):
    groups, index = [], {}

    def find_group(site, sk, ak):
        cands = index.get(sk, [])
        for g in cands:
            if g["album_key"] == ak and site not in g["ids"]:
                return g
        for g in cands:
            if site not in g["ids"] and album_similar(g["album_key"], ak):
                return g
        return None

    for site in SITES:  # 이 순서가 곡명/앨범명/아티스트 표기 우선순위 (멜론 우선)
        for r in raw.get(site, []):
            sk, ak = norm(r["song"], True), norm(r["album"])
            if not sk:
                continue
            g = find_group(site, sk, ak)
            if g is None:
                g = {"song_key": sk, "album_key": ak, "song": "", "album": "",
                     "artist": "", "duration": None, "ids": {}}
                groups.append(g)
                index.setdefault(sk, []).append(g)
            g["ids"][site] = r["id"]
            for f in ("song", "album", "artist"):
                if not g[f] and r.get(f):
                    g[f] = r[f]
            if not g["duration"] and r.get("duration"):
                g["duration"] = fmt_duration(r["duration"])

    for m in manual:
        sk, ak = norm(m.get("song"), True), norm(m.get("album"))
        g = next((g for g in index.get(sk, []) if g["album_key"] == ak), None)
        if g is None:
            g = {"song_key": sk, "album_key": ak, "song": "", "album": "",
                 "artist": "", "duration": None, "ids": {}}
            groups.append(g)
            index.setdefault(sk, []).append(g)
        for f in ("song", "album", "artist"):
            if m.get(f):
                g[f] = clean(m[f])
        if m.get("duration"):
            g["duration"] = fmt_duration(m["duration"])
        for s in SITES:
            if m.get(s):
                g["ids"][s] = str(m[s])

    songs, review = [], []
    for g in sorted(groups, key=lambda g: (g["album"].lower(), g["song"].lower())):
        rec = {"song": g["song"], "album": g["album"], "artist": g["artist"],
               "duration": g["duration"]}
        rec.update({s: g["ids"].get(s) for s in SITES})
        songs.append(rec)
        missing = [s for s in SITES if s not in g["ids"]]
        if missing:
            review.append({**rec, "missing": missing})
    return songs, review


# ---------------------------------------------------------------------------

def load_json(path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def main():
    ap = argparse.ArgumentParser(description="NMIXX 음원 메타데이터 수집기")
    ap.add_argument("--query", default="nmixx", help="검색어 (기본: nmixx)")
    ap.add_argument("--sites", default=",".join(SITES), help="수집할 사이트, 쉼표 구분")
    ap.add_argument("--headless", action="store_true", help="브라우저 창 없이 실행")
    ap.add_argument("--merge-only", action="store_true", help="수집 없이 병합만")
    ap.add_argument("--debug", action="store_true", help="첫 화면 HTML/스크린샷 저장")
    args = ap.parse_args()

    sites = [s.strip().lower() for s in args.sites.split(",") if s.strip()]
    bad = [s for s in sites if s not in SITES]
    if bad:
        ap.error(f"알 수 없는 사이트: {bad} (가능: {SITES})")

    if not args.merge_only:
        from playwright.sync_api import sync_playwright
        RAW_DIR.mkdir(exist_ok=True)
        with sync_playwright() as pw:
            ctx = pw.chromium.launch_persistent_context(
                str(BASE / ".pw-profile"),
                headless=args.headless,
                locale="ko-KR",
                viewport={"width": 1400, "height": 1000},
            )
            try:
                for site in sites:
                    print(f"[{site}] 수집 시작")
                    try:
                        rows = collect(ctx, site, args.query, args.debug)
                    except Exception as e:
                        print(f"[{site}] 실패: {e}")
                        continue
                    (RAW_DIR / f"{site}.json").write_text(
                        json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
                    print(f"[{site}] {len(rows)}곡 → raw/{site}.json")
            finally:
                ctx.close()

    raw = {s: load_json(RAW_DIR / f"{s}.json", []) for s in SITES}
    manual = load_json(MANUAL_FILE, [])
    songs, review = merge(raw, manual)

    MUSIC_DIR.mkdir(exist_ok=True)
    OUT_FILE.write_text(json.dumps(songs, ensure_ascii=False, indent=2), encoding="utf-8")
    REVIEW_FILE.write_text(json.dumps(review, ensure_ascii=False, indent=2), encoding="utf-8")

    print()
    print("사이트별 원본:", ", ".join(f"{s} {len(raw[s])}" for s in SITES))
    print(f"병합 결과: {len(songs)}건 → {OUT_FILE.relative_to(BASE)}")
    print(f"5개 사이트 모두 매칭: {len(songs) - len(review)}건")
    print(f"일부 사이트 누락: {len(review)}건 → {REVIEW_FILE.relative_to(BASE)}")


if __name__ == "__main__":
    main()