# mixxtopia.site

NMIXX 팬을 위한 덕질 도구 모음 사이트.

## 스택

- 프론트엔드: React (Vite)
- 백엔드: FastAPI
- DB: MongoDB(Atlas), Redis
- 인프라: AWS(EC2, S3, CloudFront), Terraform IaC, Docker Compose, GitHub Actions CD

## 기능

제품 기능 명세는 GitHub Issues([`product-spec`](https://github.com/GolemOnce/mixxtopia/issues?q=label%3Aproduct-spec) 라벨)에서 도메인별로 관리합니다. 도메인별 구현은 `back-end/app/router,service/`, `front-end/src/pages/`에서 확인할 수 있습니다.

주요 기능: 메인 화면(음원 순위/컴백 카운트다운), 오피셜(공식 계정) 피드, 스케줄표, 투표 일정, 커뮤니티 게시판, 추천 플레이리스트, 트위터(X) 총공(해시태그 챌린지), 접속기록(관리자용).

## 프로젝트 구조

```
back-end/     FastAPI (model → schemas → service → router 레이어, 도메인별 파일 분리)
front-end/    React + Vite (src/pages, src/components)
terraform/    AWS 인프라(EC2, S3, CloudFront, IAM) IaC
docs/         API 명세서(api-spec.md), 테이블 명세서(db-schema.md), 실행 가이드(How_to_Run.md)
x_crawler/    트위터(X) 공식 계정 크롤러
music_crawler/ 음원 사이트 순위/트랙 크롤러
```

## 실행 방법

로컬 개발 환경 세팅, 패키지 설치, 린트/포맷 명령어는 [`docs/How_to_Run.md`](docs/How_to_Run.md)를 참고하세요.

## 배포

- `main` 브랜치에 push되면 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)이 자동으로 빌드 체크 후 EC2에 배포합니다.
- 인프라 구성/최초 배포 절차는 [`terraform/README.md`](terraform/README.md)를 참고하세요.

## 문서

- [API 명세서](docs/api-spec.md)
- [테이블 명세서](docs/db-schema.md)
- [코드 컨벤션 및 운영 규칙](CLAUDE.md)
