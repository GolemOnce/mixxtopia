from uuid import UUID

from pydantic import Field

from app.database import db
from app.model.base import BaseEntity

music_col = db["music"]


class Music(BaseEntity):
    """music(music.py) 명세. 플레이리스트 커스텀용 음원사이트별 곡 번호 참조 테이블.

    music_crawler/load_mongo.py가 API를 거치지 않고 직접 적재한다(created_by="auto") —
    officials의 x_crawler와 동일한 패턴이라 BaseEntity의 UUID 타입을 str까지 허용.
    """

    music_id: UUID
    song: str = Field(min_length=1, max_length=50)
    album: str = Field(min_length=1, max_length=100)
    album_cover: str | None = None
    artist: str = Field(min_length=1, max_length=50)
    duration: str | None = Field(default=None, max_length=5)
    melon: str | None = Field(default=None, max_length=16)
    genie: str | None = Field(default=None, max_length=16)
    bugs: str | None = Field(default=None, max_length=16)
    flo: str | None = Field(default=None, max_length=16)
    vibe: str | None = Field(default=None, max_length=16)
    created_by: UUID | str

    @classmethod
    def from_doc(cls, doc: dict) -> "Music":
        return cls(**{**doc, "music_id": UUID(doc["_id"])})


async def ensure_indexes() -> None:
    await music_col.create_index("song")
