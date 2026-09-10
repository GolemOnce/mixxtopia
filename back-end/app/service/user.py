from uuid import UUID, uuid4

from app.core.access_log import AccessLogAction, write_access_log
from app.core.config import settings
from app.core.oauth import fetch_oauth_email
from app.core.security import (
    InvalidTokenError,
    TokenType,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.database import redis_client
from app.model.base import utcnow
from app.model.user import User, UserRole, users_col
from app.schemas.user import AuthLoginRequest, AuthSignupRequest

REFRESH_TOKEN_KEY = "refresh_token:{user_id}"


class OAuthEmailRequiredError(Exception):
    pass


class ConsentRequiredError(Exception):
    pass


class UserAlreadyExistsError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


async def _issue_tokens(user_id: UUID, role: UserRole) -> tuple[str, str]:
    access_token = create_access_token(user_id, role.value)
    refresh_token = create_refresh_token(user_id)
    await redis_client.set(
        REFRESH_TOKEN_KEY.format(user_id=user_id),
        refresh_token,
        ex=settings.refresh_token_expire_days * 24 * 60 * 60,
    )
    return access_token, refresh_token


async def signup(payload: AuthSignupRequest, ip: str) -> tuple[User, str, str]:
    if not (payload.agree_terms and payload.agree_privacy):
        raise ConsentRequiredError()

    email = await fetch_oauth_email(payload.oauth, payload.access_token)
    if not email:
        raise OAuthEmailRequiredError()

    if await users_col.find_one({"oauth": payload.oauth.value, "email": email}):
        raise UserAlreadyExistsError()

    user_id = uuid4()
    now = utcnow()
    user = User(
        user_id=user_id,
        oauth=payload.oauth,
        nickname=payload.nickname,
        email=email,
        role=UserRole.user,
        terms_agreed_at=now,
        privacy_agreed_at=now,
        created_by=user_id,
        created_at=now,
    )

    doc = user.model_dump(mode="json")
    doc["_id"] = doc.pop("user_id")
    await users_col.insert_one(doc)
    await write_access_log(user_id, ip, AccessLogAction.signup)

    access_token, refresh_token = await _issue_tokens(user_id, user.role)
    return user, access_token, refresh_token


async def login(payload: AuthLoginRequest) -> tuple[User, str, str]:
    email = await fetch_oauth_email(payload.oauth, payload.access_token)
    if not email:
        raise OAuthEmailRequiredError()

    doc = await users_col.find_one(
        {"oauth": payload.oauth.value, "email": email, "deleted_at": None}
    )
    if not doc:
        raise UserNotFoundError()

    user = User.from_doc(doc)
    access_token, refresh_token = await _issue_tokens(user.user_id, user.role)
    return user, access_token, refresh_token


async def logout(user_id: UUID) -> None:
    await redis_client.delete(REFRESH_TOKEN_KEY.format(user_id=user_id))


async def refresh(refresh_token: str) -> tuple[UUID, str, str]:
    payload = decode_token(refresh_token, TokenType.refresh)
    user_id = UUID(payload["sub"])

    stored = await redis_client.get(REFRESH_TOKEN_KEY.format(user_id=user_id))
    if stored != refresh_token:
        raise InvalidTokenError("refresh token mismatch or revoked")

    doc = await users_col.find_one({"_id": str(user_id), "deleted_at": None})
    if not doc:
        raise InvalidTokenError("user not found")

    new_access_token = create_access_token(user_id, doc["role"])
    return user_id, new_access_token, refresh_token
