from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.deps import get_client_ip, get_current_user, get_current_user_optional
from app.model.post import PostCategory
from app.model.user import User, UserRole
from app.schemas.post import PostCreateRequest, PostListResponse, PostResponse, PostUpdateRequest
from app.service import post as post_service

router = APIRouter(prefix="/api/posts", tags=["post"])


def _is_privileged(current_user: User | None) -> bool:
    return current_user is not None and current_user.role in (UserRole.admin, UserRole.manager)


def _to_response(doc: dict) -> PostResponse:
    return PostResponse(
        post_id=doc["_id"],
        post_num=doc["post_num"],
        author=doc["author"],
        category=doc["category"],
        title=doc["title"],
        content=doc["content"],
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at"),
    )


@router.get("", response_model=PostListResponse)
async def list_posts(
    category: PostCategory | None = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = Depends(get_current_user_optional),
):
    privileged = _is_privileged(current_user)
    if category == PostCategory.suggestion and not privileged:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "건의글은 관리자만 조회할 수 있습니다.")

    docs, total = await post_service.list_posts(
        category, page, page_size, exclude_suggestion=not privileged
    )
    return PostListResponse(
        items=[_to_response(doc) for doc in docs], total=total, page=page, page_size=page_size
    )


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, current_user: User | None = Depends(get_current_user_optional)):
    try:
        doc = await post_service.get_post(post_id)
    except post_service.PostNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.") from exc

    if doc["category"] == PostCategory.suggestion.value and not _is_privileged(current_user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "건의글은 관리자만 조회할 수 있습니다.")
    return _to_response(doc)


@router.post("", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: PostCreateRequest, request: Request, current_user: User = Depends(get_current_user)
):
    try:
        doc = await post_service.create_post(payload, current_user, get_client_ip(request))
    except post_service.NoticeRestrictedError as exc:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "공지는 admin/manager만 작성할 수 있습니다."
        ) from exc
    return _to_response(doc)


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str, payload: PostUpdateRequest, current_user: User = Depends(get_current_user)
):
    try:
        doc = await post_service.update_post(post_id, payload, current_user)
    except post_service.PostNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.") from exc
    except post_service.ForbiddenError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "권한이 없습니다.") from exc
    return _to_response(doc)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(post_id: str, current_user: User = Depends(get_current_user)):
    try:
        await post_service.delete_post(post_id, current_user)
    except post_service.PostNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.") from exc
    except post_service.ForbiddenError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "권한이 없습니다.") from exc
