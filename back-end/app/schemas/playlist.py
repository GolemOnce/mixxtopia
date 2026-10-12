from pydantic import BaseModel, Field


class PlaylistSongResponse(BaseModel):
    music_id: str
    song: str
    album: str
    album_cover: str | None
    artist: str
    duration: str | None
    melon: str | None
    genie: str | None
    bugs: str | None
    flo: str | None
    vibe: str | None


class RecommendedPlaylistCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    song_ids: list[str] = Field(min_length=1)


class RecommendedPlaylistUpdateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    song_ids: list[str] = Field(min_length=1)


class RecommendedPlaylistResponse(BaseModel):
    playlist_id: str
    title: str
    songs: list[PlaylistSongResponse]
    is_current: bool
