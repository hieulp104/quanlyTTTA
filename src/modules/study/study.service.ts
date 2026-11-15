import { prisma } from "@/shared/prisma/prisma.service";
import { presignedDownloadUrl } from "@/lib/minio";
import { MANUAL_TYPES, SKILL_ORDER } from "@/common/enums";
import { computeScore, gradeAuto } from "@/modules/study/study.scoring";
import type { SubmitAttemptInput } from "@/modules/study/study.schema";
import type { Prisma } from "@/generated/prisma/client";
import type { QuestionType, Skill } from "@/generated/prisma/enums";

// ═══════════════════ DANH SÁCH BÀI CỦA MỘT BÉ ═══════════════════

export type StudentAssignmentState = "todo" | "overdue" | "pending" | "done";

/** Mọi bài giao cho lớp của bé, kèm lần làm cuối + số lần đã làm. */
export async function studentAssignments(studentId: string) {
  const st = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { classId: true } });
  const asgs = await prisma.assignment.findMany({
    where: { deletedAt: null, createdAt: { lte: new Date() }, classes: { some: { classId: st.classId } } },
    orderBy: { dueAt: "desc" },
    include: {
      questions: { select: { type: true } },
      submissions: { where: { studentId }, orderBy: { attempt: "desc" }, select: { id: true, attempt: true, score: true, pendingCount: true, teacherComment: true, submittedAt: true } },
    },
  });
  const now = Date.now();
  return asgs.map((a) => {
    const last = a.submissions[0] ?? null;
    const state: StudentAssignmentState = !last ? (a.dueAt.getTime() < now ? "overdue" : "todo") : last.pendingCount > 0 ? "pending" : "done";
    return {
      id: a.id,
      title: a.title,
      dueAt: a.dueAt,
      timeLimitMin: a.timeLimitMin,
      maxAttempts: a.maxAttempts,
      questionCount: a.questions.length,
      questionTypes: [...new Set(a.questions.map((q) => q.type))],
      attempts: a.submissions.length,
      canRetry: !a.maxAttempts || a.submissions.length < a.maxAttempts,
      state,
      last: last ? { id: last.id, score: last.score === null ? null : Number(last.score), pendingCount: last.pendingCount, teacherComment: last.teacherComment, submittedAt: last.submittedAt } : null,
    };
  });
}

/** Tỉ lệ đúng theo kỹ năng, gộp lần làm cuối của mọi bài. */
export async function studentSkills(studentId: string): Promise<{ skill: Skill; pct: number }[]> {
  const subs = await prisma.submission.findMany({
    where: { studentId, assignment: { deletedAt: null } },
    orderBy: { attempt: "asc" },
    include: { answers: { include: { question: { select: { type: true, skill: true } } } } },
  });
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) latest.set(s.assignmentId, s);
  const agg: Partial<Record<Skill, { got: number; total: number }>> = {};
  for (const s of latest.values()) {
    const r = computeScore(s.answers.map((a) => ({ type: a.question.type, skill: a.question.skill, autoFraction: a.autoFraction, manualScore: a.manualScore })));
    for (const [k, v] of Object.entries(r.perSkill)) {
      const t = (agg[k as Skill] ??= { got: 0, total: 0 });
      t.got += v!.got;
      t.total += v!.total;
    }
  }
  return SKILL_ORDER.filter((k) => agg[k]?.total).map((k) => ({ skill: k, pct: Math.round((agg[k]!.got / agg[k]!.total) * 100) }));
}

// ═══════════════════ TRÌNH LÀM BÀI ═══════════════════

/** Trộn cố định theo chuỗi seed — bé mở lại bài vẫn thấy cùng thứ tự. */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.length > 1 && a.every((x, i) => x === arr[i])) a.push(a.shift()!);
  return a;
}

export type PlayerQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  image?: string;
  imageUrl?: string | null;
  audioText?: string;
  audioUrl?: string | null;
  /** ORDER: các từ đã xáo, kèm chỉ số gốc. */
  words?: { i: number; w: string }[];
  /** MATCH: cột trái theo thứ tự, cột phải đã xáo (chỉ số cặp). */
  left?: string[];
  right?: { i: number; w: string }[];
  /** SPEAK: câu cần đọc. */
  text?: string;
};

/**
 * Bản câu hỏi gửi xuống trình duyệt học viên — ĐÃ BỎ ĐÁP ÁN.
 * (Riêng bài nghe vẫn phải gửi nội dung để trình duyệt đọc bằng giọng máy.)
 */
async function toPlayerQuestion(q: { id: string; type: QuestionType; prompt: string; data: Prisma.JsonValue }, seed: string): Promise<PlayerQuestion> {
  const d = (q.data ?? {}) as Record<string, unknown>;
  const base: PlayerQuestion = { id: q.id, type: q.type, prompt: q.prompt };
  const sign = async (k: unknown) => (typeof k === "string" && k ? presignedDownloadUrl(k).catch(() => null) : null);
  switch (q.type) {
    case "MCQ":
      return { ...base, options: d.options as string[] };
    case "PICTURE":
      return { ...base, options: d.options as string[], image: (d.image as string) ?? "", imageUrl: await sign(d.imageKey) };
    case "LISTEN":
      return { ...base, options: d.options as string[], audioText: d.audioText as string, audioUrl: await sign(d.audioKey) };
    case "ORDER": {
      const words = (d.words as string[]).map((w, i) => ({ i, w }));
      return { ...base, words: seededShuffle(words, seed + q.id) };
    }
    case "MATCH": {
      const pairs = d.pairs as [string, string][];
      return { ...base, left: pairs.map((p) => p[0]), right: seededShuffle(pairs.map((p, i) => ({ i, w: p[1] })), seed + q.id) };
    }
    case "SPEAK":
      return { ...base, text: d.text as string };
    default:
      return base;
  }
}

