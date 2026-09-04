from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.service import bustercall as bustercall_service

router = APIRouter(tags=["bustercall"])


@router.get("/api/phrases")
async def get_phrases():
    return await bustercall_service.get_phrases()


@router.post("/api/click")
async def click(req: Request):
    try:
        body = await req.json()
    except Exception:
        body = {}

    client_id = (body.get("clientId") or "").strip()
    total = await bustercall_service.record_click(client_id)

    return JSONResponse({"ok": True, "total": total})


@router.get("/api/stats")
async def stats():
    return await bustercall_service.get_stats()
