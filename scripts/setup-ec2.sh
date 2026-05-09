#!/bin/bash
# EC2 최초 1회 실행 스크립트 (Ubuntu 22.04 기준)
set -e

echo "=== 1. 시스템 패키지 업데이트 ==="
sudo apt update && sudo apt upgrade -y

echo "=== 2. Python 3.10 설치 ==="
sudo apt install -y python3.10 python3.10-venv python3-pip

echo "=== 3. Node.js 20 설치 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== 4. Redis 설치 및 시작 ==="
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

echo "=== 5. Nginx 설치 ==="
sudo apt install -y nginx
sudo systemctl enable nginx

echo "=== 6. Git 설치 ==="
sudo apt install -y git

echo "=== 7. 레포 클론 ==="
# GitHub 레포 주소로 변경하세요
git clone https://github.com/GolemOnce/mixxtopia.git ~/mixxtopia

echo "=== 8. Backend 의존성 설치 ==="
cd ~/mixxtopia/back-end
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

echo "=== 9. Frontend 빌드 ==="
cd ~/mixxtopia/front-end
npm ci
npm run build

echo "=== 10. systemd 서비스 등록 ==="
sudo cp ~/mixxtopia/scripts/mixxtopia-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mixxtopia-backend
sudo systemctl start mixxtopia-backend

echo "=== 11. Nginx 설정 ==="
sudo cp ~/mixxtopia/scripts/nginx.conf /etc/nginx/sites-available/mixxtopia
sudo ln -sf /etc/nginx/sites-available/mixxtopia /etc/nginx/sites-enabled/mixxtopia
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== 완료! ==="
echo "※ 중요: back-end/hashtag-api.env 파일을 수동으로 업로드해야 합니다"
echo "   scp hashtag-api.env ubuntu@<EC2_IP>:~/mixxtopia/back-end/"
echo "   업로드 후: sudo systemctl restart mixxtopia-backend"
