#!/usr/bin/env bash
# PreToolUse 훅 — Bash 도구 호출 전에 stdin으로 JSON을 받아서
# 위험 패턴이 보이면 exit 2로 차단한다. (exit 2 = block, exit 0 = allow)

input=$(cat)
command=$(echo "$input" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1)

# 위험 패턴 목록 — 필요에 따라 추가
danger_patterns=(
  "rm -rf /"
  "rm -rf ~"
  "rm -rf \."
  "git push --force"
  "git reset --hard"
  ":(){ :|:& };:"  # fork bomb
  "> /dev/sda"
  "DROP TABLE"
  "DROP DATABASE"
  # 배포 서버(EC2) 직접 조작 금지 — 배포는 반드시 .github/workflows/deploy.yml
  # CI/CD 파이프라인(main 브랜치 push)을 통해서만 이루어져야 함
  "systemctl restart mixxtopia"
  "systemctl reload nginx"
  "systemctl stop mixxtopia"
  # MongoDB/Redis 대량 삭제 방지 — 총공(hashtag) 서비스가 이 데이터에 의존
  "dropDatabase"
  "\.drop()"
  "deleteMany({})"
  "FLUSHALL"
  "FLUSHDB"
)

for pattern in "${danger_patterns[@]}"; do
  if echo "$command" | grep -qi "$pattern"; then
    echo "차단됨: 위험한 명령 패턴 감지 — '$pattern'. 정말 필요하면 사용자에게 직접 실행을 요청하세요." >&2
    exit 2
  fi
done

exit 0