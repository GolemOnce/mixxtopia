# Back-end
- 커맨드 입력 경로 : mixxtopia/back-end/
- case 1, 2 중 선택
## case 1.
- 가상환경 실행 후 uvicorn으로 run
```
# 가상환경 실행
.venv/Scripts/activate   # Windows
.venv/bin/activate       # macOS/Linux/WSL

# run
uvicorn app.main:app --reload
``` 
## case 2.
- 가상환경을 실행해도 uvicorn: command not found가 뜨는 경우
- CI/CD/배포 스크립트에서 사용하는 경우
```
.venv/Scripts/Python.exe -m uvicorn app.main:app --reload   # Windows
.venv/bin/python -m uvicorn app.main:app --reload           # macOS/Linux/WSL
```
<br></br>

---

<br></br>

# front-end
- 커맨드 입력 경로 : mixxtopia/front-end/
```
npm run dev (개발서버)
npm run build (배포서버, front-end/dist/에 정적 파일 생성)
npm run preview (빌드 결과 로컬 프리뷰)
```

<br></br>

---

<br></br>

# 패키지 설치

```bash
# back-end — uv 사용(pip보다 빠름, pip 호환이라 requirements.txt 그대로 사용)
uv pip install -r requirements.txt
uv pip install -r requirements-dev.txt   # ruff 등 개발용 도구 포함
```

<br></br>

---

<br></br>

# 린트/포맷

```bash
# front-end — ESLint(flat config) + typescript-eslint, 포맷은 Prettier
npm run lint        # eslint .
npm run lint:fix    # eslint . --fix
npm run format      # prettier --write .

# back-end — ruff(린트+포맷+import 정리, back-end/pyproject.toml에 설정)
ruff check .
ruff format .
```

`.claude/hooks/post_edit_check.sh`가 Write/Edit 직후 위 도구로 자동 체크한다(node_modules/venv 설치 전이면 tsc --noEmit / py_compile로 폴백).