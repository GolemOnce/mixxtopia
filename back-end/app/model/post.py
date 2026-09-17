from enum import Enum
from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

posts_col = db["posts"]
post_counters_col = db["post_counters"]


class PostCategory(str, Enum):
    notice = "notice"
    free = "free"
    question = "question"
    suggestion = "suggestion"


class Post(BaseEntity):
    """posts(post.py) 명세 + owner 판별용 author_id 확장.

    author_id는 명세에 없던 필드로, author(닉네임 스냅샷)만으로는 수정/삭제 권한의
    "owner" 판별이 불가능해서(닉네임은 불변 식별자가 아님) 추가함.
    post_counters 컬렉션은 category별 post_num 원자 증가용 카운터(app.service.post 참고).
    """

    post_id: UUID
    post_num: int
    author_id: UUID
    author: str = Field(min_length=1, max_length=8)
    category: PostCategory
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)

    @classmethod
    def from_doc(cls, doc: dict) -> "Post":
        return cls(**{**doc, "post_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await posts_col.create_index([("category", 1), ("post_num", 1)], unique=True)
    await posts_col.create_index("created_at")
