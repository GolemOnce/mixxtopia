import json
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.database import redis_client

CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # 7일 — 일정/투표/오피셜 링크는 내용이 자주 안 바뀜
FETCH_TIMEOUT_SECONDS = 5.0
MAX_BYTES = 1_000_000  # 응답 1MB까지만 읽는다(이미지/영상 등 큰 응답 방지)
USER_AGENT = "Mozilla/5.0 (compatible; MixxtopiaBot/1.0; +https://mixxtopia.site)"


class InvalidUrlError(Exception):
    pass


class LinkPreviewFetchError(Exception):
    pass


def _cache_key(url: str) -> str:
    return f"link_preview:{url}"


def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        content = tag.get("content") if tag else None
        if content:
            return content.strip()
    return None


async def get_link_preview(url: str) -> dict:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise InvalidUrlError()

    cached = await redis_client.get(_cache_key(url))
    if cached is not None:
        return json.loads(cached)

    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT_SECONDS,
            follow_redirects=True,
            max_redirects=3,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            async with client.stream("GET", url) as resp:
                if resp.status_code >= 400:
                    raise LinkPreviewFetchError()
                content = b""
                async for chunk in resp.aiter_bytes():
                    content += chunk
                    if len(content) > MAX_BYTES:
                        break
    except httpx.HTTPError as exc:
        raise LinkPreviewFetchError() from exc

    soup = BeautifulSoup(content, "html.parser")

    title = _meta(soup, "og:title")
    if not title and soup.title and soup.title.string:
        title = soup.title.string.strip()

    result = {
        "url": url,
        "title": title,
        "description": _meta(soup, "og:description", "description"),
        "image": _meta(soup, "og:image"),
        "site_name": _meta(soup, "og:site_name") or parsed.netloc,
    }

    await redis_client.set(_cache_key(url), json.dumps(result), ex=CACHE_TTL_SECONDS)
    return result
