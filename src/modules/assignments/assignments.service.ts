import { prisma } from "@/shared/prisma/prisma.service";
import { writeAuditLog } from "@/shared/audit/audit.service";
import { presignedDownloadUrl } from "@/lib/minio";
import type { SessionUser } from "@/common/permissions/permissions";
import { classScopeWhere, visibleClassIds } from "@/modules/classes/classes.service";
import { computeScore, gradeAuto } from "@/modules/study/study.scoring";
import type { AssignmentInput } from "@/modules/assignments/assignments.schema";
import type { Prisma } from "@/generated/prisma/client";
import type { Skill } from "@/generated/prisma/enums";

// ═══════════════════ DANH SÁCH ═══════════════════

/** Bài user được xem: giao cho lớp user thấy, hoặc do chính user soạn. */
export function assignmentScopeWhere(user: SessionUser): Prisma.AssignmentWhereInput | null {
  const classWhere = classScopeWhere(user, "assignment.view");
  if (!classWhere) return null;
  return {
    deletedAt: null,
    OR: [{ classes: { some: { classGroup: classWhere } } }, { createdById: user.id }],
  };
}

export type AssignmentRow = Awaited<ReturnType<typeof listAssignments>>[number];

export async function listAssignments(user: SessionUser, opts: { campusId?: string } = {}) {
  const where = assignmentScopeWhere(user);
  if (!where) return [];
  const myClassIds = await visibleClassIds(user, "assignment.view");

  const rows = await prisma.assignment.findMany({
    where: opts.campusId
      ? { AND: [where, { classes: { some: { classGroup: { campusId: opts.campusId } } } }] }
      : where,
    orderBy: { createdAt: "desc" },
    include: {
      classes: { include: { classGroup: { select: { id: true, name: true, campus: { select: { name: true } } } } } },
      questions: { select: { type: true }, orderBy: { position: "asc" } },
    },
  });

  // Số bé được giao / đã nộp / chờ chấm — chỉ tính trong các lớp user thấy.
  const ids = rows.map((r) => r.id);
  const [students, subs] = await Promise.all([
    prisma.student.findMany({ where: { deletedAt: null, classId: { in: myClassIds } }, select: { id: true, classId: true } }),
    prisma.submission.findMany({
      where: { assignmentId: { in: ids }, student: { classId: { in: myClassIds }, deletedAt: null } },
      select: { assignmentId: true, studentId: true, attempt: true, score: true, pendingCount: true },
      orderBy: { attempt: "asc" },
    }),
  ]);
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) latest.set(`${s.assignmentId}|${s.studentId}`, s);

  return rows.map((a) => {
    const cids = a.classes.map((c) => c.classId).filter((c) => myClassIds.includes(c));
    const sts = students.filter((s) => cids.includes(s.classId));
    let done = 0, pending = 0, sum = 0, n = 0;
    for (const st of sts) {
      const s = latest.get(`${a.id}|${st.id}`);
      if (!s) continue;
      done++;
      if (s.pendingCount > 0) pending++;
      if (s.score !== null) { sum += Number(s.score); n++; }
    }
    return {
      id: a.id,
      title: a.title,
      source: a.source,
      dueAt: a.dueAt,
      createdAt: a.createdAt,
      timeLimitMin: a.timeLimitMin,
      maxAttempts: a.maxAttempts,
      classes: a.classes.map((c) => ({ id: c.classGroup.id, name: c.classGroup.name, campus: c.classGroup.campus.name })),
      questionTypes: [...new Set(a.questions.map((q) => q.type))],
      questionCount: a.questions.length,
      total: sts.length,
      done,
      pending,
      avg: n ? Math.round((sum / n) * 10) / 10 : null,
    };
  });
}

// ═══════════════════ SOẠN / SỬA ═══════════════════

/** Đủ dữ liệu để mở trình soạn bài (kèm URL ảnh/âm thanh đã ký). */
export async function getAssignmentForEdit(id: string) {
  const a = await prisma.assignment.findFirst({
    where: { id, deletedAt: null },
    include: {
      classes: { include: { classGroup: { select: { teacherId: true, campusId: true } } } },
      questions: { orderBy: { position: "asc" } },
      _count: { select: { submissions: true } },
    },
  });
  if (!a) return null;
  const questions = await Promise.all(
    a.questions.map(async (q) => {
      const data = q.data as Record<string, unknown>;
      const mediaUrl =
        typeof data.imageKey === "string" && data.imageKey
          ? await presignedDownloadUrl(data.imageKey).catch(() => null)
          : typeof data.audioKey === "string" && data.audioKey
            ? await presignedDownloadUrl(data.audioKey).catch(() => null)
            : null;
      return { id: q.id, type: q.type, skill: q.skill, prompt: q.prompt, data, mediaUrl };
    }),
  );
  return {
    id: a.id,
    title: a.title,
    note: a.note ?? "",
    dueAt: a.dueAt,
    timeLimitMin: a.timeLimitMin,
    maxAttempts: a.maxAttempts,
    source: a.source,
    classIds: a.classes.map((c) => c.classId),
    teacherIds: a.classes.map((c) => c.classGroup.teacherId),
    createdById: a.createdById,
    submissionCount: a._count.submissions,
    questions,
  };
}

