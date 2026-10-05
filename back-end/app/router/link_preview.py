from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.link_preview import LinkPreviewResponse
from app.service import link_preview as link_preview_service

router = APIRouter(prefix="/api/link-preview", tags=["link-preview"])


@router.get("", response_model=LinkPreviewResponse)
async def get_link_preview(url: str = Query(..., max_length=500)):
    try:
        data = await link_preview_service.get_link_preview(url)
    except link_preview_service.InvalidUrlError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "올바르지 않은 URL입니다.") from exc
    except link_preview_service.LinkPreviewFetchError as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "링크를 불러오지 못했습니다.") from exc
    return LinkPreviewResponse(**data)
