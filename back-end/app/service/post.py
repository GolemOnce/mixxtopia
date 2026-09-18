from uuid import uuid4

from pymongo import ReturnDocument

from app.core.access_log import AccessLogAction, write_access_log
from app.model.base import utcnow
from app.model.post import Post, PostCategory, post_counters_col, posts_col
from app.model.user import User, UserRole
from app.schemas.post import PostCreateRequest, PostUpdateRequest


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


async def get_post(post_id: str) -> dict:
    doc = await posts_col.find_one({"_id": post_id, "deleted_at": None})
    if not doc:
        raise PostNotFoundError()
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
