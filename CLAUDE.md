@AGENTS.md

# CLAUDE.md — GoSpeak English

Hướng dẫn cho AI và dev khi làm việc trên repo này. **Đọc file này + `docs/requirements.md` đầu mỗi phiên.**
Cấu trúc, công nghệ và quy ước **giống hệt dự án QLNS (Tâm Nest)** — khi phân vân, mở QLNS xem cách làm.

---

## 1. Dự án là gì

Website cho trung tâm tiếng Anh GoSpeak English (Hà Nội, 2 cơ sở, ~300 học viên, 10 giáo viên):

1. **Trang giới thiệu công khai** `/` — khóa học, giáo viên, hoạt động, tin tức/khai giảng, form đăng ký học thử.
2. **Cổng học tập** (cần đăng nhập) — học viên làm bài tập về nhà (8 dạng), giáo viên giao/chấm bài và
   xem bé nào hay sai phần nào, phụ huynh xem điểm + nhận xét, quản lý xem cả 2 cơ sở và đăng ký học thử.

Yêu cầu gốc của khách: `docs/requirements.md`. Bản demo HTML tĩnh cũ: `docs/demo-html/`.

## 2. Tech stack (giống QLNS)

| Hạng mục | Dùng | Ghi chú |
|---|---|---|
| Framework | Next.js 16.4.2 (App Router, Turbopack) | `middleware.ts` đã đổi thành **`proxy.ts`** |
| React | 19.2 | |
| ORM | Prisma 7 + `@prisma/adapter-pg` | Client sinh ra ở `src/generated/prisma` |
| Database | PostgreSQL 15 (Docker) | Host port **5436** |
| UI | Tailwind CSS 4 (cấu hình bằng CSS) | Bộ component chép từ QLNS, đổi màu |
| Auth | Auth.js v5 Credentials, JWT | Tên đăng nhập: mã HV / SĐT phụ huynh / tên nhân sự |
| Validation | Zod 4 | |
| File | MinIO | Host port **9300** (API) / **9301** (console) — ghi âm, ảnh vở, ảnh câu hỏi, file đề |
| Excel | exceljs | Nhập danh sách học viên, xuất kết quả |

Cổng lệch mặc định vì máy dev đã có Tâm Nest (5433, 9100), na-demo (5434, 9102), teamcherry (5435, 9200).

## 3. Chạy dự án

```bash
npm install
cp .env.example .env     # rồi đổi AUTH_SECRET
npm run db:up            # Postgres + MinIO
npm run db:migrate
npm run db:seed          # dữ liệu mẫu: 2 cơ sở, 4 lớp, 32 học viên, 4 bài tập, bài nộp mẫu
npm run dev              # http://localhost:3020
```

**Tài khoản demo** — mỗi vai trò một tài khoản, mật khẩu tất cả `123456`:

| Đăng nhập | Vai trò | Ghi chú |
|---|---|---|
| `hv001` | Học viên (Nguyễn Minh Anh) | Còn bài Unit 4 chưa làm |
| `0912345678` | Phụ huynh của hv001 | |
| `cogiao` | Giáo viên (Cô Lan Anh) | Dạy Starters 1A (CS1) + Flyers 3A (CS2) |
| `hocvu` | Học vụ | Nhập bài từ file trung tâm gửi, quản lý học viên, đăng ký học thử |
| `admin` | Quản lý trung tâm | Toàn quyền cả 2 cơ sở |

Seed còn tạo thêm 2 giáo viên và 31 học viên (kèm phụ huynh) làm **dữ liệu nền** cho danh sách lớp,
bảng điểm, thống kê. Đây không phải tài khoản demo, đừng đưa cho khách.

`DEMO_ACCOUNTS=true` trong `.env` thì trang đăng nhập hiện nút điền sẵn tài khoản — **tắt khi chạy thật**.

## 4. Cấu trúc thư mục (giống QLNS)

