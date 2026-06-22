#!/bin/bash
set -e

DOMAIN="web.bkpp.dev"
APP_PORT=3001
STACK_DIR="/opt/sadewa-web"

echo "========================================"
echo "  SADEWA Web — Deploy ke VPS"
echo "  Domain: $DOMAIN"
echo "  Port:   $APP_PORT"
echo "========================================"

if ! command -v docker &> /dev/null; then
    echo "[1/7] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
else
    echo "[1/7] Docker sudah terpasang: $(docker --version)"
fi

if ! command -v nginx &> /dev/null; then
    echo "[2/7] Installing Nginx..."
    apt-get update -qq
    apt-get install -y -qq nginx
    systemctl enable nginx
    systemctl start nginx
else
    echo "[2/7] Nginx sudah terpasang: $(nginx -v 2>&1)"
fi

if ! command -v certbot &> /dev/null; then
    echo "[3/7] Installing Certbot (untuk SSL)..."
    apt-get install -y -qq certbot python3-certbot-nginx
else
    echo "[3/7] Certbot sudah terpasang"
fi

echo "[4/7] Mempersiapkan direktori aplikasi..."
mkdir -p "$STACK_DIR"

if [ ! -f "$STACK_DIR/docker-compose.yml" ]; then
    echo "  ERROR: docker-compose.yml tidak ditemukan di $STACK_DIR"
    echo "  Pastikan Anda sudah clone/copy project web ke $STACK_DIR"
    echo "  Atau jalankan dari dalam direktori project."
    exit 1
fi

echo "[5/7] Build & start container..."
cd "$STACK_DIR"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo "  Menunggu container start..."
sleep 5

if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$APP_PORT/login" | grep -q "200"; then
    echo "  Container OK — app merespon di port $APP_PORT"
else
    echo "  WARNING: Container belum merespon, cek log:"
    docker compose logs --tail=20
fi

echo "[6/7] Konfigurasi Nginx reverse proxy..."
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_CONF'
server {
    listen 80;
    server_name web.bkpp.dev;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINX_CONF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "  Nginx site $DOMAIN enabled"

echo "[7/7] Setup SSL (Let's Encrypt)..."
read -p "Setup SSL HTTPS sekarang? (y/n): " SETUP_SSL
if [ "$SETUP_SSL" = "y" ]; then
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect
    echo "  SSL aktif — https://$DOMAIN"
else
    echo "  Skip SSL. Jalankan nanti: certbot --nginx -d $DOMAIN"
fi

echo ""
echo "========================================"
echo "  DEPLOY SELESAI!"
echo "========================================"
echo ""
echo "  Akses:    http://$DOMAIN"
echo "  (atau https://$DOMAIN jika SSL aktif)"
echo ""
echo "  Container: docker compose -f $STACK_DIR/docker-compose.yml ps"
echo "  Logs:      docker compose -f $STACK_DIR/docker-compose.yml logs -f"
echo "  Restart:   docker compose -f $STACK_DIR/docker-compose.yml restart"
echo "  Stop:      docker compose -f $STACK_DIR/docker-compose.yml down"
echo ""
