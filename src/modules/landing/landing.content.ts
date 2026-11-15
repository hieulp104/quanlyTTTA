/**
 * Nội dung tĩnh của trang giới thiệu. Khóa học, giáo viên, cảm nhận đang là DỮ LIỆU MẪU —
 * thay bằng thông tin trung tâm xác nhận (xem docs/requirements.md mục "Dữ liệu cần xác nhận").
 * Ảnh thật: đặt vào public/images/landing/ đúng tên trong trường `photo`, trang tự dùng ảnh đó.
 */

export const COURSES = [
  { age: "6 – 8 tuổi", name: "Kids Starters", color: "#c8102e", desc: "Làm quen tiếng Anh qua bài hát, hình ảnh và trò chơi.", points: ["Từ vựng chủ đề gần gũi", "Phát âm chuẩn từ đầu", "Nghe – nói câu đơn giản"] },
  { age: "8 – 10 tuổi", name: "Kids Movers", color: "#e08a00", desc: "Mở rộng vốn từ, bắt đầu đọc hiểu và viết câu.", points: ["Ngữ pháp nền tảng", "Đọc truyện ngắn", "Thuyết trình theo chủ đề"] },
  { age: "10 – 12 tuổi", name: "Kids Flyers", color: "#2f6fdf", desc: "Hoàn thiện 4 kỹ năng, viết đoạn văn và tranh luận ngắn.", points: ["Viết đoạn 50–80 từ", "Nghe hiểu bài dài", "Dự án nhóm"] },
  { age: "12 tuổi trở lên", name: "Giao tiếp 4 kỹ năng", color: "#1f9d63", desc: "Phản xạ nói, phát âm và tự tin trình bày ý kiến.", points: ["Luyện nói mỗi buổi", "Sửa phát âm cá nhân", "Câu lạc bộ Speaking"] },
] as const;

export const COURSE_OPTIONS = [
  "Kids Starters (6–8 tuổi)",
  "Kids Movers (8–10 tuổi)",
  "Kids Flyers (10–12 tuổi)",
  "Giao tiếp 4 kỹ năng",
  "Kiểm tra trình độ đầu vào",
  "Chưa rõ, cần tư vấn",
] as const;

export const VALUES = [
  { title: "Giao tiếp thực tế", text: "Con dùng được tiếng Anh, không chỉ làm đúng bài tập." },
  { title: "Đủ 4 kỹ năng", text: "Nghe – Nói – Đọc – Viết được luyện song song theo lộ trình." },
  { title: "Học qua trải nghiệm", text: "Trò chơi, hoạt động nhóm, thuyết trình và dự án nhỏ." },
  { title: "Đồng hành cùng gia đình", text: "Bố mẹ xem điểm, nhận xét và tiến bộ của con trên web." },
] as const;

/** Vòng học mỗi tuần — là một quy trình thật nên được đánh số. */
export const LOOP = [
  { title: "Học trên lớp", text: "Học qua trò chơi, hội thoại và hoạt động nhóm cùng giáo viên." },
  { title: "Luyện tập ở nhà", text: "Làm bài online 15–20 phút: nghe, chọn, sắp xếp câu, ghi âm đọc to." },
  { title: "Cô chấm và nhận xét", text: "Trắc nghiệm chấm ngay. Bài nói, bài viết cô nghe, đọc và nhận xét riêng." },
  { title: "Kèm đúng phần yếu", text: "Cô thấy con hay sai phần nào để ôn lại ở buổi sau. Bố mẹ cũng xem được." },
] as const;

export const TEACHERS = [
  { name: "Cô Lan Anh", hi: "Hello, I'm Lan Anh!", role: "Giáo viên thiếu nhi", text: "IELTS 8.0, TESOL. 6 năm dạy trẻ 6–12 tuổi.", photo: "gv-1.jpg" },
  { name: "Thầy Minh Đức", hi: "Repeat after me!", role: "Giao tiếp – Phát âm", text: "Cử nhân Ngôn ngữ Anh, chuyên luyện phát âm.", photo: "gv-2.jpg" },
  { name: "Ms. Emily", hi: "Hi there, I'm Emily!", role: "Giáo viên bản ngữ", text: "Phụ trách Speaking Club cuối tuần.", photo: "gv-3.jpg" },
  { name: "Cô Thu Hà", hi: "Ready to play?", role: "Giáo viên thiếu nhi", text: "Chứng chỉ Cambridge TKT, yêu thích dạy qua dự án.", photo: "gv-4.jpg" },
] as const;

/** Câu các con nói được sau vài tuần — chạy ngang dưới hero. */
export const PHRASES = [
  "Hello!", "What's your name?", "I like bananas.", "Let's play!", "How are you today?",
  "My favourite colour is red.", "Can I have a turn?", "See you tomorrow!",
] as const;

export const QUOTES = [
  { text: "Trước con rất ngại nói, giờ về nhà hay tự hát và kể lại bài học bằng tiếng Anh. Mình thích nhất là xem được cô nhận xét bài nói của con.", name: "Chị Hương", who: "Mẹ bé Gia Huy, 7 tuổi" },
  { text: "Lớp ít bạn nên cô để ý từng con. Bài tập trên web ngắn, con tự làm được, không cần bố mẹ ngồi kèm.", name: "Anh Tuấn", who: "Bố bé Khánh Linh, 9 tuổi" },
  { text: "Con thi Movers được 13/15 khiên. Cảm ơn các thầy cô đã kiên nhẫn với con.", name: "Chị Mai", who: "Mẹ bé Bảo Ngọc, 10 tuổi" },
] as const;

export const FAQ = [
  { q: "Con chưa học tiếng Anh bao giờ có theo được không?", a: "Được ạ. Con sẽ làm bài kiểm tra đầu vào miễn phí và học thử 2 buổi để giáo viên xếp lớp đúng trình độ." },
  { q: "Một lớp có bao nhiêu học viên?", a: "Tối đa 12–14 bạn, để mỗi con đều được nói và được sửa trong buổi học." },
  { q: "Bố mẹ theo dõi việc học của con thế nào?", a: "Bố mẹ đăng nhập cổng học tập bằng số điện thoại đã đăng ký, xem điểm từng bài, bài chưa làm và nhận xét của giáo viên." },
  { q: "Bài tập về nhà có cần máy tính không?", a: "Không cần. Con làm được trên điện thoại hoặc máy tính bảng. Bài nói ghi âm trực tiếp, bài viết chụp ảnh vở để gửi." },
  { q: "Học ở cơ sở này có chuyển sang cơ sở kia được không?", a: "Được ạ. Hai cơ sở dùng chung chương trình và hệ thống quản lý, nên con chuyển lớp không bị mất kết quả học." },
] as const;

export const FANPAGE_URL = "https://www.facebook.com/share/1F27dF542a/";
