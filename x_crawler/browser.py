"""Playwright로 프로필 페이지를 열고, 타임라인 GraphQL 응답을 가로채서 수집.

오퍼레이션 이름이 X 쪽에서 예고 없이 바뀐다(예: UserTweets → UserOriginalsTimeline,
2026-10 확인). 여러 이름을 한 번에 받아두고, 또 바뀌면 DevTools > Network에서
graphql로 필터링 후 트윗 목록을 실어나르는(사이즈 큰) 요청 이름을 OPERATION_NAMES에 추가."""
import itertools
import logging
import random

from playwright.async_api import BrowserContext, Response

from .models import Tweet
from .parser import parse_user_tweets

log = logging.getLogger(__name__)

OPERATION_NAMES = ("UserTweets", "UserTweetsAndReplies", "UserOriginalsTimeline")


class SessionExpired(Exception):
    pass


class RateLimited(Exception):
    pass


async def crawl_account(
    context: BrowserContext,
    username: str,
    last_id: int | None,
    max_scrolls: int,
    stall_limit: int = 3,
) -> list[Tweet]:
    """last_id보다 새로운 트윗을 오래된 순으로 반환. last_id가 None이면 max_scrolls만큼 백필.
    max_scrolls <= 0이면 횟수 상한 없이, stall_limit(연속으로 새 글 안 잡히는 횟수)에만
    의존해서 진짜 끝까지 돈다 — 대량 백필(수천~수만 개) 때 임의의 숫자를 안 넣어도 됨."""
    page = await context.new_page()
    collected: dict[str, Tweet] = {}
    state = {"reached": False, "rate_limited": False}

    async def on_response(res: Response) -> None:
        if not any(f"/{name}" in res.url for name in OPERATION_NAMES):
            return
        if res.status == 429:
            state["rate_limited"] = True
            return
        if res.status != 200:
            log.warning("타임라인 응답 %s: %s (%s)", res.status, username, res.url)
            return
        try:
            data = await res.json()
        except Exception:
            return

        for t in parse_user_tweets(data):
            if t.username and t.username.lower() != username.lower():
                continue
            # tweet id는 snowflake라 시간순 증가 → 숫자 비교로 since 판정
            if last_id is not None and int(t.id) <= last_id:
                state["reached"] = True
                continue
            collected[t.id] = t

    page.on("response", on_response)  # goto 전에 등록해야 첫 응답을 안 놓침
    try:
        await page.goto(f"https://x.com/{username}", wait_until="domcontentloaded")
        if "/login" in page.url or "/i/flow" in page.url:
            raise SessionExpired("세션 만료 → save_session.py 다시 실행")
        await page.wait_for_timeout(random.randint(3000, 5000))

        stall = 0
        scroll_iter = itertools.count() if max_scrolls <= 0 else range(max_scrolls)
        for i in scroll_iter:
            if state["reached"] or state["rate_limited"]:
                break
            before = len(collected)
            # window.scrollBy()도 안 먹힐 수 있다 — X 타임라인은 window가 아니라
            # 내부의 가상화된(virtualized) div가 스크롤 컨테이너인 경우가 있어서,
            # 그러면 창을 스크롤해봤자 그 안쪽 리스트는 안 움직여 다음 페이지 로드가
            # 안 터진다. 마지막 트윗 엘리먼트를 직접 찾아 그쪽으로 스크롤시키면
            # Playwright가 실제 스크롤 컨테이너가 뭐든 알아서 맞춰 스크롤해준다.
            tweets_locator = page.locator('article[data-testid="tweet"]')
            tweet_count = await tweets_locator.count()
            if tweet_count > 0:
                try:
                    await tweets_locator.nth(tweet_count - 1).scroll_into_view_if_needed(
                        timeout=5000
                    )
                except Exception:
                    pass
            await page.evaluate(f"window.scrollBy(0, {random.randint(2500, 4000)})")
            await page.mouse.wheel(0, random.randint(2500, 4000))
            await page.wait_for_timeout(random.randint(1500, 3500))
            dom_count = await page.locator('article[data-testid="tweet"]').count()
            total_label = "무제한" if max_scrolls <= 0 else str(max_scrolls)
            log.info(
                "[%s] 스크롤 %d/%s — 누적 수집 %d개, DOM에 렌더된 트윗 %d개",
                username, i + 1, total_label, len(collected), dom_count,
            )
            stall = stall + 1 if len(collected) == before else 0
            if stall >= stall_limit:
                log.info("새 트윗 없음, 스크롤 중단 (%s, %d회)", username, i + 1)
                break

        await page.wait_for_timeout(1000)  # 마지막 응답 핸들러 마무리 대기
    finally:
        await page.close()

    if state["rate_limited"]:
        log.warning("rate limit 감지: %s", username)
        if not collected:
            raise RateLimited(username)

    return sorted(collected.values(), key=lambda t: int(t.id))
