"""최초 1회: 브라우저에서 직접 로그인 → 세션(쿠키) 저장.
로그인 자동화는 봇 탐지에 걸리기 쉬워서 수동으로 한다. 크롤링 전용 계정 사용 권장.

X/Google 둘 다 Playwright로 띄운 브라우저를 자동화 도구로 탐지해서(navigator.webdriver 등)
사람이 직접 로그인해도 거부/제한할 수 있다. 아래 설정들은 그 탐지 신호를 최대한 줄인다:
- --disable-blink-features=AutomationControlled: 가장 흔한 탐지 플래그(navigator.webdriver)를 숨김
- launch_persistent_context: 매번 새로 생기는 임시 프로필이 아니라 디스크에 남는 프로필을 써서
  "한 번도 못 본 기기"로는 덜 보이게 함
- 일반 데스크톱 크롬과 동일한 User-Agent

그래도 "로그인이 일시적으로 제한되었습니다"가 뜨면 탐지보다 단순 rate-limit일 가능성이 커서,
여러 번 연속 재시도하지 말고 시간을 두고(수십분~몇 시간) 다시 시도하는 게 낫다."""
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).resolve().parent
SESSION_PATH = BASE_DIR / "session" / "state.json"
PROFILE_DIR = BASE_DIR / "session" / "profile"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
)


def main() -> None:
    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            str(PROFILE_DIR),
            headless=False,
            locale="ko-KR",
            timezone_id="Asia/Seoul",
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 900},
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://x.com/login")
        input("브라우저에서 로그인 끝내고 홈 타임라인 뜨면 엔터 >>> ")
        context.storage_state(path=str(SESSION_PATH))
        context.close()
    print(f"세션 저장 완료: {SESSION_PATH}")


if __name__ == "__main__":
    main()
