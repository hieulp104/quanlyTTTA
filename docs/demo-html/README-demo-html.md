# GoSpeak English – Bản demo website

Demo gồm 2 phần, chạy trực tiếp trên trình duyệt, không cần cài đặt:

| Phần | File | Dành cho |
|---|---|---|
| Trang giới thiệu trung tâm | `index.html` | Phụ huynh tìm hiểu, đăng ký học thử |
| Cổng học tập | `hoc-tap/index.html` | Học viên, phụ huynh, giáo viên, quản lý |

**Cách mở:** nhấp đúp `index.html` (nên dùng Chrome hoặc Edge). Muốn gửi link cho khách xem thì đưa cả thư mục lên Netlify, Vercel hoặc GitHub Pages (kéo thả thư mục là chạy).

## Tài khoản dùng thử (mật khẩu: `123456`)

| Vai trò | Đăng nhập | Xem được gì |
|---|---|---|
| Học viên | `hv001` | Bài cần làm, làm bài, điểm, làm lại |
| Phụ huynh | `0912345678` | Điểm, bài chưa làm, nhận xét của cô, kỹ năng yếu |
| Giáo viên | `cogiao` | Giao bài, chấm bài nói/viết, thống kê lớp, nhập Excel |
| Quản lý | `admin` | Cả 2 cơ sở, đăng ký học thử, tin tức, lịch khai giảng |

Trang đăng nhập có sẵn 4 nút "vào thử" nên không cần gõ. Muốn xóa dữ liệu đã thử và quay về dữ liệu mẫu: đăng nhập `admin`, bấm **Đặt lại dữ liệu demo**.

## Đối chiếu với yêu cầu của chị Phương

| # | Yêu cầu | Trong demo |
|---|---|---|
| 1 | 7 dạng bài | Có 8 dạng: chọn A/B/C/D, điền từ, nhìn hình chọn từ, **nối hình với từ**, nghe rồi trả lời (máy đọc giọng bản ngữ, có nút nghe chậm), sắp xếp câu, **ghi âm đọc to**, **viết đoạn văn hoặc chụp ảnh vở** |
| 2 | Cô tự soạn + trung tâm gửi file | Giáo viên: *Bài tập → Soạn bài trên web*, hoặc *Gửi file Word/PDF để nhập* (học vụ nhập giúp, bài có nhãn "Nhập từ file") |
| 3 | Làm lại, giới hạn thời gian | Mỗi bài chọn số lần làm (1/2/3/5/không giới hạn) và thời gian (hết giờ tự nộp) |
| 4 | Điểm từng bé, bé chưa làm, bé hay sai phần nào | Trang kết quả bài: bảng điểm, danh sách chưa làm (có nút soạn tin nhắc Zalo), **bảng màu kỹ năng theo từng bé**, tỉ lệ đúng từng câu. Có nút xuất Excel |
| 5 | Phụ huynh xem điểm, nhận xét | Tài khoản phụ huynh đăng nhập bằng SĐT |
| 6 | 2 cơ sở quản lý chung | Quản lý xem chung, lọc theo cơ sở. Giáo viên dạy ở cả 2 cơ sở (Cô Lan Anh) |
| 7 | Có sẵn danh sách học viên | *Học viên → Nhập từ Excel* (.xlsx/.csv, có file mẫu). Mỗi bé được cấp mã đăng nhập |
| 8 | Trang giới thiệu đủ mục | Khóa học, giáo viên, ảnh/video hoạt động, cảm nhận phụ huynh, tin tức + lịch khai giảng (quản lý tự đăng), form đăng ký học thử (đổ về mục *Đăng ký học thử* của quản lý) |
| 9 | Logo, fanpage | Chờ logo và ảnh thật (xem phần dưới) |

Bố cục trang chủ theo file `De_xuat_cau_truc_website_GoSpeak_English.pdf`: Hero → Giới thiệu → Khóa học → Phương pháp → Cổng học tập → Giáo viên → Hoạt động → Cảm nhận → Tin tức → Hỏi đáp → Cơ sở + form. Có nút gọi, Zalo, Messenger nổi trên điện thoại.

## Thay ảnh và logo thật

Bỏ file vào `assets/img/` đúng tên dưới đây, trang sẽ tự hiện ảnh thay cho hình minh họa:

- `logo.png` (logo vuông)
- `hero-1.jpg`, `hero-2.jpg` (ảnh đầu trang)
- `about.jpg`
- `gv-1.jpg` … `gv-4.jpg` (ảnh giáo viên, vuông)
- `hd-1.jpg` … `hd-4.jpg` (hoạt động)

## Dữ liệu mẫu cần trung tâm xác nhận

Đây là chữ mẫu, phải thay trước khi chạy thật: địa chỉ và hotline 2 cơ sở, tên và hồ sơ giáo viên, độ tuổi và tên khóa học, sĩ số lớp, cảm nhận phụ huynh, link Zalo. Trên đầu trang có dòng thông báo "Bản demo".

## Giới hạn của bản demo (bản chính thức sẽ làm)

- Dữ liệu đang lưu trong trình duyệt (localStorage): mỗi máy thấy dữ liệu riêng, và file ghi âm/ảnh dung lượng lớn có thể không lưu được. Bản thật cần máy chủ + cơ sở dữ liệu + nơi lưu file ghi âm/ảnh.
- Mật khẩu đang dùng chung `123456`. Bản thật cần đăng nhập thật, đổi mật khẩu, phân quyền.
- Bài nghe đang dùng giọng đọc của trình duyệt. Bản thật cho phép tải file nghe mp3 của giáo trình.
- Nhắc bài đang là sao chép tin nhắn. Bản thật có thể gửi tự động qua Zalo OA (ZNS).

## Cấu trúc thư mục

```
index.html              Trang giới thiệu
hoc-tap/index.html      Đăng nhập
hoc-tap/app.html        Cổng học tập
assets/css/             base.css (màu, chữ, nút), site.css, app.css
assets/js/store.js      Dữ liệu mẫu, chấm điểm, lưu trữ
assets/js/site.js       Trang giới thiệu (tin tức, form)
assets/js/app.js        Học viên, phụ huynh, làm bài, kết quả
assets/js/staff.js      Giáo viên, quản lý (giao bài, chấm, thống kê, nhập Excel)
assets/img/             Ảnh thật của trung tâm
```
