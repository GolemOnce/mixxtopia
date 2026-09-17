from pydantic import BaseModel, Field

from app.model.user import OAuthProvider, UserRole


class AuthSignupRequest(BaseModel):
    oauth: OAuthProvider
    access_token: str
    nickname: str = Field(min_length=1, max_length=8)
    agree_terms: bool
    agree_privacy: bool


class AuthSignupResponse(BaseModel):
    user_id: str
    oauth: OAuthProvider
    nickname: str
    role: UserRole


class AuthLoginRequest(BaseModel):
    oauth: OAuthProvider
    access_token: str


class AuthLoginResponse(BaseModel):
    user_id: str
    oauth: OAuthProvider
    nickname: str
    role: UserRole


class AuthLogoutResponse(BaseModel):
    ok: bool


class AuthRefreshResponse(BaseModel):
    ok: bool


class UserProfileResponse(BaseModel):
    user_id: str
    nickname: str


class UserProfileUpdateRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=8)


class UserBlockResponse(BaseModel):
    ok: bool


class UserBlacklistResponse(BaseModel):
    blocked_user_ids: list[str]


class UserReportRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=1000)


class UserReportResponse(BaseModel):
    suggest_id: str
