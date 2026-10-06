# x-crawler

X 공식 계정 아카이빙 크롤러 (Playwright + GraphQL 응답 가로채기)

## 세팅
```bash
cd x_crawler
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
cp .env.example .env            # 기본값 그대로면 로컬 Mongo/S3용 docker-compose와 맞음

docker compose up -d            # 로컬 테스트용 Mongo + S3 호환(LocalStack) 컨테이너
python save_session.py          # 최초 1회: 크롤링 전용 계정으로 수동 로그인
```

## 실행 (레포 루트 `mixxtopia/`에서)
```bash
python -m x_crawler.main                     # 전체 계정
python -m x_crawler.main --account WE_NMIXX   # 계정 하나만
```
`main.py`/하위 모듈이 전부 패키지 상대 임포트(`from .models import ...`)를 쓰고 있어서
`python x_crawler/main.py`처럼 직접 실행하면 깨진다 — 항상 `-m x_crawler.main` 형태로.
`save_session.py`는 상대 임포트가 없어 예외적으로 `x_crawler/` 안에서 직접 실행해도 된다.

## 구조
```
save_session.py   로그인 세션 저장 (단독 실행)
main.py           계정별 실행 오케스트레이션 + mixxtopia 연동 호출
browser.py        프로필 열고 타임라인 GraphQL 응답 가로채기 + 스크롤(오퍼레이션 이름 목록은 OPERATION_NAMES)
parser.py         GraphQL JSON → Tweet  (구조 바뀌면 여기만 수정)
media.py          원본 이미지 / 최고화질 mp4 다운로드 (로컬 저장)
storage.py        SQLite (tweets, media, crawl_state) — 로컬 아카이브 + 중복 방지
formatter.py      정리글 생성([YYMMDD] 제목, KST 변환, post_type 분류) → data/posts/*.json
env.py            .env 로드(Mongo/S3 접속 정보)
mongo_sync.py      officials 컬렉션에 직접 insert (created_by="auto")
s3_upload.py       다운로드한 사진/영상 전부를 S3/로컬 S3 호환 스토리지에 업로드
```

## mixxtopia 연동
`config.yaml`의 `mixxtopia_sync.enabled: true`면, 새 트윗을 처리할 때마다
(1) 그 트윗의 사진·영상 원본을 전부 S3에 업로드하고(로컬 디스크에만 남기지 않음, 사진은
`photo_links`에 최대 4장까지 담고 영상은 S3엔 올라가되 DB엔 안 걸림) (2) `officials`
컬렉션에 바로 문서를 insert한다.
`docs/api-spec.md` 정책대로 `POST /api/officials` API를 거치지 않고 DB에 직접 적재하며,
`created_by`는 UUID 대신 문자열 `"auto"`를 쓴다(`app.model.official.Official.created_by`가
이를 위해 `UUID | str`로 넓혀져 있음). 문서 포맷은 백엔드가 실제로 만드는 것과 동일하게
맞춰져 있어서(특히 날짜가 ISO 문자열인 것) `GET /api/officials`로 그대로 조회된다.

- **로컬 테스트**: `docker-compose.yml`로 뜨는 Mongo(`localhost:27018`)와
  LocalStack S3(`localhost:4566`, 버킷 공개 읽기 정책 자동 설정)를 바라본다.
- **실서버 적재**: `.env`의 `MONGODB_URI`/`S3_*`를 Atlas·실 S3 값으로 바꾸면 그대로 동작한다
  (`S3_PUBLIC_BASE_URL`은 CloudFront 도메인으로).
- `config.yaml`의 계정별 `official_account` 값이 `app.model.official.OfficialAccount`
  enum과 일치해야 한다.
- `mixxtopia_sync.enabled: false`면 지금까지처럼 로컬 SQLite + JSON 아카이빙까지만 한다.

## 주의
- `session/`에는 로그인 토큰이 들어있음. 커밋 금지 (.gitignore 처리됨)
- `.env`도 커밋 금지(.gitignore 처리됨) — Mongo/S3 접속 정보가 들어있음
- 계정별 주기를 다르게 하려면 cron에서 `--account`로 따로 실행
