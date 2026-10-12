from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

recommended_playlists_col = db["recommended_playlists"]


class RecommendedPlaylist(BaseEntity):
    """recommended_playlists(playlist.py) 명세. 관리자(음원총공팀)가 등록하는 권장
    스밍리스트. bustercall의 phrases와 동일하게 is_current인 것 하나만 공개
    노출되고, 나머지는 과거 등록 이력으로 soft delete 전까지 남는다.
    """

    playlist_id: UUID
    title: str = Field(min_length=1, max_length=100)
    song_ids: list[str] = Field(min_length=1)  # music_id 참조, 순서/중복 허용
    is_current: bool = False

    @classmethod
    def from_doc(cls, doc: dict) -> "RecommendedPlaylist":
        return cls(**{**doc, "playlist_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await recommended_playlists_col.create_index("is_current")
