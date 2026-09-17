from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

users_col = db["users"]


class OAuthProvider(str, Enum):
    gmail = "gmail"
    naver = "naver"


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    user = "user"


class User(BaseEntity):
    """users(user.py) 명세 + 인가용 role, OAuth 필수 동의 서명 시각 확장.

    role, terms_agreed_at, privacy_agreed_at은 docs/db-schema.md에 없던 필드로,
    CLAUDE.md의 인증/인가·약관 동의 요구사항을 충족하기 위해 추가함.
    blocked_user_ids도 명세에 없던 필드로, 차단/차단해제/차단목록 API 구현을 위해 추가함
    (별도 컬렉션 없이 유저 문서에 직접 배열로 관리 — 개인 차단목록이라 규모가 작음).
    """

    user_id: UUID
    oauth: OAuthProvider
    nickname: str = Field(min_length=1, max_length=8)
    email: str | None = None
    role: UserRole = UserRole.user
    terms_agreed_at: datetime
    privacy_agreed_at: datetime
    blocked_user_ids: list[UUID] = Field(default_factory=list)

    @classmethod
    def from_doc(cls, doc: dict) -> "User":
        return cls(**{**doc, "user_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await users_col.create_index([("oauth", 1), ("email", 1)], unique=True, sparse=True)
