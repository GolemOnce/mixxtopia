# 테이블 명세서
- BaseEntity 모든 테이블에 적용
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
- blocked_user_ids	array<UUID>	이 유저가 차단한 유저 id 목록

### 참고
- role, terms_agreed_at, privacy_agreed_at, blocked_user_ids는 최초 명세에는 없었으나, CLAUDE.md의 인가(role 기반 권한 분기)·필수 약관 동의 서명·차단 API 요구사항 구현을 위해 추가함
- (oauth, email) 조합에 unique index. Gmail/Naver 로그인 시 프론트가 받은 provider access token을 백엔드가 provider의 userinfo API로 검증해 이메일을 얻고, 이 조합으로 기존 회원을 조회함 — 즉 email은 OAuth 재로그인 매칭의 실질적 키이므로 회원가입 시 provider가 이메일을 내려주지 않으면(이메일 동의 거부 등) 가입 실패 처리
- _id(Mongo PK)에 user_id(UUID)를 문자열로 그대로 사용(중복 저장 방지)
- 차단은 별도 컬렉션 없이 유저 문서에 배열로 직접 관리(개인 차단목록이라 규모가 작음). 자기 자신 차단은 400으로 거절
- `GET/PATCH /users/{user_id}`는 프로필 조회/수정 — 조회는 인증 불필요(비로그인 포함 전체 공개), 수정은 본인 또는 admin/manager만(`require_self_or_roles`)
- 신고(`POST /users/{user_id}/report`)는 suggest 컬렉션에 `category=report_user`로 저장 — 아래 suggest 참고

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
- organizer	varchar(50)	주관(벅스/멜론/엠넷플러스/팬앤스타/빅크/쿠궁 등 투표 매체, enum 아닌 자유 텍스트)
- start_at	TIMESTAMP	시작
- end_at	TIMESTAMP	끝

### 참고
- schedules와 구조가 거의 동일(엔티티 구현도 동일 패턴)하나 category/location 없음
- 등록/수정 시 start_at이 end_at보다 늦으면 400으로 거절
- 목록 조회는 member/organizer 쿼리파라미터로 필터링, start_at 오름차순 정렬이 기본값

## schedules(schedule.py)
- schedule_id	UUID	PK
- title	varchar(100)	제목
- content	varchar(500)	내용
- member	array<string>	멤버
- category	varchar(20)	스케줄 종류
- link	varchar(200)	관련 링크
- organizer	varchar(50)	주관
- location	varchar(50) 장소
- start_at	TIMESTAMP	시작
- end_at	TIMESTAMP	끝

### 참고
- link의 설명이 원래 "투표 링크"로 되어있었는데 votes 테이블에서 복사하며 생긴 오타로 보여 "관련 링크"로 정정함(필드 자체는 그대로)
- category는 원래 고정 enum(`ScheduleCategory`: broadcast, award, festival, concert, fanmeeting, fansign, etc)이었으나 자유 문자열로 완화함 — 새 스케줄 종류가 생길 때마다 코드 배포가 필요해지는 문제가 있었고, votes.organizer처럼 이 값에 따라 분기하는 로직이 없어(권한이 갈리는 posts.category와 다름) enum으로 강제할 실익이 없다고 판단
- 기존 값들은 `app/model/schedule.py`의 `SUGGESTED_SCHEDULE_CATEGORIES`에 자동완성 힌트로만 남겨둠(검증에는 안 쓰임). 프론트는 기존에 등록된 값 + 이 힌트를 합쳐 `<datalist>`로 자동완성 제공, 새 값도 자유롭게 입력 가능
- 등록/수정 시 start_at이 end_at보다 늦으면 400으로 거절
- 목록 조회는 category/member 쿼리파라미터로 필터링, start_at 오름차순 정렬이 기본값. "지난 일정 숨기기" 필터는 실제 달력/게시판 화면 만들 때 필요한 형태로 다시 추가 예정(빼둠)

