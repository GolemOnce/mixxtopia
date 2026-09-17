from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

comments_col = db["comments"]


class Comment(BaseEntity):
    """comments(comment.py) 명세 + owner 판별용 author_id 확장(post.py의 author_id와 동일 사유).

    post_id는 posts.post_id(UUID)를 참조 — post_num은 category별로 중복되는 값이라
    댓글이 어느 글에 속하는지 특정할 수 없어서 참조로 쓸 수 없음.
    저장은 2단계(일반 댓글/답글)로 평탄화됨 — 답글에 답글을 달아도 parent_id는 항상
    원댓글(root)을 가리키고, mention_to만 실제로 답한 대상의 작성자로 남는다.
    """

    comment_id: UUID
    post_id: UUID
    author_id: UUID
    author: str = Field(min_length=1, max_length=8)
    parent_id: UUID | None = None
    mention_to: str | None = Field(default=None, max_length=8)
    content: str = Field(min_length=1, max_length=100)

    @classmethod
    def from_doc(cls, doc: dict) -> "Comment":
        return cls(**{**doc, "comment_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await comments_col.create_index([("post_id", 1), ("parent_id", 1), ("created_at", 1)])
