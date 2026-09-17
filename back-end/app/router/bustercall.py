from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.core.deps import require_roles
from app.model.user import User, UserRole
from app.schemas.bustercall import (
    BustercallCampaignCreateRequest,
    BustercallCampaignResponse,
    BustercallCampaignUpdateRequest,
)
from app.service import bustercall as bustercall_service

router = APIRouter(prefix="/api/bustercall", tags=["bustercall"])


@router.get("/reroll")
async def get_phrases():
    return await bustercall_service.get_phrases()


@router.post("/click")
async def click(req: Request):
    try:
        body = await req.json()
    except Exception:
        body = {}

    client_id = (body.get("clientId") or "").strip()
    total = await bustercall_service.record_click(client_id)

    return JSONResponse({"ok": True, "total": total})


@router.get("/stats")
async def stats():
    return await bustercall_service.get_stats()


def _to_response(doc: dict) -> BustercallCampaignResponse:
    return BustercallCampaignResponse(
        phrases_id=doc["_id"],
        category=doc["category"],
        detail=doc["detail"],
        member=doc["member"],
        pairs=doc["pairs"],
        fixed2=doc["fixed2"],
        fixed4=doc["fixed4"],
        is_current=doc["is_current"],
    )


@router.get("/campaigns", response_model=list[BustercallCampaignResponse])
async def list_campaigns(
    _current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    docs = await bustercall_service.list_campaigns()
    return [_to_response(doc) for doc in docs]


@router.post(
    "/campaigns",
    response_model=BustercallCampaignResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_campaign(
    payload: BustercallCampaignCreateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await bustercall_service.create_campaign(payload, current_user.user_id)
    except bustercall_service.CampaignAlreadyExistsError as exc:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "이미 등록된 캠페인입니다. 목록에서 선택해 수정해주세요.",
        ) from exc
    return _to_response(doc)


@router.patch("/campaigns/{phrases_id}", response_model=BustercallCampaignResponse)
async def update_campaign(
    phrases_id: str,
    payload: BustercallCampaignUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await bustercall_service.update_campaign(phrases_id, payload, current_user.user_id)
    except bustercall_service.CampaignNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "캠페인을 찾을 수 없습니다.") from exc
    return _to_response(doc)


@router.delete("/campaigns/{phrases_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    phrases_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        await bustercall_service.delete_campaign(phrases_id, current_user.user_id)
    except bustercall_service.CampaignNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "캠페인을 찾을 수 없습니다.") from exc
