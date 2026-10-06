"""미디어 서버(pbs/video.twimg.com)는 로그인 불필요 → 브라우저 없이 httpx로 받는다."""
import asyncio
import random
from pathlib import Path

import httpx

from .models import Media, Tweet


async def download_all(
    tweet: Tweet, base_dir: Path, client: httpx.AsyncClient
) -> list[tuple[int, Media, Path]]:
    results = []
    for i, m in enumerate(tweet.media):
        path = base_dir / tweet.username / f"{tweet.id}_{i}.{m.ext}"
        if not path.exists():
            await _download(client, m.url, path)
            await asyncio.sleep(random.uniform(0.3, 1.0))
        results.append((i, m, path))
    return results


async def _download(client: httpx.AsyncClient, url: str, path: Path, retries: int = 3) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".part")  # 중간에 끊겨도 깨진 파일이 남지 않게
    for attempt in range(retries):
        try:
            async with client.stream("GET", url) as r:
                r.raise_for_status()
                with open(tmp, "wb") as f:
                    async for chunk in r.aiter_bytes():
                        f.write(chunk)
            tmp.rename(path)
            return
        except httpx.HTTPError:
            if attempt == retries - 1:
                tmp.unlink(missing_ok=True)
                raise
            await asyncio.sleep(2 ** attempt)
