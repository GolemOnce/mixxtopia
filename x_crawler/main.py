"""실행(mixxtopia/ 레포 루트에서):
      python -m x_crawler.main                  (전체 계정 순차)
      python -m x_crawler.main --account WE_NMIXX  (계정 하나만 → cron으로 주기 따로 줄 때)"""
import argparse
import asyncio
import logging
import random
from pathlib import Path

import httpx
import yaml
from playwright.async_api import BrowserContext, async_playwright

from . import mongo_sync, s3_upload
from .browser import RateLimited, crawl_account
from .formatter import build_post, save_post
from .media import download_all
from .models import Tweet
from .storage import Storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("main")

# config.yaml/session/data 전부 x_crawler/ 기준 상대경로 — cwd가 레포 루트든 x_crawler/든
# 항상 같은 위치를 보게 한다(python -m x_crawler.main은 레포 루트에서 실행해야 하므로).
BASE_DIR = Path(__file__).resolve().parent


async def sync_to_mixxtopia(
    tweet: Tweet, files: list, official_account: str | None, title: str
) -> None:
    """officials 컬렉션에 바로 적재. 실패하면 호출부에서 store.save()를 건너뛰어
    다음 실행 때 이 트윗부터 다시 시도하게 한다(미디어 다운로드 실패 처리와 동일한 전략)."""
    if official_account is None:
        log.warning("config.yaml에 official_account가 없어 mixxtopia 동기화를 건너뜀")
        return
    if await mongo_sync.official_exists(tweet.id):
        return

    # 원본은 전부(사진+영상) S3에 올려서 로컬 디스크에만 의존하지 않게 한다.
    # officials.photo_links는 그중 사진 URL만(최대 4장 — X 자체 업로드 제한과 동일).
    photo_links = []
    for i, media, local_path in files:
        key = f"{tweet.username}/{tweet.id}_{i}.{media.ext}"
        url = s3_upload.upload_file(local_path, key)
        if media.type == "photo":
            photo_links.append(url)

    await mongo_sync.insert_official(tweet, official_account, title, tweet.text, photo_links[:4])


async def process_account(
    context: BrowserContext,
    http: httpx.AsyncClient,
    store: Storage,
    cfg: dict,
    acc: dict,
    backfill: bool = False,
    max_scrolls_override: int | None = None,
) -> None:
    username = acc["username"]
    sync_enabled = cfg.get("mixxtopia_sync", {}).get("enabled", False)
    last_id = store.get_last_id(username)
    # --backfill이면 last_id를 무시하고 처음부터 다시 훑는다(이미 받은 트윗은
    # store.exists()가 걸러주니 재다운로드/재업로드는 안 됨 — 더 과거 글만 새로 처리됨).
    crawl_since = None if backfill else last_id
    # or로 쓰면 --max-scrolls 0(=무제한)이 falsy라서 무시되고 config 기본값으로 빠지는
    # 버그가 생기므로 is not None으로 명시적으로 구분한다.
    if max_scrolls_override is not None:
        max_scrolls = max_scrolls_override
    else:
        max_scrolls = acc.get("max_scrolls", cfg["max_scrolls"])
    log.info("[%s] 시작 (last_id=%s, backfill=%s, max_scrolls=%d)", username, last_id, backfill, max_scrolls)

    tweets = await crawl_account(
        context, username, crawl_since,
        max_scrolls=max_scrolls,
        stall_limit=cfg["stall_limit"],
    )

    new_last_id = last_id
    saved = 0
    for t in tweets:  # 오래된 순
        skip = (t.is_retweet and not acc.get("include_retweets", False)) or \
               (t.is_reply and not acc.get("include_replies", False))
        if not skip and not store.exists(t.id):
            try:
                files = await download_all(t, BASE_DIR / cfg["media_dir"], http)
                post = build_post(t, files, acc["label"])
                if sync_enabled:
                    await sync_to_mixxtopia(t, files, acc.get("official_account"), post["title"])
            except Exception as e:
                # 실패 지점에서 멈춰야 다음 실행 때 이 트윗부터 다시 시도함
                # (미디어 다운로드 httpx 에러든, mongo_sync/s3_upload 에러든 전략은 동일)
                log.error("[%s] 처리 실패 %s: %s", username, t.id, e)
                break
            store.save(t, files)
            save_post(post, BASE_DIR / cfg["post_dir"])
            saved += 1
        new_last_id = int(t.id)

    if new_last_id is not None and new_last_id != last_id:
        store.set_last_id(username, new_last_id)
    log.info("[%s] 완료: 수집 %d / 저장 %d", username, len(tweets), saved)


