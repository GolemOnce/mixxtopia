import httpx

from app.model.user import OAuthProvider

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
NAVER_USERINFO_URL = "https://openapi.naver.com/v1/nid/me"


class OAuthVerificationError(Exception):
    pass


async def fetch_oauth_email(provider: OAuthProvider, access_token: str) -> str | None:
    """프론트엔드가 발급받은 provider access token을 provider userinfo API로 검증하고
    이메일을 반환한다. 토큰이 유효하지 않으면 OAuthVerificationError."""

    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=5.0) as client:
        if provider == OAuthProvider.gmail:
            resp = await client.get(GOOGLE_USERINFO_URL, headers=headers)
            if resp.status_code != 200:
                raise OAuthVerificationError("invalid gmail access token")
            return resp.json().get("email")

        if provider == OAuthProvider.naver:
            resp = await client.get(NAVER_USERINFO_URL, headers=headers)
            body = resp.json()
            if resp.status_code != 200 or body.get("resultcode") != "00":
                raise OAuthVerificationError("invalid naver access token")
            return body.get("response", {}).get("email")

    raise OAuthVerificationError("unsupported oauth provider")
