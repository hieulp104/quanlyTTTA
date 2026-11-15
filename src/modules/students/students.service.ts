import bcrypt from "bcryptjs";
import { prisma } from "@/shared/prisma/prisma.service";
import { writeAuditLog } from "@/shared/audit/audit.service";
import type { SessionUser } from "@/common/permissions/permissions";
import { classScopeWhere } from "@/modules/classes/classes.service";
import { studentAssignments, studentSkills } from "@/modules/study/study.service";
import type { StudentInput } from "@/modules/students/students.schema";
import type { Prisma } from "@/generated/prisma/client";

/** Mật khẩu ban đầu của tài khoản học viên/phụ huynh — trung tâm báo cho phụ huynh khi nhập học. */
export const DEFAULT_PASSWORD = process.env.DEFAULT_STUDENT_PASSWORD ?? "123456";

export async function listStudents(user: SessionUser, filter: { classId?: string; campusId?: string; q?: string }) {
  const classWhere = classScopeWhere(user, "student.view");
  if (!classWhere) return [];
  const where: Prisma.StudentWhereInput = {
    deletedAt: null,
    classGroup: { ...classWhere, ...(filter.campusId ? { campusId: filter.campusId } : {}) },
    ...(filter.classId ? { classId: filter.classId } : {}),
    ...(filter.q ? { OR: [{ fullName: { contains: filter.q, mode: "insensitive" } }, { code: { contains: filter.q, mode: "insensitive" } }, { parentPhone: { contains: filter.q } }] } : {}),
  };
  const students = await prisma.student.findMany({
    where,
    orderBy: [{ classGroup: { name: "asc" } }, { fullName: "asc" }],
    include: { classGroup: { select: { id: true, name: true, campus: { select: { name: true } } } } },
  });

  // Bài được giao / đã làm / điểm TB (lần cuối) cho từng bé — 2 truy vấn gom.
  const classIds = [...new Set(students.map((s) => s.classId))];
  const [links, subs] = await Promise.all([
    prisma.assignmentClass.findMany({ where: { classId: { in: classIds }, assignment: { deletedAt: null, createdAt: { lte: new Date() } } }, select: { classId: true, assignmentId: true } }),
    prisma.submission.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, assignment: { deletedAt: null } },
      select: { studentId: true, assignmentId: true, score: true, attempt: true },
      orderBy: { attempt: "asc" },
    }),
  ]);
  const latest = new Map<string, number | null>();
  for (const s of subs) latest.set(`${s.studentId}|${s.assignmentId}`, s.score === null ? null : Number(s.score));

  return students.map((st) => {
    const asgs = links.filter((l) => l.classId === st.classId).map((l) => l.assignmentId);
    let done = 0, sum = 0, n = 0;
    for (const aid of asgs) {
      const k = `${st.id}|${aid}`;
      if (!latest.has(k)) continue;
      done++;
      const sc = latest.get(k);
      if (sc !== null && sc !== undefined) { sum += sc; n++; }
    }
    return {
      id: st.id,
      code: st.code,
      fullName: st.fullName,
      className: st.classGroup.name,
      campus: st.classGroup.campus.name,
      parentName: st.parentName,
      parentPhone: st.parentPhone,
      assigned: asgs.length,
      done,
      avg: n ? Math.round((sum / n) * 10) / 10 : null,
    };
  });
}

