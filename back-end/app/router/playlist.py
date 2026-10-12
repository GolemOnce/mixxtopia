from fastapi import APIRouter, Depends, HTTPException, status

from app.core.deps import require_roles
from app.model.user import User, UserRole
from app.schemas.playlist import (
    PlaylistSongResponse,
    RecommendedPlaylistCreateRequest,
    RecommendedPlaylistResponse,
    RecommendedPlaylistUpdateRequest,
)
from app.service import playlist as playlist_service

router = APIRouter(prefix="/api/playlists", tags=["playlist"])


def _to_song_response(doc: dict) -> PlaylistSongResponse:
    return PlaylistSongResponse(
        music_id=doc["_id"],
        song=doc["song"],
        album=doc["album"],
        album_cover=doc.get("album_cover"),
        artist=doc["artist"],
        duration=doc.get("duration"),
        melon=doc.get("melon"),
        genie=doc.get("genie"),
        bugs=doc.get("bugs"),
        flo=doc.get("flo"),
        vibe=doc.get("vibe"),
    )


async def _to_recommended_response(doc: dict) -> RecommendedPlaylistResponse:
    songs = await playlist_service.resolve_songs(doc["song_ids"])
    return RecommendedPlaylistResponse(
        playlist_id=doc["_id"],
        title=doc["title"],
        songs=[_to_song_response(s) for s in songs],
        is_current=doc["is_current"],
    )


@router.get("", response_model=list[PlaylistSongResponse])
async def list_songs():
    docs = await playlist_service.list_songs()
    return [_to_song_response(doc) for doc in docs]


@router.get("/recommended", response_model=RecommendedPlaylistResponse | None)
async def get_recommended():
    doc = await playlist_service.get_current_recommended()
    if not doc:
        return None
    return await _to_recommended_response(doc)


@router.get(
    "/recommended/campaigns",
    response_model=list[RecommendedPlaylistResponse],
)
async def list_recommended_campaigns(
    _current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    docs = await playlist_service.list_recommended_playlists()
    return [await _to_recommended_response(doc) for doc in docs]


@router.post(
    "/recommended/campaigns",
    response_model=RecommendedPlaylistResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_recommended_campaign(
    payload: RecommendedPlaylistCreateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await playlist_service.create_recommended_playlist(payload, current_user.user_id)
    except playlist_service.InvalidSongIdsError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "존재하지 않는 곡이 포함돼 있습니다."
        ) from exc
    return await _to_recommended_response(doc)


@router.patch(
    "/recommended/campaigns/{playlist_id}",
    response_model=RecommendedPlaylistResponse,
)
async def update_recommended_campaign(
    playlist_id: str,
    payload: RecommendedPlaylistUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        doc = await playlist_service.update_recommended_playlist(
            playlist_id, payload, current_user.user_id
        )
    except playlist_service.InvalidSongIdsError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "존재하지 않는 곡이 포함돼 있습니다."
        ) from exc
    except playlist_service.PlaylistNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "플레이리스트를 찾을 수 없습니다.") from exc
    return await _to_recommended_response(doc)


@router.delete(
    "/recommended/campaigns/{playlist_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_recommended_campaign(
    playlist_id: str,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    try:
        await playlist_service.delete_recommended_playlist(playlist_id, current_user.user_id)
    except playlist_service.PlaylistNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "플레이리스트를 찾을 수 없습니다.") from exc
