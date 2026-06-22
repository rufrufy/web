# Deploy SADEWA Web

Deploy ke VPS dengan Docker + Nginx reverse proxy untuk domain `web.bkpp.dev`.

## Prasyarat VPS

- Ubuntu 20.04 / 22.04 / 24.04
- Akses root atau sudo
- Domain `web.bkpp.dev` sudah di-A record ke IP VPS
- Port 80 dan 443 terbuka di firewall

## Langkah Cepat (1 Perintah)

### 1. Copy project ke VPS

```bash
# Dari komputer lokal
scp -r "D:\SADEWA [4.3]\web" root@IP_VPS:/opt/sadewa-web
```

Atau kalau pakai git:

```bash
# Di VPS
git clone <repo-anda> /opt/sadewa-web
```

### 2. Jalankan deploy

```bash
ssh root@IP_VPS
cd /opt/sadewa-web
chmod +x deploy.sh
./deploy.sh
```

Script otomatis:
1. Install Docker (jika belum ada)
2. Install Nginx (jika belum ada)
3. Install Certbot untuk SSL
4. Build & start container Docker
5. Konfigurasi Nginx reverse proxy ke `web.bkpp.dev`
6. Setup SSL HTTPS (Let's Encrypt) — optional, tekan `y` saat ditanya

Setelah selesai, akses **http://web.bkpp.dev** (atau https jika SSL aktif).

---

## Deploy via Portainer

### 1. Push image ke registry (opsional)

```bash
# Di komputer lokal
cd web
docker build -t sadewa-web:latest .
docker tag sadewa-web:latest <registry-anda>/sadewa-web:latest
docker push <registry-anda>/sadewa-web:latest
```

### 2. Stack di Portainer

Buat **Stack** baru di Portainer dengan `docker-compose.yml`:

```yaml
version: "3.8"

services:
  sadewa-web:
    image: <registry-anda>/sadewa-web:latest
    container_name: sadewa-web
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    networks:
      - sadewa-net

networks:
  sadewa-net:
    driver: bridge
```

Klik **Deploy the stack**.

### 3. Nginx di VPS (di luar Portainer)

Portainer menjalankan container, tapi Nginx tetap di host VPS:

```bash
# Di VPS host
cp nginx/web.bkpp.dev.conf /etc/nginx/sites-available/web.bkpp.dev
ln -sf /etc/nginx/sites-available/web.bkpp.dev /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d web.bkpp.dev --non-interactive --agree-tos -m admin@bkpp.dev --redirect
```

---

## Struktur Deployment

```
web/
├── Dockerfile              # Multi-stage build (deps → build → runner)
├── docker-compose.yml      # Untuk Portainer / docker compose
├── deploy.sh               # Script 1-perintah untuk VPS
├── next.config.js          # output: "standalone" untuk Docker
├── nginx/
│   └── web.bkpp.dev.conf   # Konfigurasi Nginx reverse proxy
└── ...
```

## Port Mapping

| Komponen | Port |
|---|---|
| Next.js container | 3000 (internal) |
| Docker expose | 3001 (host) |
| Nginx | 80 (HTTP) / 443 (HTTPS) |
| Domain | web.bkpp.dev |

## Perintah Manajemen

```bash
# Lihat status container
docker compose -f /opt/sadewa-web/docker-compose.yml ps

# Lihat log
docker compose -f /opt/sadewa-web/docker-compose.yml logs -f

# Restart
docker compose -f /opt/sadewa-web/docker-compose.yml restart

# Stop
docker compose -f /opt/sadewa-web/docker-compose.yml down

# Rebuild (setelah update kode)
cd /opt/sadewa-web
git pull
docker compose build --no-cache
docker compose up -d
```

## Update Aplikasi

```bash
cd /opt/sadewa-web
git pull
docker compose build --no-cache
docker compose up -d
```

## Troubleshooting

### Container tidak start
```bash
docker compose logs sadewa-web
```

### Nginx 502 Bad Gateway
```bash
# Cek container jalan
docker compose ps
# Cek port 3001
curl http://127.0.0.1:3001/login
```

### SSL gagal
```bash
# Pastikan domain resolve ke IP VPS
dig web.bkpp.dev
# Pastikan port 80 terbuka
ufw allow 80
ufw allow 443
```

### Multipart upload error (absen face / train face)
Nginx `client_max_body_size` sudah diset 50M di konfigurasi. Kalau masih error, tambahkan:
```nginx
client_max_body_size 100M;
```
