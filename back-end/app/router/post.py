from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.deps import get_client_ip, get_current_user, get_current_user_optional
from app.model.post import PostCategory
from app.model.user import User, UserRole
from app.schemas.post import (
    PostCreateRequest,
    PostListResponse,
    PostPageResponse,
    PostResponse,
    PostUpdateRequest,
)
from app.service import post as post_service

router = APIRouter(prefix="/api/posts", tags=["post"])


def _is_privileged(current_user: User | None) -> bool:
    return current_user is not None and current_user.role in (UserRole.admin, UserRole.manager)


def _to_response(doc: dict, display_num: int | None = None) -> PostResponse:
    return PostResponse(
        post_id=doc["_id"],
        post_num=doc["post_num"],
        author_id=doc["author_id"],
        author=doc["author"],
        category=doc["category"],
        title=doc["title"],
        content=doc["content"],
        view_count=doc.get("view_count", 0),
        created_at=doc["created_at"],
        updated_at=doc.get("updated_at"),
        display_num=display_num,
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
    # "전체"(category 미지정) 탭에서 보여줄 가상 번호: 삭제/필터로 바뀌는 total 기준으로
    # 매번 다시 계산한다(별도 필드로 저장하지 않음).
    base_num = total - (page - 1) * page_size
    items = [_to_response(doc, display_num=base_num - i) for i, doc in enumerate(docs)]
    return PostListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{post_id}/page", response_model=PostPageResponse)
async def get_post_page(
    post_id: str,
    page_size: int = 30,
    current_user: User | None = Depends(get_current_user_optional),
):
    """게시글 상세 하단에 "다른 글" 목록을 붙일 때, 이 글이 있는 페이지로 바로
    맞추기 위한 용도(프론트의 BoardList가 URL의 page 쿼리스트링을 읽어서 씀)."""
    privileged = _is_privileged(current_user)
    try:
        page = await post_service.get_post_page(
            post_id, page_size, exclude_suggestion=not privileged
        )
    except post_service.PostNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.") from exc
    return PostPageResponse(page=page)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    request: Request,
    current_user: User | None = Depends(get_current_user_optional),
):
    viewer_key = str(current_user.user_id) if current_user else get_client_ip(request)
    try:
        doc = await post_service.get_post(post_id, viewer_key)
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
