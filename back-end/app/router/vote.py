from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_roles
from app.model.user import User, UserRole
from app.schemas.vote import VoteCreateRequest, VoteResponse, VoteUpdateRequest
from app.service import vote as vote_service

router = APIRouter(prefix="/api/votes", tags=["vote"])


def _to_response(doc: dict) -> VoteResponse:
    return VoteResponse(
        vote_id=doc["_id"],
        title=doc["title"],
        content=doc["content"],
        member=doc["member"],
        link=doc["link"],
        organizer=doc["organizer"],
        start_at=doc["start_at"],
        end_at=doc["end_at"],
    )


@router.get("", response_model=list[VoteResponse])
async def list_votes(member: str | None = None, organizer: str | None = None):
    docs = await vote_service.list_votes(member=member, organizer=organizer)
    return [_to_response(doc) for doc in docs]


@router.get("/{vote_id}", response_model=VoteResponse)
async def get_vote(vote_id: str):
    try:
        doc = await vote_service.get_vote(vote_id)
    except vote_service.VoteNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "투표를 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.post("", response_model=VoteResponse, status_code=status.HTTP_201_CREATED)
async def create_vote(
    payload: VoteCreateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await vote_service.create_vote(payload, current_user.user_id)
    except vote_service.InvalidTimeRangeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "시작 시각은 종료 시각보다 빨라야 합니다."
        ) from exc
    return _to_response(doc)


@router.patch("/{vote_id}", response_model=VoteResponse)
async def update_vote(
    vote_id: str,
    payload: VoteUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await vote_service.update_vote(vote_id, payload, current_user.user_id)
    except vote_service.InvalidTimeRangeError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "시작 시각은 종료 시각보다 빨라야 합니다."
        ) from exc
    except vote_service.VoteNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "투표를 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.delete("/{vote_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vote(
    vote_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        await vote_service.delete_vote(vote_id, current_user.user_id)
    except vote_service.VoteNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "투표를 찾을 수 없습니다.") from exc
