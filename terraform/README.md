# mixxtopia 인프라 (Terraform)

기존 EC2(수작업 세팅, `scripts/setup-ec2.sh`)를 대체하는 **완전히 새로운** 인프라를 만든다.
적용 전까지 기존 운영 서버/Atlas 클러스터는 전혀 건드리지 않는다.

## 사전 준비 (최초 1회, 수동)

1. **Terraform CLI** 설치(`>= 1.11`, S3 네이티브 state lock 사용)
2. **AWS 자격증명** — `aws configure` 또는 환경변수로 설정
3. **MongoDB Atlas API 키** — Atlas 콘솔 > Organization Settings > Access Manager > API Keys에서
   발급(Organization Owner 권한 필요). Organization ID도 같은 화면에서 확인
4. **SSH 키 페어** — 기존 키 재사용 가능. 없으면: `ssh-keygen -t ed25519 -f ~/.ssh/mixxtopia`
5. **Terraform state용 S3 버킷** 수동 생성(Terraform이 자기 자신의 상태를 저장할 곳이라 코드로
   못 만듦):
   ```bash
   aws s3 mb s3://mixxtopia-terraform-state --region ap-northeast-2
   aws s3api put-bucket-versioning --bucket mixxtopia-terraform-state \
     --versioning-configuration Status=Enabled
   ```
   버킷 이름을 다르게 했다면 `backend.tf`의 `bucket` 값도 맞춰서 수정할 것.

## 변수 설정

```bash
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars를 열어 ssh_public_key_path, atlas_public_key/private_key/org_id,
# ssh_allowed_cidr(가능하면 본인 IP로 좁히기) 채우기
```

## 적용

```bash
terraform init
terraform plan   # 뭐가 만들어질지 먼저 확인 — 꼭 검토 후 apply
terraform apply
```

적용이 끝나면 아래 값들을 받아둔다(`atlas_connection_string`은 비밀값이라 기본 출력에 안 보임):

```bash
terraform output ec2_public_ip
terraform output cloudfront_domain
terraform output -raw atlas_connection_string   # 이 값은 화면에 남기지 말고 바로 .env에 붙여넣기
```

## 최초 배포

1. **`.env` 채우기** — `back-end/.env`(지금은 `.env.example` 복사본 상태)를 열어:
   - `MONGODB_URI` = 위 `atlas_connection_string`
   - `JWT_SECRET_KEY` = 새로 생성(`openssl rand -hex 32`) — 로컬 dev 키 재사용 금지
   - `FRONTEND_ORIGIN=https://mixxtopia.site`
   - `COOKIE_SECURE=true`
   - `AWS_REGION` = terraform.tfvars의 `aws_region`과 동일
2. **서버로 업로드**
   ```bash
   scp back-end/.env ubuntu@$(terraform output -raw ec2_public_ip):~/mixxtopia/back-end/.env
   ```
3. **컨테이너 기동** (SSH로 접속해서)
   ```bash
   ssh ubuntu@$(terraform output -raw ec2_public_ip)
   cd ~/mixxtopia
   docker compose up -d --build
   ```
   이 시점엔 `user_data.sh.tpl`이 만들어둔 더미 인증서로 443이 떠 있다(브라우저에선 "안전하지
   않음"으로 표시되는 게 정상 — 아직 Let's Encrypt 인증서가 아님).
4. **IP로 직접 동작 확인** (도메인 연결 전)
   ```bash
   curl http://$(terraform output -raw ec2_public_ip)/api/playlists
   ```

## DNS 전환 (가비아, 수동)

가비아 도메인 관리 콘솔에서 `mixxtopia.site`의 A레코드를 `terraform output ec2_public_ip` 값으로
변경한다. 전파에는 보통 수 분~1시간 정도 걸린다(TTL에 따라 다름).

```bash
# 전파됐는지 확인
dig +short mixxtopia.site
```

## 진짜 인증서 발급

DNS가 새 서버를 가리키는 게 확인되면, SSH로 접속해서:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d mixxtopia.site
cd ~/mixxtopia && docker compose restart nginx
```

더미 인증서가 진짜 Let's Encrypt 인증서로 교체된다(경로가 같아서 nginx 재빌드 불필요, 재시작만
하면 됨). 자동 갱신은 `user_data.sh.tpl`이 설치한 `certbot.timer`가 처리하고, 갱신될 때마다
`/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh`가 nginx 컨테이너를 재시작해준다.

```bash
curl -I https://mixxtopia.site   # 200/정상 인증서 확인
```

## 데이터 마이그레이션

### MongoDB

```bash
# 로컬 테스트 Mongo → 덤프
mongodump --uri="mongodb://localhost:27018/mixxtopia" --out=./mongo-dump

# 덤프 → 새 Atlas로 복원
mongorestore --uri="<atlas_connection_string>" ./mongo-dump/mixxtopia --nsFrom="mixxtopia.*" --nsTo="mixxtopia.*"
```

### 미디어 파일 (S3)

**중요**: `recover_s3.py`가 쓰는 `ensure_bucket()`은 `S3_ENDPOINT_URL`이 비어있으면(=LocalStack이
아니라 실 AWS S3) public-read 정책 적용을 자동으로 건너뛰도록 이미 수정해둠 — 그래야 terraform이
관리하는 private 버킷 설정이 안 깨진다.

레포 루트(`mixxtopia/`)에서 실행(패키지 상대 import 때문에 `-m`으로 실행해야 함):

```bash
S3_ENDPOINT_URL="" \
S3_ACCESS_KEY=<AWS Access Key> \
S3_SECRET_KEY=<AWS Secret Key> \
S3_REGION=ap-northeast-2 \
S3_BUCKET=$(cd terraform && terraform output -raw media_bucket_name) \
S3_PUBLIC_BASE_URL=https://$(cd terraform && terraform output -raw cloudfront_domain) \
python -m x_crawler.recover_s3
```

업로드가 끝나면 Atlas(복원 완료된 쪽)의 `photo_links`/`video_links` URL을 CloudFront 도메인으로
일괄 치환(`x_crawler/` 안에서 실행):

```bash
cd x_crawler

# 먼저 몇 건이 바뀌는지 미리보기
python migrate_urls_to_s3.py \
  --mongo-uri "<atlas_connection_string>" \
  --new-prefix "https://$(cd ../terraform && terraform output -raw cloudfront_domain)"

# 확인됐으면 --apply로 실제 반영
python migrate_urls_to_s3.py \
  --mongo-uri "<atlas_connection_string>" \
  --new-prefix "https://$(cd ../terraform && terraform output -raw cloudfront_domain)" \
  --apply
```

## 최종 확인

- [ ] `https://mixxtopia.site` 접속 + 인증서 정상
- [ ] 로그인(Gmail/Naver OAuth) 동작 — Google/Naver 콘솔에 이 도메인 리다이렉트 URI가 등록돼
      있는지 먼저 확인
- [ ] 글쓰기/댓글 등록
- [ ] 사진/영상이 CloudFront URL로 정상 로딩
- [ ] 플레이리스트/총공 등 나머지 기능 한 번씩

## 정리 (안전 기간 후)

위 체크리스트가 며칠간 문제없으면:
- 기존 EC2 인스턴스 종료(AWS 콘솔, Terraform 관리 밖이라 수동)
- 기존 "hashtag" Atlas 클러스터 — 레거시 데이터 백업 확인 후 삭제 여부 결정
- 이 Terraform으로 만든 리소스를 지우고 싶을 땐 `terraform destroy`(신규 인프라에 한해서만 — 기존
  리소스는 애초에 이 state에 없어서 영향 없음)