async def run(
    only: str | None,
    guest: bool = False,
    backfill: bool = False,
    max_scrolls_override: int | None = None,
) -> None:
    cfg = yaml.safe_load((BASE_DIR / "config.yaml").read_text(encoding="utf-8"))
    accounts = [a for a in cfg["accounts"] if only is None or a["username"].lower() == only.lower()]
    if not accounts:
        raise SystemExit(f"config에 없는 계정: {only}")

    if cfg.get("mixxtopia_sync", {}).get("enabled", False):
        s3_upload.ensure_bucket()
        await mongo_sync.ensure_indexes()

    store = Storage(str(BASE_DIR / cfg["db_path"]))
    async with async_playwright() as p, httpx.AsyncClient(timeout=60, follow_redirects=True) as http:
        # save_session.py와 동일하게 자동화 탐지 신호를 줄여서, 저장된 세션으로 돌아다닐 때도
        # X가 "자동화된 브라우저"로 보고 더 자주 막거나 rate-limit 걸지 않게 한다.
        browser = await p.chromium.launch(
            headless=cfg["headless"], args=["--disable-blink-features=AutomationControlled"]
        )
        # --guest면 세션을 아예 안 실어서 로그아웃 상태(게스트)로 접속한다 — 공개 계정
        # 타임라인은 비로그인으로도 보이므로, "세션 쿠키 문제"와 "파서/엔드포인트 문제"를
        # 구분하는 용도로만 쓴다(실제 운영은 로그인 세션 기준).
        context = await browser.new_context(
            storage_state=None if guest else str(BASE_DIR / cfg["session_path"]),
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            viewport={"width": 1280, "height": 900},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
            ),
        )
        try:
            for i, acc in enumerate(accounts):
                if i > 0:
                    await asyncio.sleep(random.uniform(*cfg["account_delay_sec"]))
                try:
                    await process_account(
                        context, http, store, cfg, acc,
                        backfill=backfill, max_scrolls_override=max_scrolls_override,
                    )
                except RateLimited:
                    log.warning("rate limit → 남은 계정은 다음 실행으로 미룸")
                    break
            if not guest:
                await context.storage_state(path=str(BASE_DIR / cfg["session_path"]))  # 갱신된 쿠키 저장
        finally:
            await browser.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--account", help="이 계정만 실행")
    ap.add_argument(
        "--guest",
        action="store_true",
        help="로그인 세션 없이 게스트로 접속(진단용) — mixxtopia_sync는 하지 않는 게 안전하니 "
        "config.yaml의 mixxtopia_sync.enabled를 꺼두고 쓰는 걸 권장",
    )
    ap.add_argument(
        "--backfill",
        action="store_true",
        help="last_id 무시하고 처음부터 다시 훑기(이미 받은 트윗은 재처리 안 됨). "
        "--max-scrolls랑 같이 써서 한 번에 더 멀리까지 긁을 때 사용",
    )
    ap.add_argument(
        "--max-scrolls",
        type=int,
        help="이번 실행만 config.yaml의 max_scrolls를 무시하고 이 값 사용. "
        "0이면 횟수 상한 없이 stall_limit에 도달할 때까지(=진짜 끝까지) 돈다",
    )
    args = ap.parse_args()
    asyncio.run(
        run(args.account, guest=args.guest, backfill=args.backfill, max_scrolls_override=args.max_scrolls)
    )
