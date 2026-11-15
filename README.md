# GoSpeak English

Trang giới thiệu trung tâm + cổng học tập (giao bài, làm bài, chấm bài, phụ huynh theo dõi).
Cùng công nghệ và cấu trúc với dự án QLNS: Next.js 16 · Prisma 7 · PostgreSQL · Auth.js · Tailwind 4 · MinIO.

## Chạy trên máy

```bash
npm install
cp .env.example .env      # đổi AUTH_SECRET
npm run db:up             # Postgres (5436) + MinIO (9300/9301) bằng Docker
npm run db:migrate
npm run db:seed
npm run dev               # http://localhost:3020
```

- `http://localhost:3020` — trang giới thiệu
- `http://localhost:3020/login` — cổng học tập. Mỗi vai trò một tài khoản demo, mật khẩu `123456`:
  `hv001` (học viên) · `0912345678` (phụ huynh) · `cogiao` (giáo viên) · `hocvu` (học vụ) · `admin` (quản lý)

Ảnh thật của trung tâm: bỏ vào `public/images/landing/` (xem README.txt trong đó).

Chi tiết cho dev: `CLAUDE.md`. Yêu cầu của khách: `docs/requirements.md`.
