#!/usr/bin/env bash
# PostToolUse 훅 — Write/Edit 직후 편집된 파일에 린트 체크를 돌린다.
# front-end: eslint, back-end: ruff. 아직 설치 전(node_modules/venv 없음)이면
# 기존 최소 체크(tsc/py_compile)로 폴백함.

input=$(cat)
file_path=$(echo "$input" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get('tool_input', {}).get('file_path', ''))
except Exception:
    pass
" 2>/dev/null)

[ -z "$file_path" ] && exit 0
[ -n "$CLAUDE_PROJECT_DIR" ] && cd "$CLAUDE_PROJECT_DIR" || exit 0

case "$file_path" in
  front-end/*.ts | front-end/*.tsx | */front-end/*.ts | */front-end/*.tsx)
    eslint_bin="front-end/node_modules/.bin/eslint"
    tsc_bin="front-end/node_modules/.bin/tsc"
    if [ -x "$eslint_bin" ]; then
      echo "[hook] ESLint: $file_path"
      (cd front-end && ./node_modules/.bin/eslint "${file_path#front-end/}")
    elif [ -x "$tsc_bin" ]; then
      echo "[hook] front-end/node_modules에 eslint 없음 — 'npm install' 후 활성화됩니다. 임시로 타입 체크만 수행."
      (cd front-end && ./node_modules/.bin/tsc --noEmit -p tsconfig.app.json)
    else
      echo "[hook] front-end/node_modules 없음 — 'npm install' 후부터 린트가 활성화됩니다."
    fi
    ;;
  back-end/*.py | */back-end/*.py)
    ruff_bin="back-end/.venv/bin/ruff"
    if [ -x "$ruff_bin" ]; then
      echo "[hook] ruff check: $file_path"
      "$ruff_bin" check "$file_path"
    elif command -v ruff >/dev/null 2>&1; then
      echo "[hook] ruff check: $file_path"
      ruff check "$file_path"
    else
      echo "[hook] ruff 미설치 — 'pip install -r back-end/requirements-dev.txt' 후부터 린트가 활성화됩니다. 임시로 구문 체크만 수행."
      python3 -m py_compile "$file_path"
    fi

    # 시크릿 하드코딩 / CORS 와일드카드 감지 — 차단은 아니고 경고만(exit 0 유지)
    if grep -qE 'mongodb(\+srv)?://[^"'"'"' ]*:[^"'"'"' ]*@' "$file_path"; then
      echo "[hook] 경고: $file_path 에 DB 커넥션 스트링(자격증명 포함)이 하드코딩된 것으로 보입니다. .env 사용 권장."
    fi
    if grep -qE 'AKIA[0-9A-Z]{16}' "$file_path"; then
      echo "[hook] 경고: $file_path 에 AWS Access Key로 보이는 패턴이 하드코딩되어 있습니다. .env 사용 권장."
    fi
    if grep -qE 'allow_origins\s*=\s*\[\s*["'"'"']\*["'"'"']' "$file_path"; then
      echo "[hook] 경고: $file_path 의 CORS allow_origins가 와일드카드(*)로 설정되어 있습니다. mixxtopia.site 도메인만 허용해야 합니다."
    fi
    ;;
  *)
    exit 0
    ;;
esac