```
prisma/schema.prisma · seed.ts
src/
├── app/                      # CHỈ routing — page mỏng, gọi <XxxWorkspace/> trong modules/
│   ├── (public)/page.tsx     # trang giới thiệu "/"
│   ├── (auth)/login, doi-mat-khau
│   ├── (main)/               # có sidebar, cần đăng nhập
│   │   ├── hoc-tap/ [id]/    # học viên: danh sách bài, làm bài
│   │   ├── ket-qua/ [id]/    # kết quả (học viên, phụ huynh, giáo viên xem chung)
│   │   ├── phu-huynh/        # phụ huynh: con học thế nào
│   │   ├── dashboard/ bai-tap/ cham-bai/ hoc-vien/ lop-hoc/
│   │   └── dang-ky-hoc-thu/ tin-tuc/ khong-co-quyen/
│   ├── sau-dang-nhap/        # chuyển về trang chính theo quyền
│   └── api/auth, api/assignments/[id]/export
├── modules/                  # ★ nghiệp vụ theo module: <tên>.actions/.service/.schema + components/
│   ├── auth/  classes/  students/  assignments/  study/  grading/
│   ├── parents/  dashboard/  leads/  posts/  landing/
├── common/                   # permissions (can()), guards, enums (nhãn tiếng Việt), filters (ok/fail)
├── shared/                   # prisma.service, audit.service
├── components/               # UI dùng chung chép từ QLNS: layout/ ui/ patterns/ theme/
├── config/navigation.ts      # menu — lọc theo quyền
├── lib/                      # utils.ts, minio.ts
└── proxy.ts
```

## 5. Convention bắt buộc (như QLNS)

- **Mọi kiểm tra quyền qua `can()` / `hasPermission()`** trong `common/permissions/permissions.ts`.
  Không viết `if (roleCodes.includes("TEACHER"))`. Page dùng `requirePagePermission()`.
- Scope: `ALL` (cả trung tâm) · `CAMPUS` (cơ sở mình) · `ASSIGNED` (lớp mình dạy) · `SELF` (bản thân / con mình).
  Lọc danh sách theo lớp đi qua **một chỗ**: `classScopeWhere()` trong `classes.service.ts`.
- Server Action đủ 4 bước: session → quyền → Zod → ghi (+ `writeAuditLog` trong transaction).
- Trả lỗi bằng `ok()` / `fail()` trong `common/filters/error.ts`.
- **Đáp án đúng nằm trong `Question.data` — không bao giờ gửi nguyên data xuống trình duyệt học viên.**
  Dùng `toPlayerQuestion()` (study.service). Server tự chấm lại khi nộp, không tin điểm từ client.
- Chấm điểm là hàm thuần trong `study/study.scoring.ts` (dùng chung cho nộp bài, chấm lại khi sửa đáp án, seed).
- File (ghi âm, ảnh) tải thẳng lên MinIO bằng presigned URL; server kiểm tra key đúng thư mục của bé.
- Giao diện tiếng Việt 100%. Màu dùng token (`bg-primary`, `brand-*` = đỏ GoSpeak, `wood-*` = vàng), không hard-code hex
  (trừ trang giới thiệu có vài mảng màu cố định theo thiết kế).
- `cn()` đã khai báo cỡ chữ theme (`text-display`, `text-h1`…) cho tailwind-merge — thêm cỡ chữ mới thì khai báo ở `lib/utils.ts`.

## 6. Quyết định schema

- Một bảng `User` cho cả nhân sự, học viên, phụ huynh (`userType`). Hồ sơ học viên ở `Student` (1–1 với user của bé,
  n–1 với user phụ huynh — anh chị em dùng chung tài khoản phụ huynh).
- `Submission` = một lần làm bài (`attempt` 1, 2…). Thống kê luôn lấy **lần làm cuối**.
- `Answer.autoFraction` (0–1) cho câu tự chấm, `manualScore` (0–10) cho câu nói/viết; `Submission.score` và
  `pendingCount` được tính lại mỗi khi nộp / chấm / sửa đáp án.
- Bài giao nhiều lớp qua `AssignmentClass`. Soft delete bằng `deletedAt`.

## 7. Việc còn lại / nợ kỹ thuật

- Trang quản lý lớp, giáo viên, phân quyền (hiện tạo qua seed).
- Gửi nhắc bài qua Zalo OA (ZNS) — hiện là nút soạn sẵn tin nhắn để copy.
- Đổi mật khẩu hàng loạt / cấp lại mật khẩu cho học viên.
- Thay dữ liệu mẫu trang giới thiệu bằng dữ liệu trung tâm xác nhận (xem `docs/requirements.md`).
- Chưa có test tự động (QLNS dùng `scripts/verify-*.ts`).
