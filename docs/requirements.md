# Yêu cầu GoSpeak English (tổng hợp từ trao đổi với chị Phương, 12/11/2026)

Nguồn: nhóm Zalo "Thiết kế web học tập" + file `De_xuat_cau_truc_website_GoSpeak_English.pdf` (bạn Biển soạn).

## Thông tin trung tâm

- Mục đích web: học sinh làm thêm bài tập + giới thiệu trung tâm.
- Khoảng 300 học viên, 10 giáo viên, 2 cơ sở.
- Học viên: tiếng Anh thiếu nhi và giao tiếp 4 kỹ năng Nghe – Nói – Đọc – Viết.
- Đang quản lý/giao bài bằng Zalo, Facebook. Chưa có web tham khảo. Cần càng sớm càng tốt.
- Fanpage: https://www.facebook.com/share/1F27dF542a/

## Câu trả lời của trung tâm → đã làm ở đâu

| # | Câu hỏi | Trả lời | Trong code |
|---|---|---|---|
| 1 | Dạng bài | Tất cả | 8 dạng `QuestionType`: MCQ, FILL, PICTURE, MATCH, LISTEN, ORDER, SPEAK, WRITE — `study/components/player.tsx` |
| 2 | Ai soạn bài | Cả 2 (cô soạn trên web + trung tâm gửi file) | `/bai-tap/tao-moi` + "Gửi file Word/PDF để nhập" → học vụ bấm "Nhập thành bài tập" |
| 3 | Làm lại, giới hạn giờ | Có | `Assignment.maxAttempts`, `timeLimitMin` (hết giờ tự nộp) |
| 4 | Cô cần xem gì | Tất cả | `/bai-tap/[id]`: điểm từng bé, chưa làm (+ tin nhắc Zalo), bảng kỹ năng theo bé, tỉ lệ đúng từng câu, xuất Excel |
| 5 | Phụ huynh xem điểm | Có | `/phu-huynh`, `/ket-qua` — đăng nhập bằng SĐT |
| 6 | 2 cơ sở | Quản lý chung | Scope `ALL` cho quản lý, lọc theo cơ sở; giáo viên dạy được cả 2 cơ sở |
| 7 | Có danh sách học viên | Có | `/hoc-vien` → Nhập từ Excel (.xlsx/.csv, có file mẫu) |
| 8 | Mục trang giới thiệu | Tất cả | `/`: khóa học, giáo viên, ảnh/video, cảm nhận, tin tức + khai giảng, form học thử |
| 9 | Logo, fanpage | Có | Chờ file logo gốc và ảnh thật |

## Dữ liệu cần trung tâm xác nhận trước khi chạy thật

Logo, địa chỉ + hotline + giờ mở cửa 2 cơ sở, tên/độ tuổi/học phí khóa học, hồ sơ giáo viên + ảnh,
cảm nhận phụ huynh (có đồng ý), ảnh/video hoạt động, link Zalo OA, chính sách bảo mật dữ liệu trẻ em.
