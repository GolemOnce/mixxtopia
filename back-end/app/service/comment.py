from uuid import UUID, uuid4

from app.core.access_log import AccessLogAction, write_access_log
from app.model.base import utcnow
from app.model.comment import Comment, comments_col
from app.model.post import posts_col
from app.model.user import User, UserRole
from app.schemas.comment import CommentCreateRequest

DELETED_PLACEHOLDER = "삭제된 댓글입니다"


class PostNotFoundError(Exception):
    pass


class CommentNotFoundError(Exception):
    pass


class ForbiddenError(Exception):
    pass


async def _assert_post_exists(post_id: str) -> None:
    if not await posts_col.find_one({"_id": post_id, "deleted_at": None}):
        raise PostNotFoundError()


async def list_comments(
    post_id: str, sort: str, page: int, page_size: int
) -> tuple[list[dict], dict[str, list[dict]], int]:
    """soft-delete된 댓글도 답글 스레드가 끊기지 않도록 조회 자체는 필터링하지 않고,
    표시(placeholder 처리)는 라우터에서 담당한다."""

    await _assert_post_exists(post_id)

    query = {"post_id": post_id, "parent_id": None}
    total = await comments_col.count_documents(query)
    sort_dir = 1 if sort == "asc" else -1
    skip = (page - 1) * page_size
    top_level = [
        doc
        async for doc in comments_col.find(query)
        .sort("created_at", sort_dir)
        .skip(skip)
        .limit(page_size)
    ]

    top_ids = [doc["_id"] for doc in top_level]
    replies_by_parent: dict[str, list[dict]] = {tid: [] for tid in top_ids}
    if top_ids:
        async for reply in comments_col.find({"parent_id": {"$in": top_ids}}).sort("created_at", 1):
            replies_by_parent.setdefault(reply["parent_id"], []).append(reply)

    return top_level, replies_by_parent, total


async def create_comment(
    post_id: str, payload: CommentCreateRequest, author: User, ip: str
) -> dict:
    await _assert_post_exists(post_id)

    actual_parent_id = None
    mention_to = None
    if payload.parent_id is not None:
        target = await comments_col.find_one({"_id": payload.parent_id, "post_id": post_id})
        if not target:
            raise CommentNotFoundError()

        # 답글의 답글도 저장상으로는 원댓글(root)에 바로 매달아 2단계로 평탄화한다.
        # parent_id는 항상 "원댓글"을 가리키고, mention_to만 실제로 답한 대상(target)의
        # 작성자로 남겨서 "누구에게 답했는지"를 구분한다.
        actual_parent_id = target.get("parent_id") or target["_id"]
        mention_to = target["author"]

    comment = Comment(
        comment_id=uuid4(),
        post_id=UUID(post_id),
        author_id=author.user_id,
        author=author.nickname,
        parent_id=UUID(actual_parent_id) if actual_parent_id else None,
        mention_to=mention_to,
        content=payload.content,
        created_by=author.user_id,
    )
    doc = comment.model_dump(mode="json")
    doc["_id"] = doc.pop("comment_id")
    await comments_col.insert_one(doc)
    await write_access_log(author.user_id, ip, AccessLogAction.comment_create)
    return doc


async def delete_comment(comment_id: str, actor: User) -> None:
    comment = await comments_col.find_one({"_id": comment_id, "deleted_at": None})
    if not comment:
        raise CommentNotFoundError()

    is_privileged = actor.role in (UserRole.admin, UserRole.manager)
    if not is_privileged and comment["author_id"] != str(actor.user_id):
        raise ForbiddenError()

    await comments_col.update_one(
        {"_id": comment_id},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(actor.user_id)}},
    )
