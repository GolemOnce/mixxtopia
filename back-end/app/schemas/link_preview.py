from pydantic import BaseModel


class LinkPreviewResponse(BaseModel):
    url: str
    title: str | None = None
    description: str | None = None
    image: str | None = None
    site_name: str | None = None
