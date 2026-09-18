from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.deps import get_client_ip, get_current_user, get_current_user_optional
from app.model.user import User, UserRole
from app.schemas.comment import CommentCreateRequest, CommentListResponse, CommentResponse
from app.service import comment as comment_service

router = APIRouter(prefix="/api/comments", tags=["comment"])


def _is_privileged(current_user: User | None) -> bool:
    return current_user is not None and current_user.role in (UserRole.admin, UserRole.manager)


def _to_response(doc: dict, replies: list[CommentResponse]) -> CommentResponse:
    is_deleted = doc.get("deleted_at") is not None
    return CommentResponse(
        comment_id=doc["_id"],
        post_id=doc["post_id"],
        author=doc["author"],
        parent_id=doc.get("parent_id"),
        mention_to=doc.get("mention_to"),
        content=comment_service.DELETED_PLACEHOLDER if is_deleted else doc["content"],
        created_at=doc["created_at"],
        reply_count=len(replies),
        replies=replies,
    )


@router.get("/{post_id}", response_model=CommentListResponse)
async def list_comments(
    post_id: str,
    sort: str = "asc",
    page: int = 1,
    page_size: int = 20,
    current_user: User | None = Depends(get_current_user_optional),
):
    try:
        top_level, replies_by_parent, total = await comment_service.list_comments(
            post_id, sort, page, page_size, _is_privileged(current_user)
        )
    except comment_service.PostNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.") from exc
    except comment_service.ForbiddenError as exc:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "건의글은 관리자만 조회할 수 있습니다."
        ) from exc

    items = [
        _to_response(
            doc, [_to_response(reply, []) for reply in replies_by_parent.get(doc["_id"], [])]
        )
        for doc in top_level
    ]
    return CommentListResponse(items=items, total=total, page=page, page_size=page_size)


@router.post("/{post_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    post_id: str,
    payload: CommentCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    try:
        doc = await comment_service.create_comment(
            post_id, payload, current_user, get_client_ip(request)
        )
    except comment_service.PostNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "게시글을 찾을 수 없습니다.") from exc
    except comment_service.CommentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "부모 댓글을 찾을 수 없습니다.") from exc
    except comment_service.ForbiddenError as exc:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "건의글은 관리자만 조회할 수 있습니다."
        ) from exc
    return _to_response(doc, [])


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(comment_id: str, current_user: User = Depends(get_current_user)):
    try:
        await comment_service.delete_comment(comment_id, current_user)
    except comment_service.CommentNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "댓글을 찾을 수 없습니다.") from exc
    except comment_service.ForbiddenError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "권한이 없습니다.") from exc
