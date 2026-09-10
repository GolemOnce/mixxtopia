# API 명세서
- 모든 API 라우터 prefix `/api`경로 추가

## auth
회원가입	POST	/auth/signup	인증	all
로그인	POST	/auth/login	인증	all
로그아웃	POST	/auth/logout	인증	admin,manager,user
토큰 재발급	POST	/auth/refresh	인증	admin,manager,user

## users(user.py)
프로필 조회	GET	/users/{userId}	유저	admin,guest,user
프로필 수정	PATCH	/users/{userId}	유저	admin,manager,owner
차단	POST	/users/{userId}/block	유저	admin,manager,user
차단 해제	DELETE	/users/{userId}/unblock	유저	admin,manager,user
차단 목록	GET	/users/{userId}/blacklist	유저	admin,manager,owner
신고	POST	/users/{userId}/report	유저	admin,manager,user

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
총공 캠페인 등록/전환	POST	/api/bustercall/campaign	총공	admin,manager

### 참고
- 총공은 1회성 캠페인(한 번에 하나만 진행)이라 phrases 문서 중 `is_current: true`인 것만 사용
- `POST /bustercall/campaign`은 category+detail을 키로 upsert하고, 기존 캠페인은 is_current=false로 내림(전환). 별도의 목록/수정/삭제 endpoint는 아직 없음(필요해지면 추가)

## suggests(suggest.py)
건의 조회	GET	/suggests	건의함	admin,manager
건의 작성	POST	/suggests	건의함	admin,manager,user
