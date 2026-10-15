#!/bin/bash
# EC2 최초 부팅 시 1회 실행되는 cloud-init 스크립트. 비밀값(.env, DB 비밀번호 등)은
# 여기 절대 넣지 않는다 — EC2 메타데이터로 평문 노출되기 때문에, .env는 항상 SCP로
# 별도 업로드한다(README.md "배포" 단계 참고).
set -e

exec > >(tee /var/log/mixxtopia-setup.log) 2>&1
echo "=== mixxtopia EC2 bootstrap 시작: $(date) ==="

echo "--- 패키지 업데이트 ---"
apt-get update -y
apt-get upgrade -y

echo "--- Docker 설치 ---"
apt-get install -y ca-certificates curl gnupg git certbot
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
usermod -aG docker ubuntu

echo "--- 저장소 clone ---"
sudo -u ubuntu git clone ${git_repo_url} /home/ubuntu/mixxtopia

echo "--- certbot webroot/인증서 디렉토리 준비 ---"
mkdir -p /var/www/certbot
mkdir -p /etc/letsencrypt/live/${domain_name}

# 실제 인증서를 발급받기 전까지 nginx가 443으로 일단 떠 있을 수 있도록, 자가서명(더미)
# 인증서를 같은 경로에 먼저 만들어둔다. README.md대로 certbot을 실행하면 이 더미 파일이
# 진짜 인증서로 교체된다(경로는 그대로라 nginx 재시작만 하면 됨 — 재빌드 불필요).
if [ ! -f /etc/letsencrypt/live/${domain_name}/fullchain.pem ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/${domain_name}/privkey.pem \
    -out /etc/letsencrypt/live/${domain_name}/fullchain.pem \
    -subj "/CN=${domain_name}"
fi

echo "--- certbot 자동 갱신 타이머 + nginx 리로드 훅 ---"
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<'HOOK'
#!/bin/bash
cd /home/ubuntu/mixxtopia && docker compose restart nginx
HOOK
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
systemctl enable --now certbot.timer

echo "=== bootstrap 완료: $(date) ==="
echo "다음 단계는 README.md의 '최초 배포' 섹션을 따라 수동으로 진행할 것:"
echo "  1) back-end/.env를 서버로 scp"
echo "  2) docker compose up -d --build"
echo "  3) certbot certonly --webroot -w /var/www/certbot -d ${domain_name}"
echo "  4) docker compose restart nginx"