/** Thông tin tối thiểu để kiểm quyền trên một bài (giáo viên các lớp + người soạn). */
export async function assignmentAccess(id: string) {
  const a = await prisma.assignment.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, createdById: true, classes: { select: { classGroup: { select: { teacherId: true, campusId: true } } } } },
  });
  if (!a) return null;
  return {
    teacherIds: [a.createdById, ...a.classes.map((c) => c.classGroup.teacherId)],
    campusIds: a.classes.map((c) => c.classGroup.campusId),
  };
}

export async function createAssignment(actorId: string, input: AssignmentInput) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.assignment.create({
      data: {
        title: input.title,
        note: input.note || null,
        dueAt: input.dueAt,
        timeLimitMin: input.timeLimitMin,
        maxAttempts: input.maxAttempts,
        source: input.importRequestId ? "FILE" : "WEB",
        createdById: actorId,
        classes: { create: input.classIds.map((classId) => ({ classId })) },
        questions: {
          create: input.questions.map((q, i) => ({
            position: i,
            type: q.type,
            skill: q.skill,
            prompt: q.prompt,
            data: q.data as Prisma.InputJsonValue,
          })),
        },
      },
    });
    if (input.importRequestId) {
      const req = await tx.importRequest.update({
        where: { id: input.importRequestId },
        data: { status: "DONE", assignmentId: a.id },
      });
      await tx.assignment.update({ where: { id: a.id }, data: { sourceFile: req.fileNames } });
    }
    await writeAuditLog(tx, { actorId, action: "ASSIGNMENT_CREATE", entity: "Assignment", entityId: a.id, after: { title: a.title, classIds: input.classIds } });
    return a;
  });
}

/**
 * Sửa bài: giữ id câu cũ (để không mất bài làm của các bé), xóa câu bị bỏ,
 * thêm câu mới, rồi CHẤM LẠI mọi bài đã nộp theo đáp án mới.
 */
export async function updateAssignment(actorId: string, id: string, input: AssignmentInput) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.assignment.findUniqueOrThrow({ where: { id }, include: { questions: true } });
    const keepIds = input.questions.map((q) => q.id).filter((x): x is string => Boolean(x));

    await tx.question.deleteMany({ where: { assignmentId: id, id: { notIn: keepIds } } });
    for (const [i, q] of input.questions.entries()) {
      const data = { position: i, type: q.type, skill: q.skill, prompt: q.prompt, data: q.data as Prisma.InputJsonValue };
      if (q.id && before.questions.some((b) => b.id === q.id)) await tx.question.update({ where: { id: q.id }, data });
      else await tx.question.create({ data: { ...data, assignmentId: id } });
    }

    await tx.assignmentClass.deleteMany({ where: { assignmentId: id } });
    await tx.assignmentClass.createMany({ data: input.classIds.map((classId) => ({ assignmentId: id, classId })) });

    const a = await tx.assignment.update({
      where: { id },
      data: { title: input.title, note: input.note || null, dueAt: input.dueAt, timeLimitMin: input.timeLimitMin, maxAttempts: input.maxAttempts },
    });

    await regradeAssignment(tx, id);
    await writeAuditLog(tx, { actorId, action: "ASSIGNMENT_UPDATE", entity: "Assignment", entityId: id, before: { title: before.title }, after: { title: a.title } });
    return a;
  });
}

type Tx = Prisma.TransactionClient;

/** Chấm lại toàn bộ bài nộp của một bài tập (sau khi sửa đáp án). */
export async function regradeAssignment(tx: Tx, assignmentId: string) {
  const questions = await tx.question.findMany({ where: { assignmentId } });
  const subs = await tx.submission.findMany({ where: { assignmentId }, include: { answers: true } });
  for (const sub of subs) {
    const scored = [];
    for (const q of questions) {
      const ans = sub.answers.find((x) => x.questionId === q.id);
      const auto = gradeAuto(q.type, q.data as Record<string, unknown>, ans?.value);
      if (ans && auto !== ans.autoFraction) await tx.answer.update({ where: { id: ans.id }, data: { autoFraction: auto } });
      scored.push({ type: q.type, skill: q.skill, autoFraction: auto, manualScore: ans?.manualScore ?? null });
    }
    const r = computeScore(scored);
    await tx.submission.update({ where: { id: sub.id }, data: { score: r.score, pendingCount: r.pendingCount } });
  }
}

export async function softDeleteAssignment(actorId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const a = await tx.assignment.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAuditLog(tx, { actorId, action: "ASSIGNMENT_DELETE", entity: "Assignment", entityId: id, before: { title: a.title } });
  });
}

// ═══════════════════ KẾT QUẢ MỘT BÀI ═══════════════════

