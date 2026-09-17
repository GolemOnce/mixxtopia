# mixxtopia.site

NMIXX(또는 추후 타 아티스트 추가 가능) 팬을 위한 덕질 도구 모음 사이트.

## 스택

- 프론트엔드: React
- 백엔드: FastAPI

## 기능

- 메인 화면에서 현재 멜론/벅스/지니/플로/바이브/유튜브뮤직 등 주요 음원사이트에서 NMIXX 곡들의 순위(실시간/일간)표시, 컴백 예정일 등록 시 컴백 카운트다운 시간 표시, 공식적으로 알려진 가장 이른 스케줄 표시(카운트다운과 함께)
- 그룹/음반/음원/콘서트/팬미팅/방송활동 이력 소개 페이지 (정적 콘텐츠 위주)
- 스케줄표: 방송출연, 시상식, 음악축제, 콘서트, 팬미팅, 팬싸 등 **합법적으로 공개된 스케줄만** 다룸.
  - 크롤링, 수동 등록 모두 가능하게 함.
- 투표 일정: 여러 투표 관련 매체(벅스, 멜론, 엠넷플러스 등의 음원서비스나 팬앤스타, 빅크, 쿠궁 등 시상식 관련)에서 진행되는 투표
  - 크롤링, 수동 등록 모두 가능하게 함.
- 사진 검색: 공식 X(트위터)/틱톡/인스타/화보/광고 사진 등 DB화하고 사진 유사도로 언제 사진인지 찾는 기능.
  - **버블·팬클럽 전용 유료 미디어는 절대 포함 금지** — 저작권/약관 위반 소지
  - 사진 등록은 크롤링, 수동 등록 모두 가능하게 함.
- 커뮤니티 (공지, 질문, 자유게시판 등 기본적인 CRUD)
- 트위터(X) 총공(해시태그 챌린지) 페이지 — **이미 구현되어 있음**

## 배포/인프라
- IaC(terraform)로 인프라 관리(초기 상태 : IaC없이 EC2 내에 api 몇개 들어간 1페이지 규모 nginx로 서빙 중)
  - EC2 t3.small 사용 중
  - Docker-Compose를 활용해 하나의 인스턴스(EC2 t3.small)에 어플리케이션과 nginx, Redis를 구동하고, MongoDB는 기존에 설정된 Atlas 그대로 활용

## 기능 구현 및 코드 컨벤션

### 패키지 구조

```
root
├── back-end
│   └── app       
│       ├── main.py               <-- 메인
│       ├── database.py           <-- DB 연결
│       ├── router/               <-- 도메인별 라우터(controller)
│       │   ├── user.py
│       │   ├── schedule.py
│       │   ├── vote.py
│       │   ├── post.py
│       │   ├── photo.py
│       │   ├── bustercall.py
│       ├── service/              <-- 도메인별 비즈니스 로직(service)
│       │   ├── user.py
│       │   ├── schedule.py
│       │   ├── vote.py
│       │   ├── post.py
│       │   ├── photo.py
│       │   ├── bustercall.py
│       ├── model/                <-- 도메인별 모델(Entity)
│       │   ├── user.py
│       │   ├── schedule.py
│       │   ├── vote.py
│       │   ├── post.py
│       │   ├── photo.py
│       │   ├── bustercall.py
│       ├── schemas/              <-- 도메인별 스키마(dto)
│           ├── user.py
│           ├── schedule.py
│           ├── vote.py
│           ├── post.py
│           ├── photo.py
│           ├── bustercall.py
├── front-end
├── scripts
├── docs
    └─
```
- 백엔드는 레이어(model, dto, service등) 우선 분리 후 도메인별 파일로 관리

### 인증/인가
- JWT(access token 1h - HttpOnly Cookie, refresh token 7d - Redis에 refresh_token:{user_id} 기준 저장)
- OAuth2 - Gmail, Naver(https도메인 사용중)로만 회원가입 가능
  - 악성 사용자 활동 방지를 위한 IP + 접속기록 수집 동의 서명
    - (필수) 서비스 이용약관 동의
    - (필수) 개인정보 수집·이용 동의 (IP/접속기록 수집 조항 포함)
- 비로그인도 글, 사진, 스케쥴, 투표 등등 조회 기능은 모두 이용 가능
- 건의/이의제기/신고/글/댓글 쓰기 등은 로그인 후 가능

