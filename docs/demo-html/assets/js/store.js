/* GoSpeak demo — dữ liệu mẫu + lưu trữ trên trình duyệt (localStorage).
   Bản chính thức sẽ thay lớp này bằng API + cơ sở dữ liệu thật. */
(function () {
  const KEY = "gs_db_v4";
  const SESSION = "gs_session";

  // ---------- tiện ích ----------
  function rng(seed) { // PRNG cố định để dữ liệu mẫu luôn giống nhau
    let s = seed >>> 0;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const uid = (p) => p + Math.random().toString(36).slice(2, 9);
  const DAY = 86400000;
  const now = () => Date.now();
  const norm = (s) => String(s || "").toLowerCase().replace(/[.,!?;:'"’]/g, "").replace(/\s+/g, " ").trim();

  const TYPE_INFO = {
    mcq: { label: "Chọn đáp án đúng", skill: "Ngữ pháp", icon: "🔤", manual: false },
    fill: { label: "Điền từ còn thiếu", skill: "Từ vựng", icon: "✏️", manual: false },
    picture: { label: "Nhìn hình chọn từ", skill: "Từ vựng", icon: "🖼️", manual: false },
    match: { label: "Nối hình với từ", skill: "Từ vựng", icon: "🔗", manual: false },
    listen: { label: "Nghe và trả lời", skill: "Nghe", icon: "🎧", manual: false },
    order: { label: "Sắp xếp thành câu", skill: "Ngữ pháp", icon: "🧩", manual: false },
    speak: { label: "Đọc to, ghi âm", skill: "Nói", icon: "🎙️", manual: true },
    write: { label: "Viết đoạn văn", skill: "Viết", icon: "📝", manual: true },
  };
  const SKILLS = ["Nghe", "Nói", "Đọc", "Viết", "Từ vựng", "Ngữ pháp"];

  // ---------- chấm điểm ----------
  function gradeQuestion(q, ans) {
    if (TYPE_INFO[q.type].manual) return null;
    if (ans === undefined || ans === null || ans === "") return 0;
    switch (q.type) {
      case "mcq": case "picture": case "listen": return Number(ans) === q.answer ? 1 : 0;
      case "fill": return (q.answer || []).some((a) => norm(a) === norm(ans)) ? 1 : 0;
      case "order": return norm((ans || []).join(" ")) === norm(q.words.join(" ")) ? 1 : 0;
      case "match": {
        let ok = 0; q.pairs.forEach((_, i) => { if (Number(ans[i]) === i) ok++; });
        return ok / q.pairs.length;
      }
    }
    return 0;
  }
  function scoreSubmission(sub, asg) {
    let total = 0, got = 0, pending = 0;
    const perSkill = {};
    asg.questions.forEach((q) => {
      const skill = q.skill || TYPE_INFO[q.type].skill;
      perSkill[skill] = perSkill[skill] || { got: 0, total: 0 };
      let frac;
      if (TYPE_INFO[q.type].manual) {
        const m = sub.manual && sub.manual[q.id];
        if (!m || m.score === undefined || m.score === null || m.score === "") { pending++; return; }
        frac = Number(m.score) / 10;
      } else frac = gradeQuestion(q, sub.answers[q.id]);
      total += 1; got += frac;
      perSkill[skill].total += 1; perSkill[skill].got += frac;
    });
    const score = total ? Math.round((got / total) * 100) / 10 : null;
    return { score, pending, perSkill };
  }

  // ---------- dữ liệu mẫu ----------
  function seed() {
    const R = rng(20261112);
    const pick = (arr) => arr[Math.floor(R() * arr.length)];

    const campuses = [
      { id: "cs1", name: "Cơ sở 1", address: "Địa chỉ cơ sở 1 (sẽ cập nhật), Hà Nội", phone: "0900 000 001", hours: "8:00 – 20:30, Thứ 2 – Chủ nhật" },
      { id: "cs2", name: "Cơ sở 2", address: "Địa chỉ cơ sở 2 (sẽ cập nhật), Hà Nội", phone: "0900 000 002", hours: "8:00 – 20:30, Thứ 2 – Chủ nhật" },
    ];
    const teachers = [
      { id: "t1", name: "Cô Lan Anh", username: "cogiao", campus: "cs1", subject: "Tiếng Anh thiếu nhi" },
      { id: "t2", name: "Thầy Minh Đức", username: "thayduc", campus: "cs1", subject: "Giao tiếp – Phát âm" },
      { id: "t3", name: "Cô Thu Hà", username: "cothuha", campus: "cs2", subject: "Tiếng Anh thiếu nhi" },
    ];
    const classes = [
      { id: "c1", name: "Starters 1A", level: "Thiếu nhi 6–8 tuổi", campus: "cs1", teacher: "t1", schedule: "T3 – T5, 17:30" },
      { id: "c2", name: "Movers 2B", level: "Thiếu nhi 8–10 tuổi", campus: "cs1", teacher: "t2", schedule: "T2 – T4, 18:00" },
      { id: "c3", name: "Flyers 3A", level: "Thiếu nhi 10–12 tuổi", campus: "cs2", teacher: "t1", schedule: "T7 – CN, 9:00" },
      { id: "c4", name: "Giao tiếp Teen 4A", level: "Giao tiếp 12–15 tuổi", campus: "cs2", teacher: "t3", schedule: "T3 – T6, 19:00" },
    ];
    const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
    const ten = ["Minh Anh", "Bảo Ngọc", "Gia Huy", "Khánh Linh", "Đức Minh", "Hà My", "Tuấn Kiệt", "Phương Thảo", "Quốc Bảo", "Ngọc Hân", "Anh Thư", "Hoàng Nam", "Tú Anh", "Đăng Khoa", "Diệp Chi", "Thành An", "Bảo Châu", "Minh Khôi", "Thùy Dương", "Nhật Minh", "Mai Chi", "Trung Hiếu", "Yến Nhi", "Gia Bảo", "Thảo Vy", "Hải Đăng", "Như Ý", "Duy Khang", "Khánh An", "Lâm Phong", "Thanh Trúc", "Hữu Phúc"];
    const students = [];
    let n = 0;
    classes.forEach((c) => {
      for (let i = 0; i < 8; i++) {
        const name = (n === 0 ? "Nguyễn" : pick(ho)) + " " + ten[n];
        n++;
        students.push({
          id: "s" + n, code: "hv" + String(n).padStart(3, "0"), name, classId: c.id,
          parentName: "Phụ huynh bé " + name.split(" ").slice(-2).join(" "),
          parentPhone: n === 1 ? "0912345678" : "09" + String(10000000 + Math.floor(R() * 89999999)),
        });
      }
    });

    const assignments = [
      {
        id: "a1", title: "Unit 3 – Animals", classIds: ["c1", "c2"], createdBy: "t1", source: "web",
        createdAt: now() - 9 * DAY, due: now() - 2 * DAY, timeLimit: 20, maxAttempts: 2,
        note: "Các con nhớ nghe kỹ trước khi chọn nhé!",
        questions: [
          { id: "q1", type: "picture", prompt: "Đây là con gì?", image: "🐘", options: ["elephant", "monkey", "tiger", "rabbit"], answer: 0 },
          { id: "q2", type: "match", prompt: "Nối mỗi hình với từ đúng", pairs: [["🐶", "dog"], ["🐱", "cat"], ["🐟", "fish"], ["🐦", "bird"]] },
          { id: "q3", type: "mcq", prompt: "A giraffe ___ a long neck.", options: ["have", "has", "having", "is"], answer: 1 },
          { id: "q4", type: "listen", prompt: "Nghe và chọn con vật bạn nhỏ thích nhất", audioText: "Hello! My name is Tom. I like monkeys. They are funny.", options: ["Cats", "Monkeys", "Lions", "Birds"], answer: 1 },
          { id: "q5", type: "fill", prompt: "The lion is big and ___. (mạnh mẽ)", answer: ["strong"] },
          { id: "q6", type: "order", prompt: "Sắp xếp các từ thành câu đúng", words: ["I", "can", "see", "three", "ducks"] },
          { id: "q7", type: "speak", prompt: "Con đọc to câu sau rồi bấm gửi cho cô nhé", text: "I like elephants because they are big and kind." },
        ],
      },
      {
        id: "a2", title: "Unit 4 – My family", classIds: ["c1"], createdBy: "t1", source: "web",
        createdAt: now() - 2 * DAY, due: now() + 3 * DAY, timeLimit: 0, maxAttempts: 3,
        note: "Bài viết: con chụp ảnh vở gửi cô hoặc gõ trực tiếp đều được.",
        questions: [
          { id: "q1", type: "mcq", prompt: "My mother's mother is my ___.", options: ["aunt", "sister", "grandmother", "cousin"], answer: 2, skill: "Từ vựng" },
          { id: "q2", type: "fill", prompt: "This ___ my brother. His name is Nam.", answer: ["is"], skill: "Ngữ pháp" },
          { id: "q3", type: "picture", prompt: "Chọn từ đúng với hình", image: "👶", options: ["baby", "father", "uncle", "teacher"], answer: 0 },
          { id: "q4", type: "listen", prompt: "Nghe và cho biết bạn Lily có mấy anh chị em?", audioText: "I am Lily. I have one brother and two sisters.", options: ["One", "Two", "Three", "Four"], answer: 2 },
          { id: "q5", type: "mcq", prompt: "Đọc: “Ben is nine. He has a little sister. She is four.” – How old is Ben's sister?", options: ["Nine", "Four", "Five", "Two"], answer: 1, skill: "Đọc" },
          { id: "q6", type: "order", prompt: "Sắp xếp các từ thành câu đúng", words: ["My", "father", "is", "a", "doctor"] },
          { id: "q7", type: "write", prompt: "Viết 3–5 câu giới thiệu về gia đình con (có mấy người, mỗi người làm gì)." },
        ],
      },
      {
        id: "a3", title: "Daily routines – Listening & Speaking", classIds: ["c3", "c4"], createdBy: "t1", source: "web",
        createdAt: now() - 6 * DAY, due: now() - 1 * DAY, timeLimit: 25, maxAttempts: 1,
        note: "",
        questions: [
          { id: "q1", type: "listen", prompt: "What time does Anna get up?", audioText: "Every day, Anna gets up at six thirty. She has breakfast at seven.", options: ["6:00", "6:30", "7:00", "7:30"], answer: 1 },
          { id: "q2", type: "listen", prompt: "How does Peter go to school?", audioText: "Peter lives near his school, so he walks to school every morning.", options: ["By bus", "By bike", "On foot", "By car"], answer: 2 },
          { id: "q3", type: "mcq", prompt: "She usually ___ her homework after dinner.", options: ["do", "does", "doing", "did"], answer: 1 },
          { id: "q4", type: "fill", prompt: "I brush my ___ twice a day.", answer: ["teeth"] },
          { id: "q5", type: "order", prompt: "Sắp xếp thành câu đúng", words: ["We", "never", "watch", "TV", "in", "the", "morning"] },
          { id: "q6", type: "speak", prompt: "Nói 3–4 câu về một ngày của con", text: "Gợi ý: I get up at… / I go to school by… / After school, I…" },
          { id: "q7", type: "write", prompt: "Viết đoạn văn ngắn (40–60 từ) về ngày cuối tuần của con." },
        ],
      },
      {
        id: "a4", title: "Ôn tập giữa kỳ – Food & Drinks", classIds: ["c1", "c2"], createdBy: "t1", source: "file", sourceFile: "On_tap_giua_ky_Food.pdf",
        createdAt: now() - 1 * DAY, due: now() + 6 * DAY, timeLimit: 15, maxAttempts: 1,
        note: "Bài do trung tâm gửi file PDF, bộ phận học vụ đã nhập lên web.",
        questions: [
          { id: "q1", type: "picture", prompt: "Đây là gì?", image: "🍌", options: ["apple", "banana", "orange", "grape"], answer: 1 },
          { id: "q2", type: "match", prompt: "Nối hình với từ", pairs: [["🥛", "milk"], ["🍞", "bread"], ["🍚", "rice"], ["🥕", "carrot"]] },
          { id: "q3", type: "mcq", prompt: "Would you like ___ apple?", options: ["a", "an", "some", "any"], answer: 1 },
          { id: "q4", type: "listen", prompt: "Mai muốn ăn gì?", audioText: "Mum, I'm hungry. Can I have some noodles, please?", options: ["Rice", "Bread", "Noodles", "Cake"], answer: 2 },
          { id: "q5", type: "fill", prompt: "I'm thirsty. I want a glass of ___. (nước)", answer: ["water"] },
          { id: "q6", type: "order", prompt: "Sắp xếp thành câu đúng", words: ["Do", "you", "like", "chicken"] },
        ],
      },
    ];

    // Sinh bài nộp mẫu: mỗi bé có 1 kỹ năng "yếu" để giáo viên thấy được phân tích
    const submissions = [];
    const sampleWrite = [
      "There are four people in my family. My father is a driver. My mother is a teacher. I have a little brother. I love my family.",
      "My family has five people. My dad works in a bank. My mom is a nurse. My sister and I are students.",
      "On Sunday I get up at 8 o'clock. I play football with my friends. In the afternoon I visit my grandparents.",
    ];
    const comments = ["Con làm tốt lắm, cố gắng phát huy nhé!", "Phát âm rõ hơn rồi, chú ý âm cuối /s/ nhé.", "Con cần nghe lại bài 2 lần trước khi chọn.", "Câu viết đúng ngữ pháp, thêm từ nối and/but nhé.", "Bài làm cẩn thận, cô khen!"];

    students.forEach((st, si) => {
      const ability = 0.55 + R() * 0.4;
      const weak = pick(["Nghe", "Ngữ pháp", "Từ vựng", "Nói", "Viết"]);
      st._weak = weak;
      assignments.forEach((a) => {
        if (!a.classIds.includes(st.classId)) return;
        if (a.id === "a4") return; // bài mới giao, chưa ai làm
        const pDone = a.due < now() ? 0.85 : 0.5;
        if (si === 0 && a.id === "a2") return; // bé demo chưa làm bài a2
        if (R() > pDone) return;
        const answers = {}, manual = {};
        a.questions.forEach((q) => {
          const skill = q.skill || TYPE_INFO[q.type].skill;
          const p = skill === weak ? ability - 0.35 : ability;
          const ok = R() < p;
          answers[q.id] = fakeAnswer(q, ok, R);
          if (TYPE_INFO[q.type].manual) {
            const graded = !(a.id === "a2" && R() < 0.6) && !(a.id === "a3" && R() < 0.3);
            if (q.type === "write") answers[q.id] = { text: pick(sampleWrite) };
            if (q.type === "speak") answers[q.id] = { audio: null, seeded: true, duration: 8 + Math.floor(R() * 10) };
            if (graded) manual[q.id] = { score: Math.max(4, Math.min(10, Math.round((p + R() * 0.3) * 10))), comment: pick(comments) };
          }
        });
        const submittedAt = Math.min(now() - DAY / 4, a.createdAt + DAY * (0.5 + R() * 3));
        submissions.push({
          id: "sub" + submissions.length, assignmentId: a.id, studentId: st.id, attempt: 1,
          startedAt: submittedAt - 600000, submittedAt, durationSec: 300 + Math.floor(R() * 700),
          answers, manual, teacherComment: R() < 0.5 ? pick(comments) : "",
        });
      });
      delete st._weak;
    });

    const news = [
      { id: "n1", kind: "khai-giang", title: "Khai giảng lớp Starters (6–8 tuổi)", date: now() + 10 * DAY, campus: "cs1", body: "Tặng 2 buổi học thử miễn phí, kiểm tra đầu vào cùng giáo viên." },
      { id: "n2", kind: "khai-giang", title: "Khai giảng lớp Giao tiếp Teen", date: now() + 17 * DAY, campus: "cs2", body: "Lớp nhỏ tối đa 12 bạn, luyện nói mỗi buổi." },
      { id: "n3", kind: "su-kien", title: "Halloween Party – các bé hóa trang và thuyết trình bằng tiếng Anh", date: now() - 14 * DAY, campus: "cs1", body: "Hơn 80 bé tham gia hóa trang, kể chuyện và chơi trò chơi tiếng Anh." },
      { id: "n4", kind: "tin-tuc", title: "5 cách giúp con luyện nói tiếng Anh tại nhà mỗi ngày 10 phút", date: now() - 20 * DAY, campus: "", body: "Gợi ý cho phụ huynh: hỏi – đáp bằng tiếng Anh trong bữa ăn, đọc truyện tranh song ngữ…" },
    ];
    const leads = [
      { id: "l1", parent: "Chị Hoa", phone: "0987 111 222", childAge: "7 tuổi", course: "Tiếng Anh thiếu nhi", campus: "cs1", time: "Buổi tối", note: "Con chưa học tiếng Anh bao giờ", createdAt: now() - DAY, status: "moi" },
      { id: "l2", parent: "Anh Tuấn", phone: "0912 333 444", childAge: "Lớp 6", course: "Giao tiếp 4 kỹ năng", campus: "cs2", time: "Cuối tuần", note: "", createdAt: now() - 3 * DAY, status: "da-goi" },
    ];
    return { version: 4, campuses, teachers, classes, students, assignments, submissions, news, leads };
  }

  function fakeAnswer(q, ok, R) {
    const wrongIdx = (n, right) => { let w = Math.floor(R() * n); if (w === right) w = (w + 1) % n; return w; };
    switch (q.type) {
      case "mcq": case "picture": case "listen": return ok ? q.answer : wrongIdx(q.options.length, q.answer);
      case "fill": return ok ? q.answer[0] : "strongs".slice(0, 3 + Math.floor(R() * 3));
      case "order": { const w = q.words.slice(); if (!ok) { const t = w[1]; w[1] = w[2]; w[2] = t; } return w; }
      case "match": { const m = {}; q.pairs.forEach((_, i) => (m[i] = i)); if (!ok) { m[0] = 1; m[1] = 0; } return m; }
      default: return null;
    }
  }

  // ---------- truy cập DB ----------
  let cache = null;
  function load() {
    if (cache) return cache;
    try { const raw = localStorage.getItem(KEY); if (raw) cache = JSON.parse(raw); } catch (e) { /* bỏ qua */ }
    if (!cache || cache.version !== 4) { cache = seed(); save(); }
    return cache;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); return true; }
    catch (e) { console.warn("Không lưu được (bộ nhớ trình duyệt đầy?)", e); return false; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } cache = null; return load(); }

  function getSession() { try { return JSON.parse(localStorage.getItem(SESSION) || "null"); } catch (e) { return null; } }
  function setSession(s) { try { if (s) localStorage.setItem(SESSION, JSON.stringify(s)); else localStorage.removeItem(SESSION); } catch (e) { } }

  window.GS = {
    load, save, reset, uid, DAY, now, norm, TYPE_INFO, SKILLS,
    gradeQuestion, scoreSubmission, getSession, setSession,
    byId: (list, id) => (load()[list] || []).find((x) => x.id === id),
  };
})();