export async function getAssignmentResults(user: SessionUser, id: string, classFilter?: string) {
  const a = await prisma.assignment.findFirst({
    where: { id, deletedAt: null },
    include: {
      questions: { orderBy: { position: "asc" } },
      classes: { include: { classGroup: { include: { campus: { select: { name: true } } } } } },
    },
  });
  if (!a) return null;

  const visible = await visibleClassIds(user, "assignment.view");
  const classes = a.classes.map((c) => c.classGroup).filter((c) => visible.includes(c.id));
  const classIds = classFilter && classes.some((c) => c.id === classFilter) ? [classFilter] : classes.map((c) => c.id);

  const students = await prisma.student.findMany({
    where: { classId: { in: classIds }, deletedAt: null },
    orderBy: { fullName: "asc" },
    include: { classGroup: { select: { name: true } } },
  });
  const subs = await prisma.submission.findMany({
    where: { assignmentId: id, studentId: { in: students.map((s) => s.id) } },
    include: { answers: true },
    orderBy: { attempt: "asc" },
  });
  const latest = new Map<string, (typeof subs)[number]>();
  const attempts = new Map<string, number>();
  for (const s of subs) {
    latest.set(s.studentId, s);
    attempts.set(s.studentId, (attempts.get(s.studentId) ?? 0) + 1);
  }

  const skills = [...new Set(a.questions.map((q) => q.skill))] as Skill[];
  const qStats = a.questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, got: 0, n: 0 }));

  const rows = students.map((st) => {
    const sub = latest.get(st.id) ?? null;
    let perSkill: Partial<Record<Skill, number>> = {};
    if (sub) {
      const scored = a.questions.map((q, i) => {
        const ans = sub.answers.find((x) => x.questionId === q.id);
        const s = { type: q.type, skill: q.skill, autoFraction: ans?.autoFraction ?? (q.type === "SPEAK" || q.type === "WRITE" ? null : 0), manualScore: ans?.manualScore ?? null };
        const frac = q.type === "SPEAK" || q.type === "WRITE" ? (s.manualScore === null ? null : s.manualScore / 10) : s.autoFraction ?? 0;
        if (frac !== null) { qStats[i].got += frac; qStats[i].n++; }
        return s;
      });
      const r = computeScore(scored);
      perSkill = Object.fromEntries(Object.entries(r.perSkill).map(([k, v]) => [k, Math.round((v!.got / v!.total) * 100)]));
    }
    return {
      student: { id: st.id, fullName: st.fullName, className: st.classGroup.name, parentPhone: st.parentPhone },
      submission: sub ? { id: sub.id, score: sub.score === null ? null : Number(sub.score), pendingCount: sub.pendingCount, durationSec: sub.durationSec, submittedAt: sub.submittedAt } : null,
      attempts: attempts.get(st.id) ?? 0,
      perSkill,
    };
  });

  const done = rows.filter((r) => r.submission);
  const scored = done.filter((r) => r.submission!.score !== null);
  return {
    assignment: { id: a.id, title: a.title, dueAt: a.dueAt, timeLimitMin: a.timeLimitMin, maxAttempts: a.maxAttempts, source: a.source, sourceFile: a.sourceFile, questionCount: a.questions.length },
    classes: classes.map((c) => ({ id: c.id, name: c.name, campus: c.campus.name })),
    currentClass: classFilter && classIds.length === 1 ? classIds[0] : null,
    rows,
    skills,
    stats: {
      total: rows.length,
      done: done.length,
      pending: done.filter((r) => r.submission!.pendingCount > 0).length,
      avg: scored.length ? Math.round((scored.reduce((n, r) => n + r.submission!.score!, 0) / scored.length) * 10) / 10 : null,
    },
    questionStats: qStats.map((q) => ({ ...q, pct: q.n ? Math.round((q.got / q.n) * 100) : null })),
  };
}

// ═══════════════════ NHẬP BÀI TỪ FILE ═══════════════════

export async function listImportRequests(user: SessionUser, all: boolean) {
  return prisma.importRequest.findMany({
    where: { status: "PENDING", ...(all ? {} : { createdById: user.id }) },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { fullName: true } } },
  });
}

export async function getImportRequest(id: string) {
  const r = await prisma.importRequest.findUnique({ where: { id } });
  if (!r) return null;
  const keys = (r.fileKeys as string[]) ?? [];
  const names = r.fileNames.split(", ");
  const files = await Promise.all(keys.map(async (k, i) => ({ name: names[i] ?? k, url: await presignedDownloadUrl(k).catch(() => null) })));
  return { ...r, classIds: (r.classIds as string[]) ?? [], files };
}

export async function createImportRequest(actorId: string, input: { fileKeys: string[]; fileNames: string[]; classIds: string[]; note: string }) {
  return prisma.importRequest.create({
    data: { fileKeys: input.fileKeys, fileNames: input.fileNames.join(", "), classIds: input.classIds, note: input.note || null, createdById: actorId },
  });
}
