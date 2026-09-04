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
    ;;
  *)
    exit 0
    ;;
esac
