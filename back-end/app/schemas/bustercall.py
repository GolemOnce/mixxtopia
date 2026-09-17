from pydantic import BaseModel, Field

from app.model.bustercall import BustercallCategory


class BustercallCampaignCreateRequest(BaseModel):
    category: BustercallCategory
    detail: str = Field(min_length=1, max_length=16)
    member: str = Field(min_length=1, max_length=16)
    pairs: list[tuple[str, str, str]] = Field(min_length=1)
    fixed2: str = Field(min_length=1, max_length=50)
    fixed4: str = Field(min_length=1, max_length=50)


class BustercallCampaignUpdateRequest(BaseModel):
    pairs: list[tuple[str, str, str]] = Field(min_length=1)
    fixed2: str = Field(min_length=1, max_length=50)
    fixed4: str = Field(min_length=1, max_length=50)


class BustercallCampaignResponse(BaseModel):
    phrases_id: str
    category: BustercallCategory
    detail: str
    member: str
    pairs: list[list[str]]
    fixed2: str
    fixed4: str
    is_current: bool
