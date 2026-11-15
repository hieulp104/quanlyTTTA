# Triển khai GoSpeak lên VPS

Server: Ubuntu 24.04, 2 vCPU, 4 GB RAM + 6 GB swap, IP `103.77.209.28`, thư mục `/opt/gospeak`.
Web: `https://abcd.io.vn` · File (ghi âm, ảnh vở): `https://files.abcd.io.vn`.

Server chạy chung với teamcherry, na-demo, bookstore. **Nginx cài trên máy** giữ cổng 80/443 và
HTTPS (certbot) cho tất cả; mỗi dự án chạy trong Docker và chỉ mở một cổng nội bộ `127.0.0.1`:

| Dịch vụ GoSpeak     | Cổng nội bộ       | Tên miền           |
|---------------------|-------------------|--------------------|
| app (Next.js)       | `127.0.0.1:8120`  | `abcd.io.vn`       |
| MinIO (kho file)    | `127.0.0.1:8121`  | `files.abcd.io.vn` |
| Postgres            | không mở ra ngoài | —                  |

## Cập nhật phiên bản mới (dùng hằng ngày)

Ở máy dev: commit rồi `git push`. Trên server:

```bash
ssh root@103.77.209.28
cd /opt/gospeak
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Lệnh `up` tự cập nhật bảng (dịch vụ `migrate`) trước khi app khởi động lại. Build mất 3–8 phút;
trang web cũ vẫn chạy trong lúc build. Thỉnh thoảng dọn ảnh cũ: `docker image prune -f`.

---

## Cài lần đầu

### 1. Tên miền (đã xong)

Ba bản ghi A `@`, `www`, `files` → `103.77.209.28`.

### 2. Lấy mã nguồn

Repo private nên server cần quyền đọc: thêm SSH key của server vào repo GitHub làm deploy key.

```bash
ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Dán dòng vừa in vào GitHub: repo `hieulp104/quanlyTTTA` → **Settings → Deploy keys → Add deploy key**
(không cần tick quyền ghi). Nếu key này đã là deploy key của repo teamcherry thì GitHub không cho
dùng lại cho repo khác — khi đó tạo key riêng, xem cuối file.

```bash
git clone git@github.com:hieulp104/quanlyTTTA.git /opt/gospeak
cd /opt/gospeak
```

### 3. Điền cấu hình

```bash
cp deploy/env.production.example .env
for i in 1 2 3; do openssl rand -hex 24; done   # dán 3 chuỗi vào POSTGRES_PASSWORD, MINIO_PASSWORD, AUTH_SECRET
nano .env
```

`DEMO_ACCOUNTS=true` để trung tâm bấm thử từng vai trò. Khi dùng thật: đổi thành `false` và đổi
mật khẩu các tài khoản mẫu.

### 4. Chạy

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm migrate npm run db:seed   # dữ liệu demo — CHỈ chạy 1 lần
curl -s http://127.0.0.1:8120/api/health                                      # phải ra {"ok":true}
```

### 5. Nginx + HTTPS

```bash
cp deploy/nginx-gospeak.conf /etc/nginx/sites-available/gospeak
ln -s /etc/nginx/sites-available/gospeak /etc/nginx/sites-enabled/gospeak
nginx -t && systemctl reload nginx

certbot --nginx -d abcd.io.vn -d www.abcd.io.vn -d files.abcd.io.vn
```

Certbot hỏi có chuyển HTTP sang HTTPS không thì chọn **có** (redirect). Chứng chỉ tự gia hạn như
các dự án khác. Chưa có certbot: `apt install -y certbot python3-certbot-nginx`.

Mở `https://abcd.io.vn` là xong. Cập nhật code về sau không cần đụng lại Nginx.

---

## Theo dõi, sao lưu

```bash
C="docker compose -f docker-compose.prod.yml"
$C ps                  # trạng thái
$C logs -f app         # log web
$C logs migrate        # lần migrate gần nhất
free -h && df -h       # RAM, ổ đĩa
tail -f /var/log/nginx/error.log

# Sao lưu cơ sở dữ liệu
$C exec postgres pg_dump -U gospeak gospeak | gzip > /root/gospeak-$(date +%F).sql.gz
```

Dữ liệu nằm trong Docker volume (`postgres_data`, `minio_data`), không mất khi build lại hay khởi
động lại server. Chỉ mất khi chạy `docker compose down -v` — **đừng thêm `-v`**.

## Deploy key riêng cho GoSpeak (khi key mặc định đã dùng cho repo khác)

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/gospeak_deploy
cat ~/.ssh/gospeak_deploy.pub          # dán vào Deploy keys của repo quanlyTTTA
cat >> ~/.ssh/config <<'EOF'
Host github-gospeak
  HostName github.com
  IdentityFile ~/.ssh/gospeak_deploy
  IdentitiesOnly yes
EOF
git clone git@github-gospeak:hieulp104/quanlyTTTA.git /opt/gospeak
```
