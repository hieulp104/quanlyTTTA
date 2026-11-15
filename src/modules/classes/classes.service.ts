import { prisma } from "@/shared/prisma/prisma.service";
import { scopeOf, type PermissionCode, type SessionUser } from "@/common/permissions/permissions";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Điều kiện lọc lớp theo scope của một quyền — dùng chung cho mọi module
 * (bài tập, học viên, chấm bài). Một chỗ duy nhất quyết định "ai thấy lớp nào".
 *   ALL → mọi lớp · CAMPUS → lớp ở cơ sở mình · ASSIGNED → lớp mình dạy
 */
export function classScopeWhere(
  user: SessionUser,
  permission: PermissionCode,
): Prisma.ClassGroupWhereInput | null {
  const scope = scopeOf(user, permission);
  if (!scope) return null;
  const base: Prisma.ClassGroupWhereInput = { deletedAt: null };
  if (scope === "ALL") return base;
  if (scope === "CAMPUS") return { ...base, campusId: user.campusId ?? "__none__" };
  if (scope === "ASSIGNED") return { ...base, teacherId: user.id };
  return null;
}

/** Id các lớp user được thao tác theo một quyền. */
export async function visibleClassIds(user: SessionUser, permission: PermissionCode): Promise<string[]> {
  const where = classScopeWhere(user, permission);
  if (!where) return [];
  const rows = await prisma.classGroup.findMany({ where, select: { id: true } });
  return rows.map((r) => r.id);
}

export async function listClasses(user: SessionUser, permission: PermissionCode = "class.view") {
  const where = classScopeWhere(user, permission);
  if (!where) return [];
  return prisma.classGroup.findMany({
    where,
    orderBy: [{ campus: { code: "asc" } }, { name: "asc" }],
    include: {
      campus: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
      _count: { select: { students: { where: { deletedAt: null } } } },
    },
  });
}

export type ClassStat = {
  classId: string;
  students: number;
  /** % lượt bài đã nộp trên tổng lượt bài được giao (chỉ tính bài đã mở). */
  doneRate: number | null;
  avgScore: number | null;
};

/**
 * Thống kê lớp: tỉ lệ làm bài + điểm trung bình (lấy lần làm cuối của mỗi bé).
 * Một truy vấn gom cho nhiều lớp — dashboard và trang lớp dùng chung.
 */
export async function classStats(classIds: string[]): Promise<Map<string, ClassStat>> {
  const out = new Map<string, ClassStat>();
  if (!classIds.length) return out;

  const [students, links, subs] = await Promise.all([
    prisma.student.findMany({ where: { classId: { in: classIds }, deletedAt: null }, select: { id: true, classId: true } }),
    prisma.assignmentClass.findMany({
      where: { classId: { in: classIds }, assignment: { deletedAt: null, createdAt: { lte: new Date() } } },
      select: { classId: true, assignmentId: true },
    }),
    prisma.submission.findMany({
      where: { student: { classId: { in: classIds }, deletedAt: null }, assignment: { deletedAt: null } },
      select: { assignmentId: true, studentId: true, attempt: true, score: true },
      orderBy: { attempt: "asc" },
    }),
  ]);

  const latest = new Map<string, number | null>(); // key aid|sid → score lần cuối
  for (const s of subs) latest.set(`${s.assignmentId}|${s.studentId}`, s.score === null ? null : Number(s.score));

  for (const cid of classIds) {
    const sts = students.filter((s) => s.classId === cid);
    const asgs = links.filter((l) => l.classId === cid).map((l) => l.assignmentId);
    let need = 0, done = 0, sum = 0, n = 0;
    for (const aid of asgs) {
      for (const st of sts) {
        need++;
        const key = `${aid}|${st.id}`;
        if (latest.has(key)) {
          done++;
          const sc = latest.get(key);
          if (sc !== null && sc !== undefined) { sum += sc; n++; }
        }
      }
    }
    out.set(cid, {
      classId: cid,
      students: sts.length,
      doneRate: need ? Math.round((done / need) * 100) : null,
      avgScore: n ? Math.round((sum / n) * 10) / 10 : null,
    });
  }
  return out;
}

export async function listCampuses() {
  return prisma.campus.findMany({ orderBy: { code: "asc" } });
}

export async function listTeachers() {
  return prisma.user.findMany({
    where: { deletedAt: null, isActive: true, roles: { some: { role: { code: "TEACHER" } } } },
    select: { id: true, fullName: true, campusId: true },
    orderBy: { fullName: "asc" },
  });
}
