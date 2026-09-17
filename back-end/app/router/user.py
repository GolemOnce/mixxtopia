from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.deps import get_client_ip, get_current_user, require_self_or_roles
from app.core.oauth import OAuthVerificationError
from app.core.security import (
    REFRESH_TOKEN_COOKIE,
    InvalidTokenError,
    clear_auth_cookies,
    set_auth_cookies,
)
from app.model.user import User, UserRole
from app.schemas.user import (
    AuthLoginRequest,
    AuthLoginResponse,
    AuthLogoutResponse,
    AuthRefreshResponse,
    AuthSignupRequest,
    AuthSignupResponse,
    UserBlacklistResponse,
    UserBlockResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserReportRequest,
    UserReportResponse,
)
from app.service import user as user_service

router = APIRouter(prefix="/api/users", tags=["user"])
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


@auth_router.post("/signup", response_model=AuthSignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: AuthSignupRequest, request: Request, response: Response):
    try:
        user, access_token, refresh_token = await user_service.signup(
            payload, get_client_ip(request)
        )
    except user_service.ConsentRequiredError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "서비스 이용약관 및 개인정보 수집·이용에 모두 동의해야 합니다.",
        ) from exc
    except user_service.OAuthEmailRequiredError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "OAuth 계정에서 이메일을 가져올 수 없습니다."
        ) from exc
    except user_service.UserAlreadyExistsError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "이미 가입된 계정입니다.") from exc
    except OAuthVerificationError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "유효하지 않은 OAuth access token입니다."
        ) from exc

    set_auth_cookies(response, access_token, refresh_token)
    return AuthSignupResponse(
        user_id=str(user.user_id), oauth=user.oauth, nickname=user.nickname, role=user.role
    )


@auth_router.post("/login", response_model=AuthLoginResponse)
async def login(payload: AuthLoginRequest, response: Response):
    try:
        user, access_token, refresh_token = await user_service.login(payload)
    except user_service.OAuthEmailRequiredError as exc:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "OAuth 계정에서 이메일을 가져올 수 없습니다."
        ) from exc
    except user_service.UserNotFoundError as exc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "가입되지 않은 계정입니다. 회원가입을 먼저 진행해주세요."
        ) from exc
    except OAuthVerificationError as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "유효하지 않은 OAuth access token입니다."
        ) from exc

    set_auth_cookies(response, access_token, refresh_token)
    return AuthLoginResponse(
        user_id=str(user.user_id), oauth=user.oauth, nickname=user.nickname, role=user.role
    )


@auth_router.post("/logout", response_model=AuthLogoutResponse)
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    await user_service.logout(current_user.user_id)
    clear_auth_cookies(response)
    return AuthLogoutResponse(ok=True)


@auth_router.post("/refresh", response_model=AuthRefreshResponse)
async def refresh(request: Request, response: Response):
    token = request.cookies.get(REFRESH_TOKEN_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "리프레시 토큰이 없습니다.")

    try:
        _, access_token, refresh_token = await user_service.refresh(token)
    except InvalidTokenError as exc:
        clear_auth_cookies(response)
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "유효하지 않은 리프레시 토큰입니다."
        ) from exc

    set_auth_cookies(response, access_token, refresh_token)
    return AuthRefreshResponse(ok=True)


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_profile(user_id: str):
    try:
        user = await user_service.get_profile(user_id)
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 사용자입니다.") from exc
    return UserProfileResponse(user_id=str(user.user_id), nickname=user.nickname)


@router.patch("/{user_id}", response_model=UserProfileResponse)
async def update_profile(
    user_id: str,
    payload: UserProfileUpdateRequest,
    current_user: User = Depends(require_self_or_roles(UserRole.admin, UserRole.manager)),
):
    try:
        user = await user_service.update_profile(user_id, payload.nickname, current_user.user_id)
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 사용자입니다.") from exc
    return UserProfileResponse(user_id=str(user.user_id), nickname=user.nickname)


@router.post("/{user_id}/block", response_model=UserBlockResponse)
async def block_user(user_id: str, current_user: User = Depends(get_current_user)):
    try:
        await user_service.block_user(current_user.user_id, user_id)
    except user_service.SelfActionNotAllowedError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "자기 자신은 차단할 수 없습니다.") from exc
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 사용자입니다.") from exc
    return UserBlockResponse(ok=True)


@router.delete("/{user_id}/unblock", response_model=UserBlockResponse)
async def unblock_user(user_id: str, current_user: User = Depends(get_current_user)):
    await user_service.unblock_user(current_user.user_id, user_id)
    return UserBlockResponse(ok=True)


@router.get("/{user_id}/blacklist", response_model=UserBlacklistResponse)
async def get_blacklist(
    user_id: str,
    _current_user: User = Depends(require_self_or_roles(UserRole.admin, UserRole.manager)),
):
    try:
        blocked = await user_service.get_blacklist(user_id)
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 사용자입니다.") from exc
    return UserBlacklistResponse(blocked_user_ids=blocked)


@router.post(
    "/{user_id}/report", response_model=UserReportResponse, status_code=status.HTTP_201_CREATED
)
async def report_user(
    user_id: str,
    payload: UserReportRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        suggest = await user_service.report_user(current_user.user_id, user_id, payload)
    except user_service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "존재하지 않는 사용자입니다.") from exc
    return UserReportResponse(suggest_id=str(suggest.suggest_id))
