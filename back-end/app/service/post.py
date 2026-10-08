from uuid import uuid4

from pymongo import ReturnDocument

from app.core.access_log import AccessLogAction, write_access_log
from app.database import redis_client
from app.model.base import utcnow
from app.model.post import Post, PostCategory, post_counters_col, posts_col
from app.model.user import User, UserRole
from app.schemas.post import PostCreateRequest, PostUpdateRequest

# 같은 조회자(로그인 유저면 user_id, 아니면 IP)는 이 시간 동안 다시 봐도 조회수를 올리지 않는다.
VIEW_DEDUP_TTL_SECONDS = 24 * 60 * 60


class PostNotFoundError(Exception):
    pass


class ForbiddenError(Exception):
    pass


class NoticeRestrictedError(Exception):
    pass


async def __next_post_num(category: PostCategory) -> int:
    """category별 독립적인 post_num을 원자적으로 증가시켜 부여한다."""

    doc = await post_counters_col.find_one_and_update(
        {"_id": category.value},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return doc["seq"]


def _can_modify(doc: dict, actor: User) -> bool:
    return actor.role in (UserRole.admin, UserRole.manager) or doc["author_id"] == str(
        actor.user_id
    )


async def list_posts(
    category: PostCategory | None, page: int, page_size: int, exclude_suggestion: bool
) -> tuple[list[dict], int]:
    query: dict = {"deleted_at": None}
    if category is not None:
        query["category"] = category.value
    elif exclude_suggestion:
        query["category"] = {"$ne": PostCategory.suggestion.value}

    total = await posts_col.count_documents(query)
    skip = (page - 1) * page_size
    docs = [
        doc
        async for doc in posts_col.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    ]
    return docs, total


async def get_post_page(post_id: str, page_size: int, exclude_suggestion: bool) -> int:
    """list_posts와 같은 정렬(created_at desc)·필터 기준으로, 이 글이 몇 페이지에
    있는지 계산한다. 이 글보다 최신(created_at이 더 큰) 글 개수가 곧 0-based 순위."""
    doc = await posts_col.find_one({"_id": post_id, "deleted_at": None})
    if not doc:
        raise PostNotFoundError()

    query: dict = {"deleted_at": None, "created_at": {"$gt": doc["created_at"]}}
    if exclude_suggestion:
        query["category"] = {"$ne": PostCategory.suggestion.value}
    rank = await posts_col.count_documents(query)
    return rank // page_size + 1


async def get_post(post_id: str, viewer_key: str) -> dict:
    doc = await posts_col.find_one({"_id": post_id, "deleted_at": None})
    if not doc:
        raise PostNotFoundError()

    dedup_key = f"post_view:{post_id}:{viewer_key}"
    is_first_view = await redis_client.set(dedup_key, "1", nx=True, ex=VIEW_DEDUP_TTL_SECONDS)
    if is_first_view:
        updated = await posts_col.find_one_and_update(
            {"_id": post_id},
            {"$inc": {"view_count": 1}},
            return_document=ReturnDocument.AFTER,
        )
        if updated:
            doc = updated
    return doc


async def create_post(payload: PostCreateRequest, author: User, ip: str) -> dict:
    if payload.category == PostCategory.notice and author.role not in (
        UserRole.admin,
        UserRole.manager,
    ):
        raise NoticeRestrictedError()

    post_num = await __next_post_num(payload.category)

    post = Post(
        post_id=uuid4(),
        post_num=post_num,
        author_id=author.user_id,
        author=author.nickname,
        category=payload.category,
        title=payload.title,
        content=payload.content,
        created_by=author.user_id,
    )
    doc = post.model_dump(mode="json")
    doc["_id"] = doc.pop("post_id")
    await posts_col.insert_one(doc)
    await write_access_log(author.user_id, ip, AccessLogAction.post_create)
    return doc


async def update_post(post_id: str, payload: PostUpdateRequest, actor: User) -> dict:
    existing = await posts_col.find_one({"_id": post_id, "deleted_at": None})
    if not existing:
        raise PostNotFoundError()
    if not _can_modify(existing, actor):
        raise ForbiddenError()

    updates = payload.model_dump(exclude_unset=True, mode="json")
    updates["updated_at"] = utcnow()
    updates["updated_by"] = str(actor.user_id)

    return await posts_col.find_one_and_update(
        {"_id": post_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )


async def delete_post(post_id: str, actor: User) -> None:
    existing = await posts_col.find_one({"_id": post_id, "deleted_at": None})
    if not existing:
        raise PostNotFoundError()
    if not _can_modify(existing, actor):
        raise ForbiddenError()

    await posts_col.update_one(
        {"_id": post_id},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(actor.user_id)}},
    )
