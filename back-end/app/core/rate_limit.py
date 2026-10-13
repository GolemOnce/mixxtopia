from fastapi import HTTPException, Request, status

from app.core.deps import get_client_ip
from app.database import redis_client


def rate_limit(key_prefix: str, limit: int, window_seconds: int):
    """IP 기준 고정 윈도우(fixed window) 레이트 리밋 — Redis INCR+EXPIRE로 구현.

    창이 넘어가는 경계에서는 짧은 시간에 최대 limit의 2배 가까이 허용될 수 있는
    느슨한 방식이지만(sliding window보다 정확도는 떨어짐), 구현이 단순하고
    스팸·무차별 대입·SSRF 정찰 같은 남용을 막는 목적엔 이 정도로 충분하다.

    사용법: `Depends(rate_limit("login", 10, 60))`처럼 라우터에 의존성으로 건다.
    """

    async def _dependency(request: Request) -> None:
        ip = get_client_ip(request)
        key = f"ratelimit:{key_prefix}:{ip}"

        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, window_seconds)

        if count > limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
            )

    return _dependency
