import ipaddress
import json
import socket
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.database import redis_client

CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # 7일 — 일정/투표/오피셜 링크는 내용이 자주 안 바뀜
FETCH_TIMEOUT_SECONDS = 5.0
MAX_BYTES = 1_000_000  # 응답 1MB까지만 읽는다(이미지/영상 등 큰 응답 방지)
MAX_REDIRECTS = 3
USER_AGENT = "Mozilla/5.0 (compatible; MixxtopiaBot/1.0; +https://mixxtopia.site)"


class InvalidUrlError(Exception):
    pass


class LinkPreviewFetchError(Exception):
    pass


def _validate_format(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise InvalidUrlError()


def _is_safe_ip(ip_str: str) -> bool:
    """사설/루프백/링크로컬(169.254.169.254 클라우드 메타데이터 포함)/예약/멀티캐스트
    대역이면 전부 거부한다 — SSRF 방지."""
    ip = ipaddress.ip_address(ip_str)
    return not (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _resolve_safe_ip(hostname: str) -> str:
    """hostname을 지금 이 시점에 직접 DNS 조회해서 안전한 IP를 하나 고른다. 이후 요청은
    호스트명이 아니라 이 IP로 바로 접속해서(연결 시점에 재조회하지 않음) DNS
    rebinding(검증 때는 공인 IP로 응답하다가 실제 연결 시점엔 내부 IP로 바꿔치기하는
    TOCTOU 공격)을 막는다."""
    try:
        infos = socket.getaddrinfo(hostname, None)
    except socket.gaierror as exc:
        raise InvalidUrlError() from exc

    for info in infos:
        ip_str = info[4][0]
        if _is_safe_ip(ip_str):
            return ip_str

    raise InvalidUrlError()


def _cache_key(url: str) -> str:
    return f"link_preview:{url}"


def _meta(soup: BeautifulSoup, *names: str) -> str | None:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        content = tag.get("content") if tag else None
        if content:
            return content.strip()
    return None


async def _send_pinned(client: httpx.AsyncClient, url: str) -> httpx.Response:
    """검증한 IP로 직접(호스트명 재조회 없이) 연결하되, Host 헤더와 TLS SNI는 원래
    호스트명 그대로 보내 가상호스팅/인증서 검증이 깨지지 않게 한다."""

    _validate_format(url)
    parsed = urlparse(url)
    assert parsed.hostname is not None  # _validate_format에서 이미 확인함

    ip = _resolve_safe_ip(parsed.hostname)
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    pinned_url = parsed._replace(netloc=f"{ip}:{port}").geturl()

    request = client.build_request(
        "GET",
        pinned_url,
        headers={"Host": parsed.hostname},
        extensions={"sni_hostname": parsed.hostname},
    )
    return await client.send(request, stream=True)


async def _fetch(url: str) -> bytes:
    """리다이렉트를 한 번에 따라가지 않고 매 홉마다 직접 검증+IP 고정한다 — 공개 URL이
    내부 IP로 리다이렉트시키는 SSRF 우회를 막기 위함."""

    current_url = url
    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT_SECONDS,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            for _ in range(MAX_REDIRECTS + 1):
                resp = await _send_pinned(client, current_url)
                try:
                    if resp.is_redirect:
                        location = resp.headers.get("location")
                        if not location:
                            raise LinkPreviewFetchError()
                        current_url = urljoin(current_url, location)
                        continue

                    if resp.status_code >= 400:
                        raise LinkPreviewFetchError()

                    content = b""
                    async for chunk in resp.aiter_bytes():
                        content += chunk
                        if len(content) > MAX_BYTES:
                            break
                    return content
                finally:
                    await resp.aclose()
    except httpx.HTTPError as exc:
        raise LinkPreviewFetchError() from exc

    raise LinkPreviewFetchError()  # 리다이렉트가 MAX_REDIRECTS를 넘어가는 경우


async def get_link_preview(url: str) -> dict:
    _validate_format(url)

    cached = await redis_client.get(_cache_key(url))
    if cached is not None:
        return json.loads(cached)

    content = await _fetch(url)

    soup = BeautifulSoup(content, "html.parser")
    parsed = urlparse(url)

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
