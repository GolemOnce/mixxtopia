# 테이블 명세서
- BaseEntity 모든 테이블에 적용
  - phrases, record, suggest 제외
- 기본적으로 soft delete 방식, 조회 시 deleted_at 체크 필수

## BaseEntity
- created_at	TIMESTAMP	생성일
- created_by	UUID	생성자
- updated_at	TIMESTAMP	NULLABLE	수정일
- updated_by	UUID	NULLABLE	수정자
- deleted_at	TIMESTAMP	NULLABLE	삭제일
- deleted_by	UUID	NULLABLE	삭제자

## users(user.py)
- user_id	UUID	PK
- oauth	varchar(10)	outh종류(gmail, naver)
- nickname	varchar(8)	닉네임
- email	varchar(32)	NULLABLE 이메일(연동 여부)
- role	enum	인가 등급(admin, manager, user)
- terms_agreed_at	TIMESTAMP	서비스 이용약관 동의 시각
- privacy_agreed_at	TIMESTAMP	개인정보 수집·이용 동의 시각

### 참고
- role, terms_agreed_at, privacy_agreed_at은 최초 명세에는 없었으나, CLAUDE.md의 인가(role 기반 권한 분기)·필수 약관 동의 서명 요구사항 구현을 위해 auth API 구현 시 추가함
- (oauth, email) 조합에 unique index. Gmail/Naver 로그인 시 프론트가 받은 provider access token을 백엔드가 provider의 userinfo API로 검증해 이메일을 얻고, 이 조합으로 기존 회원을 조회함 — 즉 email은 OAuth 재로그인 매칭의 실질적 키이므로 회원가입 시 provider가 이메일을 내려주지 않으면(이메일 동의 거부 등) 가입 실패 처리
- _id(Mongo PK)에 user_id(UUID)를 문자열로 그대로 사용(중복 저장 방지)

## access_logs(신규, 접속기록)
- user_id	UUID	접속한 사용자(users_id 참조)
- ip	varchar(45)	접속 IP
- action	enum	기록 사유(signup, post_create, comment_create)
- created_at	TIMESTAMP	기록 시각

### 참고
- 최초 명세에는 없던 컬렉션. CLAUDE.md "회원가입 시점 IP, 게시글/댓글 작성 시점 IP 3개월 저장" 요구사항 구현을 위해 추가
- created_at 기준 TTL 인덱스(90일)로 자동 만료
- 현재는 회원가입 시점만 기록. 게시글/댓글 작성 시 기록은 해당 도메인 구현 시 app.core.access_log.write_access_log 재사용 예정

## votes(vote.py)
- vote_id	UUID	PK
- title	varchar(100)	제목
- content	varchar(500)	내용
- member	array<string>	멤버
- link	varchar(200)	투표 링크
- organizer	varchar(50)	주관
- start_at	TIMESTAMP	시작
- end_at	TIMESTAMP	끝

## schedules(schedule.py)
- schedule_id	UUID	PK
- title	varchar(100)	제목
- content	varchar(500)	내용
- member	array<string>	멤버
- category	enum	스케줄 종류
- link	varchar(200)	투표 링크
- organizer	varchar(50)	주관
- location	varchar(50) 장소
- start_at	TIMESTAMP	시작
- end_at	TIMESTAMP	끝

## posts(post.py)
- post_id	INT	PK
- author_id	UUID	작성자(users_id 참조)
- title	varchar(100)	제목
- content	varchar(1000)	내용

### 참고
- post_id만 유일하게 int형(1부터 increase)으로 pk생성
  - app.service.post에서 pk생성해주는 __함수 구현

## comments(comment.py)
- comment_id	UUID	PK
- post_id	INT	게시글 id(posts_id 참조)
- author_id	UUID	작성자(users_id 참조)
- parent_id	UUID	NULLABLE 부모 댓글
- mention_to UUID NULLABLE 답글 대상의 users_id9(태그용)
- content	varchar(100)	내용

### 참고
- 부모 댓글이 없는 경우 일반 댓글
- 부모 댓글이 있는 경우 대댓글(답글)
- 특정 게시글 조회 시, 해당 게시글의 모든 댓글(대댓글 포함) DB 쿼리 레벨에서 페이지네이션, 답글 트리 조립은 그 페이지 안에서만(최상위 댓글(최신순/등록순 브라우저에서 선택 가능) 기준으로 20개 페이지네이션하고, 그 댓글들의 답글도 통째로 같이 가져오는 방식)
  - 답글이 있는 댓글의 경우 "답글 n개"로 댓글 아래 표시 후, "답글 n개"를 누르면 답글 렌더링 

## phrases(bustercall.py, 총공문구)
- phrases_id	UUID	PK
- category	enum	총공 종류(컴백, 생일, n주년)
- detail varchar(16) 총공 종류 상세
- member	varchar(16)	멤버
- pairs	array<array<string(50)>>	유동문구(3줄로 구성, 본문 1,3,5번째 줄)
- fixed2	varchar(50)	고정문구1(해시태그, 본문 2번째줄)
- fixed4	varchar(50)	고정문구2(해시태그, 본문 4번째줄)
- is_current	boolean	현재 진행 중인 캠페인

### 참고
- category enum (컴백(comeback), 생일(birthday), n주년(debut))
- detail 컴백의 경우 "곡 이름"(예_Heavy Seranade), 생일은 "YYYY"(예_2026), n주년은 "n"(예_5)
- db에서 "mixxpia" Database의 "phrases" 컬렉션에서 category와 detail조합으로
- member는 생일일 경우 단일 멤버 이름(lily, haewon, sullyoon, bae, jiwoo, kyujin)으로, 컴백이나 n주년은 nmixx로 구분.
- 유동문구1+고정문구1+유동문구2+고정문구2+유동문구3 으로 조합됨(app.service.bustercall의 get_phrases)
- is_current는 최초 명세에 없던 필드로, 관리자가 `POST /bustercall/campaign`으로 총공 종류(category)+상세(detail)를 선택하면 해당 (category, detail) 문서를 upsert하고 is_current=true, 나머지는 false로 전환하기 위해 추가함. (category, detail) 조합에 unique index
- `GET /bustercall/reroll`은 is_current=true 문서를 조회하며, Redis(`hashtag:phrases`)에 캐싱해 매 요청마다 Mongo를 조회하지 않음. `POST /bustercall/campaign`이 전환 시점에 캐시도 함께 갱신(write-through)
- 기존 "hashtag" Mongo DB(레거시 총공 DB)는 더 이상 쓰지 않고 mixxtopia DB의 phrases 컬렉션으로 통합함

## record(record.py, 총공 집계 로그)
- record_id	UUID	PK
- phrases_id	UUID	총공문구id(phrases_id 참조)
- total_clicks	integer	총 클릭 수
- unique_clients	integer	이용자 수
- created_at	TIMESTAMP	캠페인 종료(sync) 시점

### 참고
- 총공은 1회성 캠페인(한 번에 하나만 진행, 겹치지 않음)이라 Redis 카운터는 전역 키 사용
- 캠페인 종료 시 관리자가 POST /bustercall/sync 호출 → Redis 값을 record에 insert 후 리셋
- phrases_id별로 여러 row가 쌓일 수 있음(캠페인마다 1건씩 로그)

## suggest(suggest.py, 건의함)
- suggest_id    UUID    PK
- title varchar(100)    제목
- content varchar(1000) 내용
- email varchar(200) 피드백 받을 이메일
- status enum(pending, read, done) 처리상태

### 참고
- 관리자 전용 페이지에서 조회