## posts(post.py)
- post_id	UUID	PK
- post_num INT 게시글 번호
- author_id UUID 작성자(users_id 참조)
- author  varchar(8)	작성자 닉네임(작성 시점 스냅샷)
- category enum 글 종류
- title	varchar(100)	제목
- content	varchar(1000)	내용

### 참고
- post_num: category별 독립적인 int형(1부터 increase)으로 부여
  - app.service.post의 `__next_post_num`에서 category별 카운터(post_counters 컬렉션)를 원자적으로 증가시켜 생성
- category 공지(notice), 자유(free), 질문(question), 건의(suggestion) 구분
- author_id는 최초 명세에 없던 필드로, author(닉네임 스냅샷)만으로는 수정/삭제 권한의 "owner" 판별이 불가능해서(닉네임은 불변 식별자가 아님) 추가함
- category는 등록 후 변경 불가(PATCH 대상에서 제외) — 카테고리를 옮기면 post_num 체계가 깨짐

## comments(comment.py)
- comment_id	UUID	PK
- post_id	UUID	게시글 id(posts.post_id 참조)
- author_id UUID 작성자(users_id 참조)
- author	varchar(8)	작성자 닉네임(작성 시점 스냅샷)
- parent_id	UUID	NULLABLE 부모 댓글
- mention_to varchar(8) 부모 댓글 작성자 닉네임(작성 시점 스냅샷)
- content	varchar(100)	내용

