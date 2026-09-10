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
