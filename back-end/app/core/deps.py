from fastapi import Depends, HTTPException, Request, status
from pydantic import ValidationError

from app.core.security import ACCESS_TOKEN_COOKIE, InvalidTokenError, TokenType, decode_token
from app.model.user import User, UserRole, users_col


def get_client_ip(request: Request) -> str:
    """X-Forwarded-For는 클라이언트가 임의로 덧붙여 보낼 수 있어(nginx가
    $proxy_add_x_forwarded_for로 기존 값 뒤에 실제 IP를 "추가"만 하기 때문에,
    첫 번째 값을 그대로 믿으면 가짜 IP로 rate limit/접속기록을 조작할 수 있었음).
    X-Real-IP는 nginx.conf에서 $remote_addr로 항상 덮어써서 보내므로 이것만 신뢰한다."""

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"


async def get_current_user(request: Request) -> User:
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "로그인이 필요합니다.")

    try:
        payload = decode_token(token, TokenType.access)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "유효하지 않은 토큰입니다.") from exc

    doc = await users_col.find_one({"_id": payload["sub"], "deleted_at": None})
    if not doc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "존재하지 않는 사용자입니다.")

    return User.from_doc(doc)


async def get_current_user_optional(request: Request) -> User | None:
    """공개 조회지만 로그인 여부에 따라 결과가 달라지는 endpoint용(예: 건의글 조회 제한).
    비로그인/유효하지 않은 토큰이어도 401을 던지지 않고 None을 반환한다."""

    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        return None

    try:
        payload = decode_token(token, TokenType.access)
    except InvalidTokenError:
        return None

    doc = await users_col.find_one({"_id": payload["sub"], "deleted_at": None})
    if not doc:
        return None

    try:
        return User.from_doc(doc)
    except ValidationError:
        # "선택적" 조회용 dependency라, 데이터 이상으로 파싱이 실패해도 401/500 대신
        # 비로그인 취급(None)으로 안전하게 폴백한다.
        return None


def require_roles(*roles: UserRole):
    async def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "권한이 없습니다.")
        return current_user

    return _dependency


def require_self_or_roles(*roles: UserRole):
    """path param `user_id`와 본인이거나, roles 중 하나여야 통과(owner-or-role 패턴)."""

    async def _dependency(user_id: str, current_user: User = Depends(get_current_user)) -> User:
        if str(current_user.user_id) == user_id or current_user.role in roles:
            return current_user
        raise HTTPException(status.HTTP_403_FORBIDDEN, "권한이 없습니다.")

    return _dependency