### 참고
- 부모 댓글이 없는 경우 일반 댓글
- 부모 댓글이 있는 경우 대댓글(답글). 저장은 2단계로 평탄화됨 — 답글에 답글을 달아도 parent_id는 그 답글의 원댓글(root)을 가리키고, mention_to만 실제로 답한 대상(그 답글의 작성자)으로 남음
- post_id는 원래 명세에 INT로 적혀있었으나, posts_id가 UUID(post_id)+INT(post_num, category별 별도 번호)로 나뉘면서 post_num만으로는 글을 특정할 수 없어(공지#1, 자유#1처럼 category 넘어 중복) posts.post_id(UUID)를 참조하도록 정정함
- author_id는 posts와 동일한 사유로 추가(owner 판별용)
- 특정 게시글 조회 시, 해당 게시글의 모든 댓글(대댓글 포함) DB 쿼리 레벨에서 페이지네이션, 답글 트리 조립은 그 페이지 안에서만(최상위 댓글(최신순/등록순 브라우저에서 선택 가능) 기준으로 20개 페이지네이션하고, 그 댓글들의 답글도 통째로 같이 가져오는 방식)
  - 답글이 있는 댓글의 경우 "답글 n개"로 댓글 아래 표시 후, "답글 n개"를 누르면 답글 렌더링
- soft delete된 댓글은 조회에서 완전히 제외하지 않고 content를 "삭제된 댓글입니다"로 대체해서 반환 — 답글이 딸린 부모가 삭제돼도 스레드가 끊기지 않게 하기 위함(다른 도메인들과 달리 deleted_at으로 완전히 필터링하지 않는 유일한 케이스)

## phrases(bustercall.py, 총공문구 + 집계)
- BaseEntity 적용(phrases_id는 PK 역할, Mongo `_id`에 문자열로 그대로 사용 — users와 동일 패턴)
- phrases_id	UUID	PK
- category	enum	총공 종류(컴백, 생일, n주년)
- detail varchar(16) 총공 종류 상세
- member	varchar(16)	멤버
- pairs	array<array<string(50)>>	유동문구(3줄로 구성, 본문 1,3,5번째 줄)
- fixed2	varchar(50)	고정문구1(해시태그, 본문 2번째줄)
- fixed4	varchar(50)	고정문구2(해시태그, 본문 4번째줄)
- is_current	boolean	현재 진행 중인 캠페인
- total_clicks	integer	NULLABLE	총 클릭 수(sync 시점 집계)
- unique_clients	integer	NULLABLE	이용자 수(sync 시점 집계)
- synced_at	TIMESTAMP	NULLABLE	캠페인 종료(sync) 시점

### 참고
- category enum (컴백(comeback), 생일(birthday), n주년(anniversary))
- detail 컴백의 경우 "곡 이름"(예_Heavy Seranade), 생일은 "YYYY"(예_2026), n주년은 "n"(예_5)
- db에서 "mixxtopia" Database의 "phrases" 컬렉션에서 category와 detail조합으로
- member는 생일일 경우 단일 멤버 이름(lily, haewon, sullyoon, bae, jiwoo, kyujin)으로, 컴백이나 n주년은 nmixx로 구분.
- 유동문구1+고정문구1+유동문구2+고정문구2+유동문구3 으로 조합됨(app.service.bustercall의 get_phrases)
- is_current는 최초 명세에 없던 필드로, 관리자가 캠페인을 등록/전환하면 해당 문서만 is_current=true, 나머지는 false로 내리기 위해 추가함
- (category, detail, member) 조합에 unique index(partial, deleted_at:None인 문서끼리만) — member까지 포함해야 같은 해에 생일인 멤버가 둘 이상이어도 서로 다른 캠페인으로 구분됨(category+detail만으로는 충돌). soft delete 후엔 같은 조합으로 재등록 가능
- `GET /bustercall/reroll`은 is_current=true 문서를 조회하며, Redis(`hashtag:phrases`)에 캐싱해 매 요청마다 Mongo를 조회하지 않음. 캠페인 등록/수정/삭제 시 캐시도 함께 갱신(write-through)
- 기존 "hashtag" Mongo DB(레거시 총공 DB)는 더 이상 쓰지 않고 mixxtopia DB의 phrases 컬렉션으로 통합함(레거시로 이관된 기존 문서 1건은 BaseEntity 필드 없이 그대로 둠 — 더 이상 수정될 일 없는 데이터라 소급 반영 안 함)
- 원래 별도 컬렉션이었던 record(총공 집계 로그)를 여기로 통합함 — 캠페인당 문서가 1개뿐이라 분리 실익이 적었음. 단, 같은 캠페인을 여러 번 재실행(sync)하면 total_clicks/unique_clients/synced_at은 최신 값으로 덮어써지고 과거 회차별 집계 이력은 남지 않음(필요해지면 별도 로그로 재분리)
- 관리자 페이지의 "기존 캠페인 목록(최신순)" 조회는 updated_at 기준 정렬. 프론트에는 created_by/updated_by/deleted_by를 노출하지 않음(내부 감사용)

## suggest(suggest.py, 건의함)
- suggest_id    UUID    PK
- category enum varchar(20) 건의 종류
- title varchar(100)    제목
- content varchar(1000) 내용
- email varchar(200) 피드백 받을 이메일
- status enum(pending, read, done) 처리상태
- target_id UUID NULLABLE 신고 대상 id(유저/게시글 등)

### 참고
- 관리자 전용 페이지에서 조회
- 신고/건의를 category로 구분해서 한 번에 관리
  - bustercall(phrases), photo, post, comment, schedule, user, vote 모두 해당
- target_id는 최초 명세에 없던 필드로, report_* 카테고리일 때 신고 대상을 남기기 위해 추가함(건의는 None)
- category는 `app/model/suggest.py`의 `SuggestCategory`(suggestion, report_user, report_post, report_comment, report_photo, report_schedule, report_vote, report_bustercall)로 구현됨
- `GET/POST /suggests`, `GET/POST /suggests/{suggest_id}` 전부 구현됨. `POST /suggests`는 category=suggestion 고정, report_*는 각 도메인의 report endpoint를 통해서만 생성됨(현재 report_user만 구현, 나머지 도메인 report는 해당 도메인 작업 시 이어서 구현 예정)
- 상세 조회(`GET /suggests/{suggest_id}`) 시 status가 pending이면 read로 자동 전환(1회성 side effect). 처리 완료(`POST /suggests/{suggest_id}`)는 무조건 done으로 전환