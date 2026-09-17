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

## votes(vote.py)
투표 목록 조회	GET	/votes	투표	all
투표 상세 조회	GET	/votes/{voteId}	투표	all
투표 등록	POST	/votes	투표	admin,manager
투표 수정	PATCH	/votes/{voteId}	투표	admin,manager
투표 삭제	DELETE	/votes/{voteId}	투표	admin,manager

## schedules(schedule.py)
스케줄 조회	GET	/schedules	스케줄	all
스케줄 상세 조회	GET	/schedules/{scheduleId}	스케줄	all
스케줄 등록	POST	/schedules	스케줄	admin,manager
스케줄 수정	PATCH	/schedules/{scheduleId}	스케줄	admin,manager
스케줄 삭제	DELETE	/schedules/{scheduleId}	스케줄	admin,manager

## photos(photo.py)
사진 목록 조회	GET	/photos	사진	all
사진 단일 조회	GET	/photos/{photoId}	사진	all
사진 등록	POST	/photos	사진	admin,manager
사진 삭제	DELETE	/photos/{photoId}	사진	admin,manager

## posts(post.py)
게시글 목록 조회	GET	/posts	게시글	all
게시글 상세 조회	GET	/posts/{postId}	게시글	all
게시글 작성	POST	/posts	게시글	admin,manager,user
게시글 수정	PATCH	/posts/{postId}	게시글	admin,manager,owner
게시글 삭제	DELETE	/posts/{postId}	게시글	admin,manager,owner

## comments(comment.py)
댓글 목록 조회	GET	/comments/{postId}	댓글	all
댓글 작성	POST	/comments/{postId}	댓글	admin,manager,user
댓글 삭제	DELETE	/comments/{commentId}	댓글	admin,manager,owner

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
건의 조회	GET	/suggests	건의함	admin,manager
건의 작성	POST	/suggests	건의함	admin,manager,user
건의 처리 완료   POST    /suggests/{suggest_id}  건의함  admin, manager