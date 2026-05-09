# Back-end
- 커맨드 입력 경로 : mixxtopia/back-end/
- case 1, 2 중 선택
## case 1.
- 가상환경 실행 후 uvicorn으로 run
```
.venv/Scripts/activate
uvicorn app:app --reload
``` 
## case 2.
- 가상환경을 실행해도 uvicorn: command not found가 뜨는 경우
- CI/CD/배포 스크립트에서 사용하는 경우
```
.venv/Scripts/Python.exe -m uvicorn app:app --reload
```
<br></br>

---

<br></br>

# front-end
- 커맨드 입력 경로 : mixxtopia/front-end/
```
npm run dev (개발서버)
npm run build (배포서버, front-end/dist/에 정적 파일 생성)
```