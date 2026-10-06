"""Playwright로 직접 로그인하면 X가 자동화 브라우저로 탐지해서 막는 경우가 있다
(save_session.py가 "로그인이 일시적으로 제한되었습니다"로 막히는 경우).
그럴 땐 평소 쓰는 실제 브라우저에서 정상 로그인한 뒤, 쿠키 값만 몇 개 꺼내 와서 세션을 만든다.

X 로그인 세션은 사실상 auth_token + ct0 두 개만 있으면 GraphQL 호출이 인증된 상태로
동작한다(둘 다 필수). 나머지는 있으면 같이 넣는 정도로 충분.

사용법:
1. 평소 쓰는 크롬에서 x.com에 정상 로그인(크롤링 전용 계정으로)
2. Cookie Editor 확장에서 x.com 목록을 펼쳐서, 아래 쿠키를 하나씩 클릭 →
   오른쪽 패널의 Value 칸 내용을 복사
     - auth_token, ct0  (필수)
     - guest_id, twid, auth_multi, personalization_id  (있으면 같이, 없어도 됨)
   (암호화된 Export 버튼 말고, 쿠키 하나 클릭했을 때 뜨는 Value 칸을 보는 것)
3. cookies_manual.example.txt를 cookies_manual.txt로 복사하고 값 채우기
   (키=값 한 줄씩이라 JSON처럼 따옴표/콤마 때문에 깨질 일이 없음)
4. python import_cookies.py 실행 → session/state.json 생성됨
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MANUAL_PATH = BASE_DIR / "cookies_manual.txt"
SESSION_PATH = BASE_DIR / "session" / "state.json"

HTTP_ONLY = {"auth_token"}  # 실제 X에서도 httpOnly인 쿠키
REQUIRED = {"auth_token", "ct0"}


def parse_kv_file(path: Path) -> dict[str, str]:
    result = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        result[key.strip()] = value.strip()
    return result


def main() -> None:
    if not MANUAL_PATH.exists():
        raise SystemExit(
            f"{MANUAL_PATH} 가 없습니다. cookies_manual.example.txt를 복사해서 값을 채우세요."
        )

    raw = parse_kv_file(MANUAL_PATH)

    cookies = []
    for name, value in raw.items():
        if not value:
            continue
        cookies.append(
            {
                "name": name,
                "value": value,
                "domain": ".x.com",
                "path": "/",
                "expires": 9999999999,  # 충분히 먼 미래 — Playwright가 만료로 취급 안 하게
                "httpOnly": name in HTTP_ONLY,
                "secure": True,
                "sameSite": "Lax",
            }
        )

    missing = REQUIRED - {c["name"] for c in cookies}
    if missing:
        raise SystemExit(f"필수 쿠키 값이 비어있습니다: {missing}")

    state = {"cookies": cookies, "origins": []}
    SESSION_PATH.parent.mkdir(parents=True, exist_ok=True)
    SESSION_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"세션 저장 완료: {SESSION_PATH} (쿠키 {len(cookies)}개)")
    print(f"확인 끝났으면 {MANUAL_PATH}는 지워도 됩니다(로그인 토큰이 든 평문 파일이라).")


if __name__ == "__main__":
    main()