### 총공(bustercall) 서비스
- 스택: FastAPI + MongoDB(문구/클라이언트/통계) + Redis(카운터 캐시)
- 엔드포인트: `GET /api/bustercall/reroll`, `POST /api/bustercall/click`, `GET /api/bustercall/stats`, `POST /api/bustercall/campaign`(admin,manager 전용 — 총공 캠페인 등록/전환)

### database
- 사진을 제외한 도메인은 기본적으로 mongodb(Atlas) 사용하지만, schemas로 엄격히 제한하여 관리
- Redis를 활용해 자주 조회되는 일정 캐싱
- 사진/동영상 등 미디어는 S3 storage 저장 + CloudFront 캐싱 활용
  - 서버에서 직접 다루지 않고 Presigned URL 방식 사용
  - Lambda 활용해 썸네일, 리사이징 등 이미지 최적화하고, 유저가 최적화된 이미지/원본 이미지 선택해서 다운로드 가능하게 함

### schemas(dto)
- Pydantic Request/Response
- 한 파일 내에 Request와 Response 모두 정의
- dto의 class 이름은 `{도메인}{목적}{Request또는Response} `
  - 예) class UserCreateResponse(BaseModel):
- dto 필드 형식은 name: str 처럼 `필드명: 자료형`으로 작성

### Logging
- 악성 사용자 활동 방지를 위한 IP + 접속기록 로깅 + 이용약관에 명시
- 회원가입 시점 IP, 게시글/댓글 작성 시점 IP 3개월 저장

### 코드 컨벤션
- Black 규칙(ruff format)에 맞는 코드 스타일
  - 최상위 함수/클래스 사이: 2줄
  - 클래스 내부 메서드 사이: 1줄
  - import 구문과 코드 사이: 2줄
- 파일 끝 개행 한 줄
- api 리소스는 복수형(post->posts, schedule->schedules, vote->votes), 페이지 주소는 단수형(board, schedule, vote...)

### API 명세서
- docs/api-spec.md 참조

### 테이블 명세서
- docs/db-schema.md 참조

## 실행 명령어 (플레이스홀더 — 실제 명령어로 교체 필요)

```bash
# 백엔드 (경로: back-end/)
.venv/Scripts/activate            # Windows. macOS/Linux는 .venv/bin/activate
uvicorn app.main:app --reload
# venv를 활성화해도 uvicorn을 못 찾으면(예: CI/CD 스크립트):
.venv/Scripts/Python.exe -m uvicorn app:app --reload

# 패키지 설치는 uv 사용 (pip보다 훨씬 빠름, pip 호환 — requirements.txt 그대로 사용)
uv pip install -r requirements.txt
uv pip install -r requirements-dev.txt   # ruff 등 개발용 도구 포함

# 프론트엔드 (경로: front-end/)
npm run dev       # 개발 서버
npm run build     # tsc && vite build — front-end/dist/에 정적 파일 생성
npm run preview   # 빌드 결과 로컬 프리뷰

# 테스트
# 아직 없음. docs/cicd.md 참고 — 현재 CI에 테스트 단계 없이 CD(배포)만 존재.

# 린트/포맷
# front-end: ESLint(flat config, eslint.config.js) + typescript-eslint +
#   eslint-plugin-react-hooks/react-refresh, 포맷은 Prettier.
npm run lint       # front-end/ — eslint .
npm run lint:fix    # front-end/ — eslint . --fix
npm run format      # front-end/ — prettier --write .

# back-end: ruff (린트+포맷+import 정리, back-end/pyproject.toml에 설정).
uv pip install -r requirements-dev.txt   # back-end/ — ruff 포함 설치
ruff check .        # back-end/ — 린트
ruff format .        # back-end/ — 포맷

# .claude/hooks/post_edit_check.sh가 편집 직후 위 도구로 자동 체크함
# (node_modules/venv에 설치 전이면 tsc --noEmit / py_compile로 폴백).
```

## 하지 말아야 할 것
- 정책이 명확히 나와있지 않은 부분은 질문
- 버블/팬클럽 전용 유료 콘텐츠를 사진 검색 결과에 노출하는 코드 작성 금지
- 확인되지 않은 팬 스케줄(비공식 루머 등)을 스케줄표 데이터로 넣는 로직 금지
- 배포 서버(EC2) 직접 SSH 접속/재시작(systemctl restart 등) 금지 — 배포는 반드시
  `.github/workflows/deploy.yml`(main 브랜치 push 시 자동 CD)을 통해서만
- JWT/DB 커넥션 스트링 등 시크릿을 코드에 하드코딩 금지, 반드시 .env 사용
- CORS는 mixxtopia.site 도메인만 허용, 와일드카드(*) 금지