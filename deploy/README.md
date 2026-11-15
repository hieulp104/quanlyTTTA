# Triển khai GoSpeak lên VPS

Server: Ubuntu, 2 vCPU, 4 GB RAM, IP `103.77.209.28`, thư mục `/opt/gospeak`.
Web: `https://abcd.io.vn` · File (ghi âm, ảnh vở): `https://files.abcd.io.vn`.

Mọi thứ chạy bằng Docker: Caddy (HTTPS tự động) → app Next.js, Postgres, MinIO.
Chỉ cổng 80 và 443 mở ra internet.

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

### 1. Trỏ tên miền

Trang quản trị tên miền → **Bản ghi DNS** → **Tạo bản ghi**, thêm 3 bản ghi (giữ nguyên bản ghi NS):

| Host    | Loại | Giá trị         | TTL  |
|---------|------|-----------------|------|
| `@`     | A    | `103.77.209.28` | 3600 |
| `www`   | A    | `103.77.209.28` | 3600 |
| `files` | A    | `103.77.209.28` | 3600 |

Kiểm tra: `nslookup abcd.io.vn` và `nslookup files.abcd.io.vn` đều trả về `103.77.209.28`.

### 2. Kiểm tra server

Server đã chạy teamcherry nên đã có Docker. Kiểm tra hai điều:

```bash
free -h                                   # có dòng Swap chưa? chưa có thì tạo bên dưới
docker ps --format '{{.Names}}\t{{.Ports}}'   # cổng 80/443 đã có ai giữ chưa?
```

**Tạo swap 2 GB** (bước build Next.js cần thêm bộ nhớ):

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**Nếu cổng 80/443 đã có dịch vụ khác giữ** (ví dụ Caddy/Nginx của teamcherry): hai Caddy không thể
cùng giữ một cổng. Khi đó bỏ dịch vụ `caddy` trong `docker-compose.prod.yml`, và thêm hai khối
trong `deploy/Caddyfile` vào proxy đang có, trỏ tới `gospeak-app:3000` và `gospeak-minio:9000`
(cần nối chung mạng Docker), hoặc mở cổng app/MinIO ra `127.0.0.1` để proxy kia gọi vào.

### 3. Lấy mã nguồn

Repo private thì server cần quyền đọc. Nếu server đã pull được teamcherry bằng SSH key thì thêm
chính key đó (hoặc key mới) vào repo GitHub này: repo → **Settings → Deploy keys → Add deploy key**,
dán nội dung `cat ~/.ssh/id_ed25519.pub` (chưa có thì `ssh-keygen -t ed25519`), chỉ cần quyền đọc.

```bash
git clone git@github.com:<tai-khoan>/<ten-repo>.git /opt/gospeak
cd /opt/gospeak
```

### 4. Điền cấu hình

```bash
cp deploy/env.production.example .env
for i in 1 2 3; do openssl rand -hex 24; done   # dán 3 chuỗi vào POSTGRES_PASSWORD, MINIO_PASSWORD, AUTH_SECRET
nano .env
```

`DEMO_ACCOUNTS=true` để trung tâm bấm thử từng vai trò. Khi dùng thật: đổi thành `false` và đổi
mật khẩu các tài khoản mẫu.

### 5. Chạy

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm migrate npm run db:seed   # dữ liệu demo — CHỈ chạy 1 lần
```

Mở `https://abcd.io.vn`. Lần đầu Caddy cần khoảng 30 giây xin chứng chỉ HTTPS. Báo lỗi chứng chỉ
thì DNS ở bước 1 chưa cập nhật xong: chờ thêm rồi `docker compose -f docker-compose.prod.yml restart caddy`.

---

## Theo dõi, sao lưu

```bash
C="docker compose -f docker-compose.prod.yml"
$C ps                  # trạng thái
$C logs -f app         # log web
$C logs migrate        # lần migrate gần nhất
$C logs -f caddy       # log HTTPS
free -h && df -h       # RAM, ổ đĩa

# Sao lưu cơ sở dữ liệu
$C exec postgres pg_dump -U gospeak gospeak | gzip > /root/gospeak-$(date +%F).sql.gz
```

Dữ liệu nằm trong Docker volume (`postgres_data`, `minio_data`), không mất khi build lại hay khởi
động lại server. Chỉ mất khi chạy `docker compose down -v` — **đừng thêm `-v`**.
