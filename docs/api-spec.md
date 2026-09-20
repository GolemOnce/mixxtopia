# API 명세서
- 모든 API 라우터 prefix `/api`경로 추가

## auth
회원가입	POST	/auth/signup	인증	all
로그인	POST	/auth/login	인증	all
로그아웃	POST	/auth/logout	인증	admin,manager,user
토큰 재발급	POST	/auth/refresh	인증	admin,manager,user

## users(user.py)
프로필 조회	GET	/users/{user_id}	유저	admin,guest,user
프로필 수정	PATCH	/users/{user_id}	유저	admin,manager,owner
차단	POST	/users/{user_id}/block	유저	admin,manager,user
차단 해제	DELETE	/users/{user_id}/unblock	유저	admin,manager,user
차단 목록	GET	/users/{user_id}/blacklist	유저	admin,manager,owner
신고	POST	/users/{user_id}/report	유저	admin,manager,user

### 참고
- path param은 bustercall의 `{phrases_id}`와 일관되게 snake_case(`{user_id}`) 사용(명세엔 camelCase로 적혀있었으나 통일함)
- 프로필 조회는 인증 불필요(guest 포함 전체 공개), 닉네임만 반환(email 등 PII 비노출)
- "owner"는 `app.core.deps.require_self_or_roles`로 구현 — path의 `user_id`와 본인이거나 admin/manager
- 차단/차단해제는 "user"(로그인만 하면 누구나) 권한 — 자기 자신 차단은 400
- 신고는 suggest 컬렉션에 `category=report_user`로 저장(신고 목록 조회는 suggests 도메인에서 구현 예정)

## officials(official.py)
오피셜 목록 조회	GET	/officials	오피셜	all
오피셜 상세 조회	GET	/officials/{official_id}	오피셜	all
오피셜 작성	POST	/officials	오피셜	admin,manager
오피셜 수정	PATCH	/officials/{official_id}	오피셜	admin,manager
오피셜 삭제	DELETE	/officials/{official_id}	오피셜	admin,manager

## votes(vote.py)
투표 목록 조회	GET	/votes	투표	all
투표 상세 조회	GET	/votes/{vote_id}	투표	all
투표 등록	POST	/votes	투표	admin,manager
투표 수정	PATCH	/votes/{vote_id}	투표	admin,manager
투표 삭제	DELETE	/votes/{vote_id}	투표	admin,manager

### 참고
- `GET /votes`는 쿼리파라미터 `member`, `organizer`(벅스/멜론/엠넷플러스 등 투표 매체)로 필터링 가능. 기본 정렬은 `start_at` 오름차순
- 등록/수정 시 start_at > end_at이면 400
- 삭제는 soft delete(BaseEntity의 deleted_at). schedules와 구조는 거의 동일하나 category/location 없음

## schedules(schedule.py)
스케줄 조회	GET	/schedules	스케줄	all
스케줄 상세 조회	GET	/schedules/{schedule_id}	스케줄	all
스케줄 등록	POST	/schedules	스케줄	admin,manager
스케줄 수정	PATCH	/schedules/{schedule_id}	스케줄	admin,manager
스케줄 삭제	DELETE	/schedules/{schedule_id}	스케줄	admin,manager

### 참고
- `GET /schedules`는 쿼리파라미터 `category`, `member`로 필터링 가능. 기본 정렬은 `start_at` 오름차순
- "지난 일정 숨기기" 같은 필터는 아직 없음 — 달력/게시판 형태 화면을 실제로 만들 때 필요한 형태(날짜 범위 등)로 다시 추가 예정
- category는 enum이 아니라 자유 문자열(자세한 사유는 db-schema.md 참고) — broadcast/award/festival/concert/fanmeeting/fansign/etc 등은 자동완성용 기본값일 뿐, 새 값도 그대로 등록 가능
- 등록/수정 시 start_at > end_at이면 400
- 삭제는 soft delete(BaseEntity의 deleted_at)
- "합법적으로 공개된 스케줄만" 정책은 코드로 검증할 수 없는 항목이라(비공식 루머 여부 판단 불가) admin/manager만 쓸 수 있게 하는 권한 제한 + 운영 정책으로 지킴

## photos(photo.py)
사진 목록 조회	GET	/photos	사진	all
사진 단일 조회	GET	/photos/{photoId}	사진	all
사진 등록	POST	/photos	사진	admin,manager
사진 삭제	DELETE	/photos/{photoId}	사진	admin,manager

## posts(post.py)
게시글 목록 조회	GET	/posts	게시글	all
게시글 상세 조회	GET	/posts/{post_id}	게시글	all
게시글 작성	POST	/posts	게시글	admin,manager,user
게시글 수정	PATCH	/posts/{post_id}	게시글	admin,manager,owner
게시글 삭제	DELETE	/posts/{post_id}	게시글	admin,manager,owner

