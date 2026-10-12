from uuid import UUID, uuid4

from pymongo import ReturnDocument

from app.model.base import utcnow
from app.model.music import music_col
from app.model.playlist import RecommendedPlaylist, recommended_playlists_col
from app.schemas.playlist import RecommendedPlaylistCreateRequest, RecommendedPlaylistUpdateRequest


class PlaylistNotFoundError(Exception):
    pass


class InvalidSongIdsError(Exception):
    pass


async def list_songs() -> list[dict]:
    return [doc async for doc in music_col.find({"deleted_at": None}).sort("song", 1)]


async def resolve_songs(song_ids: list[str]) -> list[dict]:
    """song_ids 순서/중복을 그대로 유지한 채 music 문서로 치환한다. 참조가 끊긴
    (삭제된) 곡은 조용히 건너뛴다."""

    docs = {doc["_id"]: doc async for doc in music_col.find({"_id": {"$in": list(set(song_ids))}})}
    return [docs[sid] for sid in song_ids if sid in docs]


async def _validate_song_ids(song_ids: list[str]) -> None:
    unique_ids = set(song_ids)
    count = await music_col.count_documents({"_id": {"$in": list(unique_ids)}, "deleted_at": None})
    if count != len(unique_ids):
        raise InvalidSongIdsError()


async def get_current_recommended() -> dict | None:
    return await recommended_playlists_col.find_one({"is_current": True, "deleted_at": None})


async def list_recommended_playlists() -> list[dict]:
    return [
        doc
        async for doc in recommended_playlists_col.find({"deleted_at": None}).sort("updated_at", -1)
    ]


async def create_recommended_playlist(
    payload: RecommendedPlaylistCreateRequest, created_by: UUID
) -> dict:
    await _validate_song_ids(payload.song_ids)

    playlist = RecommendedPlaylist(
        playlist_id=uuid4(),
        title=payload.title,
        song_ids=payload.song_ids,
        is_current=True,
        created_by=created_by,
    )
    doc = playlist.model_dump(mode="json")
    doc["_id"] = doc.pop("playlist_id")

    await recommended_playlists_col.update_many(
        {"is_current": True}, {"$set": {"is_current": False}}
    )
    await recommended_playlists_col.insert_one(doc)
    return doc


async def update_recommended_playlist(
    playlist_id: str, payload: RecommendedPlaylistUpdateRequest, updated_by: UUID
) -> dict:
    await _validate_song_ids(payload.song_ids)

    doc = await recommended_playlists_col.find_one_and_update(
        {"_id": playlist_id, "deleted_at": None},
        {
            "$set": {
                "title": payload.title,
                "song_ids": payload.song_ids,
                "is_current": True,
                "updated_at": utcnow(),
                "updated_by": str(updated_by),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise PlaylistNotFoundError()

    await recommended_playlists_col.update_many(
        {"is_current": True, "_id": {"$ne": playlist_id}}, {"$set": {"is_current": False}}
    )
    return doc


async def delete_recommended_playlist(playlist_id: str, deleted_by: UUID) -> None:
    before = await recommended_playlists_col.find_one_and_update(
        {"_id": playlist_id, "deleted_at": None},
        {"$set": {"deleted_at": utcnow(), "deleted_by": str(deleted_by), "is_current": False}},
    )
    if not before:
        raise PlaylistNotFoundError()