export async function getPlayerAssignment(studentId: string, assignmentId: string) {
  const st = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { classId: true } });
  const a = await prisma.assignment.findFirst({
    where: { id: assignmentId, deletedAt: null, createdAt: { lte: new Date() }, classes: { some: { classId: st.classId } } },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!a) return null;
  const attempts = await prisma.submission.count({ where: { assignmentId, studentId } });
  const lastSub = await prisma.submission.findFirst({ where: { assignmentId, studentId }, orderBy: { attempt: "desc" }, select: { id: true } });
  return {
    id: a.id,
    title: a.title,
    note: a.note,
    dueAt: a.dueAt,
    timeLimitMin: a.timeLimitMin,
    maxAttempts: a.maxAttempts,
    attempts,
    lastSubmissionId: lastSub?.id ?? null,
    questions: await Promise.all(a.questions.map((q) => toPlayerQuestion(q, a.id))),
  };
}

/** Chấm và lưu một lần làm bài. Trả id bài nộp để chuyển sang trang kết quả. */
export async function submitAttempt(studentId: string, input: SubmitAttemptInput) {
  return prisma.$transaction(async (tx) => {
    const questions = await tx.question.findMany({ where: { assignmentId: input.assignmentId }, orderBy: { position: "asc" } });
    const attempt = (await tx.submission.count({ where: { assignmentId: input.assignmentId, studentId } })) + 1;

    const answers = questions.map((q) => {
      const value = input.answers[q.id];
      const fileKey = input.files[q.id] ?? null;
      const manual = MANUAL_TYPES.includes(q.type);
      return {
        questionId: q.id,
        value: (value ?? null) as Prisma.InputJsonValue,
        fileKey,
        autoFraction: manual ? null : gradeAuto(q.type, q.data as Record<string, unknown>, value),
        type: q.type,
        skill: q.skill,
        // Câu nói/viết bỏ trống → 0 điểm luôn, không bắt cô chấm.
        manualScore: manual && !fileKey && !(typeof value === "object" && value && "text" in value && String((value as { text: unknown }).text).trim()) ? 0 : null,
      };
    });
    const r = computeScore(answers);
    const now = new Date();
    const startedAt = new Date(Math.min(input.startedAt, now.getTime()));

    return tx.submission.create({
      data: {
        assignmentId: input.assignmentId,
        studentId,
        attempt,
        startedAt,
        submittedAt: now,
        durationSec: Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 1000)),
        autoSubmitted: input.autoSubmitted,
        score: r.score,
        pendingCount: r.pendingCount,
        answers: {
          create: answers.map((a) => ({
            questionId: a.questionId,
            value: a.value ?? undefined,
            fileKey: a.fileKey,
            autoFraction: a.autoFraction,
            manualScore: a.manualScore,
          })),
        },
      },
      select: { id: true },
    });
  });
}

// ═══════════════════ CHI TIẾT MỘT BÀI NỘP ═══════════════════

/** Bài nộp kèm câu hỏi, đáp án đúng và URL file — dùng cho trang kết quả và trang chấm. */
export async function getSubmissionDetail(submissionId: string) {
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: { include: { classGroup: { select: { id: true, name: true, teacherId: true, campusId: true } } } },
      assignment: { include: { questions: { orderBy: { position: "asc" } } } },
      answers: true,
      gradedBy: { select: { fullName: true } },
    },
  });
  if (!sub || sub.assignment.deletedAt) return null;
  const attempts = await prisma.submission.count({ where: { assignmentId: sub.assignmentId, studentId: sub.studentId } });

  const items = await Promise.all(
    sub.assignment.questions.map(async (q) => {
      const ans = sub.answers.find((a) => a.questionId === q.id) ?? null;
      const d = q.data as Record<string, unknown>;
      return {
        id: q.id,
        type: q.type,
        skill: q.skill,
        prompt: q.prompt,
        data: d,
        imageUrl: typeof d.imageKey === "string" && d.imageKey ? await presignedDownloadUrl(d.imageKey).catch(() => null) : null,
        answerId: ans?.id ?? null,
        value: ans?.value ?? null,
        fileUrl: ans?.fileKey ? await presignedDownloadUrl(ans.fileKey).catch(() => null) : null,
        autoFraction: ans?.autoFraction ?? null,
        manualScore: ans?.manualScore ?? null,
        comment: ans?.comment ?? null,
      };
    }),
  );

  return {
    id: sub.id,
    attempt: sub.attempt,
    attempts,
    startedAt: sub.startedAt,
    submittedAt: sub.submittedAt,
    durationSec: sub.durationSec,
    autoSubmitted: sub.autoSubmitted,
    score: sub.score === null ? null : Number(sub.score),
    pendingCount: sub.pendingCount,
    teacherComment: sub.teacherComment,
    gradedBy: sub.gradedBy?.fullName ?? null,
    student: { id: sub.student.id, fullName: sub.student.fullName, userId: sub.student.userId, parentUserId: sub.student.parentUserId, className: sub.student.classGroup.name },
    classTeacherId: sub.student.classGroup.teacherId,
    campusId: sub.student.classGroup.campusId,
    assignment: { id: sub.assignment.id, title: sub.assignment.title, maxAttempts: sub.assignment.maxAttempts, dueAt: sub.assignment.dueAt },
    items,
  };
}

export type SubmissionDetail = NonNullable<Awaited<ReturnType<typeof getSubmissionDetail>>>;
