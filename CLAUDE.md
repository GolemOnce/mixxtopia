# mixxtopia.site

NMIXX(또는 추후 타 아티스트 추가 가능) 팬을 위한 덕질 도구 모음 사이트.

## 스택

- 프론트엔드: React
- 백엔드: FastAPI

## 기능

제품 기능 명세는 GitHub Issues(label: [`product-spec`](https://github.com/GolemOnce/mixxtopia/issues?q=label%3Aproduct-spec))에서 도메인별로 관리한다(#1~#7). 도메인별 구현은 `back-end/app/router,service/`, `front-end/src/pages/`에서 확인.

- 트위터(X) 총공(해시태그 챌린지) 페이지 — **이미 구현되어 있음**(`router/bustercall.py`, `pages/BusterCall.tsx`)

## 배포/인프라

- IaC(terraform)로 인프라 관리(초기 상태 : IaC없이 EC2 내에 api 몇개 들어간 1페이지 규모 nginx로 서빙 중)
  - EC2 t3.small 사용 중
  - Docker-Compose를 활용해 하나의 인스턴스(EC2 t3.small)에 어플리케이션과 nginx, Redis를 구동하고, MongoDB는 기존에 설정된 Atlas 그대로 활용

## 기능 구현 및 코드 컨벤션

### 패키지 구조

- 백엔드는 레이어(model, schemas, service, router) 우선 분리 후 도메인별 파일로 관리(`back-end/app/` 참조)

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

## 실행 명령어

- 실행 방법은 `docs/How_to_Run.md` 참조(백엔드/프론트엔드 실행, 패키지 설치, 린트/포맷 전부 포함)
- `.claude/hooks/post_edit_check.sh`가 Write/Edit 직후 자동으로 린트를 돌림

## 하지 말아야 할 것

- 정책이 명확히 나와있지 않은 부분은 질문
- 버블/팬클럽 전용 유료 콘텐츠를 사진 검색 결과에 노출하는 코드 작성 금지
- 확인되지 않은 팬 스케줄(비공식 루머 등)을 스케줄표 데이터로 넣는 로직 금지
- 배포 서버(EC2) 직접 SSH 접속/재시작(systemctl restart 등) 금지 — 배포는 반드시
  `.github/workflows/deploy.yml`(main 브랜치 push 시 자동 CD)을 통해서만
  (`ssh`/`systemctl restart mixxtopia` 등은 `.claude/hooks/guard.sh`가 차단함)
- JWT/DB 커넥션 스트링 등 시크릿을 코드에 하드코딩 금지, 반드시 .env 사용
  (`.claude/hooks/post_edit_check.sh`가 back-end 코드 편집 시 하드코딩 패턴을 감지하면 경고)
- CORS는 mixxtopia.site 도메인만 허용, 와일드카드(*) 금지
  (`.claude/hooks/post_edit_check.sh`가 `allow_origins=["*"]` 패턴을 감지하면 경고)
