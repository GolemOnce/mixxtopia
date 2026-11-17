from pydantic import BaseModel, Field


class ScheduleCategoryCreateRequest(BaseModel):
    category_id: str = Field(min_length=1, max_length=20, pattern=r"^[a-z0-9_]+$")
    label: str = Field(min_length=1, max_length=20)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")


class ScheduleCategoryUpdateRequest(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=20)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class ScheduleCategoryResponse(BaseModel):
    category_id: str
    label: str
    color: str
    order: int
