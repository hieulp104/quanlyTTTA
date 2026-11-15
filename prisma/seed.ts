/**
 * Seed dữ liệu khởi tạo cho GoSpeak English.
 * Chạy: npm run db:seed   (hoặc npm run db:reset để xóa sạch rồi seed lại)
 *
 * Idempotent: quyền/vai trò/cơ sở/tài khoản dùng upsert. Dữ liệu học tập mẫu
 * (lớp, học viên, bài tập, bài nộp) chỉ tạo khi DB chưa có học viên nào.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { QuestionType, Skill } from "../src/generated/prisma/enums";
import {
  DEFAULT_ROLE_GRANTS,
  PERMISSIONS,
  ROLE_CODES,
  ROLE_LABEL,
} from "../src/common/permissions/permissions";
import { DEFAULT_SKILL, MANUAL_TYPES } from "../src/common/enums";
import { computeScore, gradeAuto } from "../src/modules/study/study.scoring";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const PASSWORD = process.env.SEED_DEFAULT_PASSWORD ?? "123456";
const DAY = 86_400_000;
const now = Date.now();

/** PRNG cố định để dữ liệu mẫu lần nào cũng giống nhau. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261112);
const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];

async function seedRbac() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: p.code }, update: { name: p.name, module: p.module }, create: { ...p } });
  }
  const perms = await prisma.permission.findMany();
  for (const code of ROLE_CODES) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: ROLE_LABEL[code] },
      create: { code, name: ROLE_LABEL[code], isSystem: true },
    });
    for (const [permCode, scope] of Object.entries(DEFAULT_ROLE_GRANTS[code])) {
      const perm = perms.find((p) => p.code === permCode)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: { scope: scope! },
        create: { roleId: role.id, permissionId: perm.id, scope: scope! },
      });
    }
  }
}

async function staff(username: string, fullName: string, roleCode: string, campusId: string | null, hash: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
  return prisma.user.upsert({
    where: { username },
    update: { fullName, campusId },
    create: { username, fullName, passwordHash: hash, userType: "STAFF", campusId, roles: { create: { roleId: role.id } } },
  });
}

type Q = { type: QuestionType; prompt: string; data: Record<string, unknown>; skill?: Skill };

const ASSIGNMENTS: { key: string; title: string; classes: string[]; created: number; due: number; time: number; attempts: number; note: string; source?: "FILE"; sourceFile?: string; questions: Q[] }[] = [
  {
    key: "a1", title: "Unit 3 – Animals", classes: ["STA-1A", "MOV-2B"], created: -9, due: -2, time: 20, attempts: 2,
    note: "Các con nhớ nghe kỹ trước khi chọn nhé!",
    questions: [
      { type: "PICTURE", prompt: "Đây là con gì?", data: { image: "🐘", options: ["elephant", "monkey", "tiger", "rabbit"], answer: 0 } },
      { type: "MATCH", prompt: "Nối mỗi hình với từ đúng", data: { pairs: [["🐶", "dog"], ["🐱", "cat"], ["🐟", "fish"], ["🐦", "bird"]] } },
      { type: "MCQ", prompt: "A giraffe ___ a long neck.", data: { options: ["have", "has", "having", "is"], answer: 1 } },
      { type: "LISTEN", prompt: "Nghe và chọn con vật bạn Tom thích nhất", data: { audioText: "Hello! My name is Tom. I like monkeys. They are funny.", options: ["Cats", "Monkeys", "Lions", "Birds"], answer: 1 } },
      { type: "FILL", prompt: "The lion is big and ___. (mạnh mẽ)", data: { answers: ["strong"] } },
      { type: "ORDER", prompt: "Sắp xếp các từ thành câu đúng", data: { words: ["I", "can", "see", "three", "ducks"] } },
      { type: "SPEAK", prompt: "Con đọc to câu sau rồi bấm gửi cho cô nhé", data: { text: "I like elephants because they are big and kind." } },
    ],
  },
  {
    key: "a2", title: "Unit 4 – My family", classes: ["STA-1A"], created: -2, due: 3, time: 0, attempts: 3,
    note: "Bài viết: con chụp ảnh vở gửi cô hoặc gõ trực tiếp đều được.",
    questions: [
      { type: "MCQ", prompt: "My mother's mother is my ___.", data: { options: ["aunt", "sister", "grandmother", "cousin"], answer: 2 }, skill: "VOCABULARY" },
      { type: "FILL", prompt: "This ___ my brother. His name is Nam.", data: { answers: ["is"] }, skill: "GRAMMAR" },
      { type: "PICTURE", prompt: "Chọn từ đúng với hình", data: { image: "👶", options: ["baby", "father", "uncle", "teacher"], answer: 0 } },
      { type: "LISTEN", prompt: "Nghe và cho biết bạn Lily có mấy anh chị em?", data: { audioText: "I am Lily. I have one brother and two sisters.", options: ["One", "Two", "Three", "Four"], answer: 2 } },
      { type: "MCQ", prompt: "Đọc: “Ben is nine. He has a little sister. She is four.” – How old is Ben's sister?", data: { options: ["Nine", "Four", "Five", "Two"], answer: 1 }, skill: "READING" },
      { type: "ORDER", prompt: "Sắp xếp các từ thành câu đúng", data: { words: ["My", "father", "is", "a", "doctor"] } },
      { type: "WRITE", prompt: "Viết 3–5 câu giới thiệu về gia đình con (có mấy người, mỗi người làm gì).", data: { minWords: 15 } },
    ],
  },
  {
    key: "a3", title: "Daily routines – Listening & Speaking", classes: ["FLY-3A", "TEEN-4A"], created: -6, due: -1, time: 25, attempts: 1, note: "",
    questions: [
      { type: "LISTEN", prompt: "What time does Anna get up?", data: { audioText: "Every day, Anna gets up at six thirty. She has breakfast at seven.", options: ["6:00", "6:30", "7:00", "7:30"], answer: 1 } },
      { type: "LISTEN", prompt: "How does Peter go to school?", data: { audioText: "Peter lives near his school, so he walks to school every morning.", options: ["By bus", "By bike", "On foot", "By car"], answer: 2 } },
      { type: "MCQ", prompt: "She usually ___ her homework after dinner.", data: { options: ["do", "does", "doing", "did"], answer: 1 } },
      { type: "FILL", prompt: "I brush my ___ twice a day.", data: { answers: ["teeth"] } },
      { type: "ORDER", prompt: "Sắp xếp thành câu đúng", data: { words: ["We", "never", "watch", "TV", "in", "the", "morning"] } },
      { type: "SPEAK", prompt: "Nói 3–4 câu về một ngày của con", data: { text: "Gợi ý: I get up at… / I go to school by… / After school, I…" } },
      { type: "WRITE", prompt: "Viết đoạn văn ngắn (40–60 từ) về ngày cuối tuần của con.", data: { minWords: 40 } },
    ],
  },
  {
    key: "a4", title: "Ôn tập giữa kỳ – Food & Drinks", classes: ["STA-1A", "MOV-2B"], created: -1, due: 6, time: 15, attempts: 1,
    note: "Bài do trung tâm gửi file PDF, học vụ đã nhập lên web.", source: "FILE", sourceFile: "On_tap_giua_ky_Food.pdf",
    questions: [
      { type: "PICTURE", prompt: "Đây là gì?", data: { image: "🍌", options: ["apple", "banana", "orange", "grape"], answer: 1 } },
      { type: "MATCH", prompt: "Nối hình với từ", data: { pairs: [["🥛", "milk"], ["🍞", "bread"], ["🍚", "rice"], ["🥕", "carrot"]] } },
      { type: "MCQ", prompt: "Would you like ___ apple?", data: { options: ["a", "an", "some", "any"], answer: 1 } },
      { type: "LISTEN", prompt: "Mai muốn ăn gì?", data: { audioText: "Mum, I'm hungry. Can I have some noodles, please?", options: ["Rice", "Bread", "Noodles", "Cake"], answer: 2 } },
      { type: "FILL", prompt: "I'm thirsty. I want a glass of ___. (nước)", data: { answers: ["water"] } },
      { type: "ORDER", prompt: "Sắp xếp thành câu đúng", data: { words: ["Do", "you", "like", "chicken"] } },
    ],
  },
];

function fakeAnswer(q: { type: QuestionType; data: Record<string, unknown> }, right: boolean): unknown {
  const d = q.data;
  const wrongIdx = (n: number, r: number) => { let w = Math.floor(R() * n); if (w === r) w = (w + 1) % n; return w; };
  switch (q.type) {
    case "MCQ": case "PICTURE": case "LISTEN": return right ? d.answer : wrongIdx((d.options as string[]).length, d.answer as number);
    case "FILL": return right ? (d.answers as string[])[0] : "stron";
    case "ORDER": { const w = (d.words as string[]).slice(); if (!right) [w[1], w[2]] = [w[2], w[1]]; return w; }
    case "MATCH": { const m: Record<number, number> = {}; (d.pairs as unknown[]).forEach((_, i) => (m[i] = i)); if (!right) { m[0] = 1; m[1] = 0; } return m; }
    case "WRITE": return { text: pick(["There are four people in my family. My father is a driver. My mother is a teacher. I have a little brother.", "My family has five people. My dad works in a bank. My mom is a nurse. My sister and I are students.", "On Sunday I get up at 8 o'clock. I play football with my friends. In the afternoon I visit my grandparents."]) };
    default: return null;
  }
}

const COMMENTS = ["Con làm tốt lắm, cố gắng phát huy nhé!", "Phát âm rõ hơn rồi, chú ý âm cuối /s/ nhé.", "Con cần nghe lại bài 2 lần trước khi chọn.", "Câu viết đúng ngữ pháp, thêm từ nối and/but nhé.", "Bài làm cẩn thận, cô khen!"];

async function seedLearning(hash: string) {
  if (await prisma.student.count()) {
    console.log("• Đã có học viên — bỏ qua dữ liệu học tập mẫu.");
    return;
  }
  const cs1 = await prisma.campus.findUniqueOrThrow({ where: { code: "CS1" } });
  const cs2 = await prisma.campus.findUniqueOrThrow({ where: { code: "CS2" } });
  const t1 = await prisma.user.findUniqueOrThrow({ where: { username: "cogiao" } });
  const t2 = await prisma.user.findUniqueOrThrow({ where: { username: "thayduc" } });
  const t3 = await prisma.user.findUniqueOrThrow({ where: { username: "cothuha" } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });

  const classDefs = [
    { code: "STA-1A", name: "Starters 1A", level: "Thiếu nhi 6–8 tuổi", campusId: cs1.id, teacherId: t1.id, schedule: "T3 – T5, 17:30" },
    { code: "MOV-2B", name: "Movers 2B", level: "Thiếu nhi 8–10 tuổi", campusId: cs1.id, teacherId: t2.id, schedule: "T2 – T4, 18:00" },
    { code: "FLY-3A", name: "Flyers 3A", level: "Thiếu nhi 10–12 tuổi", campusId: cs2.id, teacherId: t1.id, schedule: "T7 – CN, 9:00" },
    { code: "TEEN-4A", name: "Giao tiếp Teen 4A", level: "Giao tiếp 12–15 tuổi", campusId: cs2.id, teacherId: t3.id, schedule: "T3 – T6, 19:00" },
  ];
  const classes = [];
  for (const c of classDefs) classes.push(await prisma.classGroup.create({ data: c }));

  const studentRole = await prisma.role.findUniqueOrThrow({ where: { code: "STUDENT" } });
  const parentRole = await prisma.role.findUniqueOrThrow({ where: { code: "PARENT" } });
  const ho = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi", "Đỗ", "Ngô"];
  const ten = ["Minh Anh", "Bảo Ngọc", "Gia Huy", "Khánh Linh", "Đức Minh", "Hà My", "Tuấn Kiệt", "Phương Thảo", "Quốc Bảo", "Ngọc Hân", "Anh Thư", "Hoàng Nam", "Tú Anh", "Đăng Khoa", "Diệp Chi", "Thành An", "Bảo Châu", "Minh Khôi", "Thùy Dương", "Nhật Minh", "Mai Chi", "Trung Hiếu", "Yến Nhi", "Gia Bảo", "Thảo Vy", "Hải Đăng", "Như Ý", "Duy Khang", "Khánh An", "Lâm Phong", "Thanh Trúc", "Hữu Phúc"];

  const students = [];
  let n = 0;
  for (const c of classes) {
    for (let i = 0; i < 8; i++) {
      const fullName = `${n === 0 ? "Nguyễn" : pick(ho)} ${ten[n]}`;
      n++;
      const code = `hv${String(n).padStart(3, "0")}`;
      const phone = n === 1 ? "0912345678" : `09${String(10_000_000 + Math.floor(R() * 89_999_999))}`;
      const kid = await prisma.user.create({ data: { username: code, fullName, passwordHash: hash, userType: "STUDENT", roles: { create: { roleId: studentRole.id } } } });
      const parentName = `Phụ huynh bé ${fullName.split(" ").slice(-2).join(" ")}`;
      const parent = await prisma.user.create({ data: { username: phone, phone, fullName: parentName, passwordHash: hash, userType: "PARENT", roles: { create: { roleId: parentRole.id } } } });
      students.push(await prisma.student.create({ data: { code, fullName, classId: c.id, userId: kid.id, parentUserId: parent.id, parentName, parentPhone: phone } }));
    }
  }

  const classByCode = Object.fromEntries(classes.map((c) => [c.code, c]));
  for (const def of ASSIGNMENTS) {
    const a = await prisma.assignment.create({
      data: {
        title: def.title, note: def.note || null, source: def.source ?? "WEB", sourceFile: def.sourceFile ?? null,
        dueAt: new Date(now + def.due * DAY), timeLimitMin: def.time, maxAttempts: def.attempts,
        createdAt: new Date(now + def.created * DAY), createdById: def.source ? admin.id : t1.id,
        classes: { create: def.classes.map((code) => ({ classId: classByCode[code].id })) },
        questions: {
          create: def.questions.map((q, i) => ({ position: i, type: q.type, skill: q.skill ?? DEFAULT_SKILL[q.type], prompt: q.prompt, data: q.data as Prisma.InputJsonValue })),
        },
      },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (def.key === "a4") continue; // bài mới giao, chưa ai làm

    for (const [si, st] of students.entries()) {
      if (!def.classes.some((code) => classByCode[code].id === st.classId)) continue;
      if (si === 0 && def.key === "a2") continue; // bé demo hv001 chưa làm bài Unit 4
      if (R() > (def.due < 0 ? 0.85 : 0.5)) continue;
      const ability = 0.55 + R() * 0.4;
      const weak = pick<Skill>(["LISTENING", "GRAMMAR", "VOCABULARY", "SPEAKING", "WRITING"]);
      const submittedAt = new Date(Math.min(now - DAY / 4, a.createdAt.getTime() + DAY * (0.5 + R() * 3)));
      const durationSec = 300 + Math.floor(R() * 700);

      const answers = a.questions.map((q) => {
        const p = q.skill === weak ? ability - 0.35 : ability;
        const right = R() < p;
        const value = fakeAnswer({ type: q.type, data: q.data as Record<string, unknown> }, right);
        const manual = MANUAL_TYPES.includes(q.type);
        const graded = manual && !(def.key === "a2" && R() < 0.6) && !(def.key === "a3" && R() < 0.3);
        return {
          questionId: q.id, type: q.type, skill: q.skill,
          value: (q.type === "SPEAK" ? { duration: 8 + Math.floor(R() * 10), sample: true } : value) as Prisma.InputJsonValue,
          autoFraction: gradeAuto(q.type, q.data as Record<string, unknown>, value),
          manualScore: graded ? Math.max(4, Math.min(10, Math.round((p + R() * 0.3) * 10))) : null,
          comment: graded ? pick(COMMENTS) : null,
        };
      });
      const r = computeScore(answers);
      await prisma.submission.create({
        data: {
          assignmentId: a.id, studentId: st.id, attempt: 1,
          startedAt: new Date(submittedAt.getTime() - durationSec * 1000), submittedAt, durationSec,
          score: r.score, pendingCount: r.pendingCount,
          teacherComment: R() < 0.5 && r.pendingCount === 0 ? pick(COMMENTS) : null,
          gradedById: r.pendingCount === 0 ? t1.id : null,
          answers: { create: answers.map(({ questionId, value, autoFraction, manualScore, comment }) => ({ questionId, value, autoFraction, manualScore, comment })) },
        },
      });
    }
  }

  await prisma.post.createMany({
    data: [
      { kind: "OPENING", title: "Khai giảng lớp Starters (6–8 tuổi)", body: "Tặng 2 buổi học thử miễn phí, kiểm tra đầu vào cùng giáo viên.", eventDate: new Date(now + 10 * DAY), campusId: cs1.id, createdById: admin.id },
      { kind: "OPENING", title: "Khai giảng lớp Giao tiếp Teen", body: "Lớp nhỏ tối đa 12 bạn, luyện nói mỗi buổi.", eventDate: new Date(now + 17 * DAY), campusId: cs2.id, createdById: admin.id },
      { kind: "EVENT", title: "Halloween Party – các bé hóa trang và thuyết trình bằng tiếng Anh", body: "Hơn 80 bé tham gia hóa trang, kể chuyện và chơi trò chơi tiếng Anh.", eventDate: new Date(now - 14 * DAY), campusId: cs1.id, createdById: admin.id },
      { kind: "NEWS", title: "5 cách giúp con luyện nói tiếng Anh tại nhà mỗi ngày 10 phút", body: "Gợi ý cho phụ huynh: hỏi – đáp bằng tiếng Anh trong bữa ăn, đọc truyện tranh song ngữ…", eventDate: new Date(now - 20 * DAY), createdById: admin.id },
    ],
  });
  await prisma.lead.createMany({
    data: [
      { parentName: "Chị Hoa", phone: "0987111222", childAge: "7 tuổi", course: "Kids Starters (6–8 tuổi)", campusId: cs1.id, callTime: "Buổi tối", note: "Con chưa học tiếng Anh bao giờ", createdAt: new Date(now - DAY) },
      { parentName: "Anh Tuấn", phone: "0912333444", childAge: "Lớp 6", course: "Giao tiếp 4 kỹ năng", campusId: cs2.id, callTime: "Cuối tuần", status: "CALLED", createdAt: new Date(now - 3 * DAY) },
    ],
  });
  console.log(`• Tạo ${classes.length} lớp, ${students.length} học viên, ${ASSIGNMENTS.length} bài tập.`);
}

async function main() {
  await seedRbac();
  const hash = await bcrypt.hash(PASSWORD, 10);

  const cs1 = await prisma.campus.upsert({
    where: { code: "CS1" }, update: {},
    create: { code: "CS1", name: "Cơ sở 1", address: "Địa chỉ cơ sở 1 (sẽ cập nhật), Hà Nội", phone: "0900 000 001", hours: "8:00 – 20:30, Thứ 2 – Chủ nhật" },
  });
  const cs2 = await prisma.campus.upsert({
    where: { code: "CS2" }, update: {},
    create: { code: "CS2", name: "Cơ sở 2", address: "Địa chỉ cơ sở 2 (sẽ cập nhật), Hà Nội", phone: "0900 000 002", hours: "8:00 – 20:30, Thứ 2 – Chủ nhật" },
  });

  await staff("admin", "Quản lý trung tâm", "ADMIN", null, hash);
  await staff("hocvu", "Học vụ Thu Trang", "ACADEMIC", cs1.id, hash);
  await staff("cogiao", "Cô Lan Anh", "TEACHER", cs1.id, hash);
  await staff("thayduc", "Thầy Minh Đức", "TEACHER", cs1.id, hash);
  await staff("cothuha", "Cô Thu Hà", "TEACHER", cs2.id, hash);

  await seedLearning(hash);
  console.log(`✔ Seed xong. Mật khẩu mọi tài khoản mẫu: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