### 참고
- `GET /posts`는 쿼리파라미터 `category`, `page`, `page_size`(기본 20)로 필터링/페이지네이션. `created_at` 내림차순(최신순) 정렬
- category(notice/free/question/suggestion) 중 notice(공지)는 admin/manager만 작성 가능(그 외 카테고리는 로그인한 모든 role)
- suggestion(건의) 카테고리는 admin/manager만 조회 가능(CLAUDE.md "건의글은 관리자만 조회 가능") — `category=suggestion`으로 명시 필터링하면 비관리자는 403, 필터 없는 전체 목록에서는 자동으로 제외되고, 상세 조회도 403. `GET /comments/{post_id}`·`POST /comments/{post_id}`도 대상 게시글이 건의글이면 동일하게 막힘(비로그인 포함 `app.core.deps.get_current_user_optional`로 판별)
- "owner"는 서비스 레벨에서 `post.author_id == 로그인한 유저`로 판단(admin/manager는 무조건 통과)
- 작성 시점 IP를 access_logs에 기록(`action=post_create`)
- category는 변경 불가(PATCH 대상에서 제외) — post_num이 category별로 매겨지므로 카테고리 이동은 새 글 작성으로 처리

## comments(comment.py)
댓글 목록 조회	GET	/comments/{post_id}	댓글	all
댓글 작성	POST	/comments/{post_id}	댓글	admin,manager,user
댓글 삭제	DELETE	/comments/{comment_id}	댓글	admin,manager,owner

### 참고
- `GET /comments/{post_id}`는 최상위 댓글만 `sort`(asc/desc, 기본 asc)+`page`+`page_size`(기본 20)로 페이지네이션하고, 그 페이지에 포함된 댓글들의 답글은 전부(페이지네이션 없이) 같이 내려줌 — `replies` 필드에 중첩
- 저장은 2단계로 평탄화됨 — 답글에 또 답글을 달면(`parent_id`로 답글의 id를 보내도) 실제로는 그 답글의 원댓글(root)에 매달리고, `mention_to`만 실제로 답한 대상(그 답글의 작성자)으로 남음
- 답글 작성 시 부모 댓글 작성자 닉네임을 `mention_to`로 스냅샷 저장
- soft delete된 댓글은 목록에서 완전히 빠지지 않고 내용만 "삭제된 댓글입니다"로 대체 — 답글이 있는 채로 부모가 삭제돼도 스레드가 안 끊기게 하기 위함
- 댓글 작성 시점 IP를 access_logs에 기록(`action=comment_create`)

## bustercall(bustercall.py)
총공	POST	/api/bustercall/click	총공	all
총공 문구 변경	GET	/api/bustercall/reroll	총공	all
총공 현황 조회	GET	/api/bustercall/stats	총공	all

### 관리자 전용
총공 캠페인 목록 조회	GET	/api/bustercall/campaigns	총공	admin,manager
총공 캠페인 신규 등록	POST	/api/bustercall/campaigns	총공	admin,manager
총공 캠페인 수정/전환	PATCH	/api/bustercall/campaigns/{phrases_id}	총공	admin,manager

### 참고
- 총공은 1회성 캠페인(한 번에 하나만 진행)이라 phrases 문서 중 `is_current: true`인 것만 사용
- `POST /api/bustercall/campaigns`는 (category, detail, member) 조합이 이미 있으면 409로 거절(실수로 기존 캠페인 덮어쓰기 방지) — 새 문서를 만들고 is_current=true로, 기존 캠페인들은 false로 전환
- `PATCH /api/bustercall/campaigns/{phrases_id}`는 기존 캠페인의 문구 내용(pairs/fixed2/fixed4)만 수정하고 is_current=true로 전환. category/detail/member(식별자)는 변경 불가 — 바꾸려면 새로 등록
- 관리자 페이지는 `GET /api/bustercall/campaigns`로 최신순 목록을 보여주고, 그중 하나를 선택하면 문구가 폼에 자동으로 채워짐(수정용), "새로 만들기"를 선택하면 빈 폼(신규 등록용)

## suggests(suggest.py)
건의/신고 목록 조회	GET	/suggests	건의함	admin,manager
건의/신고 상세 조회	GET	/suggests/{suggest_id}	건의함	admin,manager
건의 작성	POST	/suggests	건의함	admin,manager,user
건의/신고 처리 완료   POST    /suggests/{suggest_id}  건의함  admin,manager

### 참고
- `GET /suggests/{suggest_id}`는 명세엔 없었으나 추가함 — status가 pending이면 조회 시점에 read로 자동 전환(1회성)되는 흐름을 구현하려면 상세 조회 endpoint가 필요해서
- `GET /suggests`는 `category`, `status`, `page`, `page_size`(기본 20)로 필터링/페이지네이션, created_at 내림차순(최신순)
- `POST /suggests`는 category가 항상 suggestion으로 고정됨(로그인한 유저의 일반 건의). report_* 카테고리는 각 도메인의 `/{도메인}/{id}/report`류 endpoint를 통해서만 생성됨(예: `POST /users/{user_id}/report`)
- `POST /suggests/{suggest_id}`(처리 완료)는 상태를 무조건 done으로 전환(멱등)
- 프론트에는 created_by/updated_by/deleted_by 비노출(내부 감사용, 다른 도메인과 동일)