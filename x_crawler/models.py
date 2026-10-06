from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Media:
    type: str  # photo | video | animated_gif
    url: str   # 다운로드할 원본 URL
    ext: str


@dataclass
class Tweet:
    id: str
    username: str
    text: str
    created_at: datetime          # UTC
    media: list[Media] = field(default_factory=list)
    is_retweet: bool = False
    is_reply: bool = False         # 다른 계정에 단 답글 (자기 타래는 False)
    quoted_id: str | None = None
    conversation_id: str | None = None
    raw: dict = field(default_factory=dict, repr=False)