/** Hồ sơ học tập của một bé — dùng chung cho phụ huynh, giáo viên, quản lý. */
export async function getStudentReport(studentId: string) {
  const st = await prisma.student.findFirst({
    where: { id: studentId, deletedAt: null },
    include: {
      classGroup: { include: { campus: true, teacher: { select: { fullName: true } } } },
    },
  });
  if (!st) return null;
  const [rows, skills, comments] = await Promise.all([
    studentAssignments(st.id),
    studentSkills(st.id),
    prisma.answer.findMany({
      where: { comment: { not: null }, submission: { studentId: st.id, assignment: { deletedAt: null } } },
      orderBy: { submission: { submittedAt: "desc" } },
      take: 8,
      include: { question: { select: { type: true } }, submission: { select: { submittedAt: true, assignment: { select: { title: true } } } } },
    }),
  ]);
  const general = rows.filter((r) => r.last?.teacherComment).map((r) => ({ title: r.title, at: r.last!.submittedAt, text: r.last!.teacherComment!, type: null }));
  const perQuestion = comments.map((c) => ({ title: c.submission.assignment.title, at: c.submission.submittedAt, text: c.comment!, type: c.question.type }));

  const scored = rows.filter((r) => r.last?.score !== null && r.last?.score !== undefined);
  return {
    student: {
      id: st.id,
      code: st.code,
      fullName: st.fullName,
      userId: st.userId,
      parentUserId: st.parentUserId,
      parentName: st.parentName,
      parentPhone: st.parentPhone,
      className: st.classGroup.name,
      level: st.classGroup.level,
      schedule: st.classGroup.schedule,
      campus: st.classGroup.campus,
      teacherName: st.classGroup.teacher?.fullName ?? null,
      teacherId: st.classGroup.teacherId,
    },
    rows,
    skills,
    comments: [...general, ...perQuestion].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8),
    stats: {
      total: rows.length,
      done: rows.filter((r) => r.last).length,
      todo: rows.filter((r) => r.state === "todo").length,
      missing: rows.filter((r) => !r.last).length,
      avg: scored.length ? Math.round((scored.reduce((n, r) => n + r.last!.score!, 0) / scored.length) * 10) / 10 : null,
      weakest: skills.slice().sort((a, b) => a.pct - b.pct)[0] ?? null,
    },
  };
}

export type StudentReport = NonNullable<Awaited<ReturnType<typeof getStudentReport>>>;

async function nextStudentCode(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.student.findMany({ select: { code: true } });
  const max = rows.reduce((m, r) => Math.max(m, parseInt(r.code.replace(/\D/g, ""), 10) || 0), 0);
  return `hv${String(max + 1).padStart(3, "0")}`;
}

/**
 * Tạo học viên + tài khoản đăng nhập của bé (mã HV) + tài khoản phụ huynh (SĐT).
 * Anh chị em cùng SĐT phụ huynh dùng chung một tài khoản phụ huynh.
 */
export async function createStudent(tx: Prisma.TransactionClient, actorId: string, input: StudentInput, passwordHash: string) {
  const [studentRole, parentRole] = await Promise.all([
    tx.role.findUniqueOrThrow({ where: { code: "STUDENT" } }),
    tx.role.findUniqueOrThrow({ where: { code: "PARENT" } }),
  ]);
  const code = await nextStudentCode(tx);
  const account = await tx.user.create({
    data: { username: code, fullName: input.fullName, passwordHash, userType: "STUDENT", roles: { create: { roleId: studentRole.id } } },
  });

  let parentUserId: string | null = null;
  if (input.parentPhone) {
    const existing = await tx.user.findUnique({ where: { username: input.parentPhone } });
    if (existing) parentUserId = existing.id;
    else {
      const parent = await tx.user.create({
        data: {
          username: input.parentPhone,
          phone: input.parentPhone,
          fullName: input.parentName || `Phụ huynh bé ${input.fullName.split(" ").slice(-2).join(" ")}`,
          passwordHash,
          userType: "PARENT",
          roles: { create: { roleId: parentRole.id } },
        },
      });
      parentUserId = parent.id;
    }
  }

  const st = await tx.student.create({
    data: {
      code,
      fullName: input.fullName,
      classId: input.classId,
      userId: account.id,
      parentUserId,
      parentName: input.parentName || null,
      parentPhone: input.parentPhone || null,
    },
  });
  await writeAuditLog(tx, { actorId, action: "STUDENT_CREATE", entity: "Student", entityId: st.id, after: { code, fullName: st.fullName, classId: st.classId } });
  return st;
}

export async function createStudents(actorId: string, inputs: StudentInput[]) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return prisma.$transaction(
    async (tx) => {
      const out = [];
      for (const input of inputs) out.push(await createStudent(tx, actorId, input, passwordHash));
      return out;
    },
    { timeout: 60_000 },
  );
}
