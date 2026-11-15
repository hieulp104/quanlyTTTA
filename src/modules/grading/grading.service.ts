import { prisma } from "@/shared/prisma/prisma.service";
import { writeAuditLog } from "@/shared/audit/audit.service";
import type { SessionUser } from "@/common/permissions/permissions";
import { classScopeWhere } from "@/modules/classes/classes.service";
import { computeScore } from "@/modules/study/study.scoring";
import type { SaveGradeInput } from "@/modules/grading/grading.schema";

/** Chỉ lấy lần làm CUỐI của mỗi bé — lần cũ đã bị thay thì không cần chấm. */
async function latestPendingIds(user: SessionUser) {
  const classWhere = classScopeWhere(user, "grading.manage");
  if (!classWhere) return [];
  const subs = await prisma.submission.findMany({
    where: { assignment: { deletedAt: null }, student: { deletedAt: null, classGroup: classWhere } },
    select: { id: true, assignmentId: true, studentId: true, attempt: true, pendingCount: true },
    orderBy: { attempt: "asc" },
  });
  const latest = new Map<string, (typeof subs)[number]>();
  for (const s of subs) latest.set(`${s.assignmentId}|${s.studentId}`, s);
  return [...latest.values()].filter((s) => s.pendingCount > 0).map((s) => s.id);
}

export async function countPendingGrading(user: SessionUser): Promise<number> {
  return (await latestPendingIds(user)).length;
}

export async function listPendingGrading(user: SessionUser) {
  const ids = await latestPendingIds(user);
  return prisma.submission.findMany({
    where: { id: { in: ids } },
    orderBy: { submittedAt: "asc" },
    include: {
      student: { select: { fullName: true, classGroup: { select: { name: true, campus: { select: { name: true } } } } } },
      assignment: { select: { id: true, title: true } },
      answers: { where: { manualScore: null, question: { type: { in: ["SPEAK", "WRITE"] } } }, select: { question: { select: { type: true } } } },
    },
  });
}

/** Bài kế tiếp cần chấm — chấm xong một bài thì chuyển luôn sang bài sau. */
export async function nextPendingId(user: SessionUser, exceptId: string): Promise<string | null> {
  const list = await listPendingGrading(user);
  return list.find((s) => s.id !== exceptId)?.id ?? null;
}

export async function saveGrade(actorId: string, input: SaveGradeInput) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.submission.findUniqueOrThrow({
      where: { id: input.submissionId },
      include: { answers: { include: { question: { select: { type: true, skill: true } } } } },
    });
    for (const g of input.grades) {
      const ans = sub.answers.find((a) => a.id === g.answerId);
      if (!ans || (ans.question.type !== "SPEAK" && ans.question.type !== "WRITE")) continue;
      await tx.answer.update({ where: { id: ans.id }, data: { manualScore: g.score, comment: g.comment || null } });
      ans.manualScore = g.score;
    }
    const r = computeScore(sub.answers.map((a) => ({ type: a.question.type, skill: a.question.skill, autoFraction: a.autoFraction, manualScore: a.manualScore })));
    const updated = await tx.submission.update({
      where: { id: sub.id },
      data: { score: r.score, pendingCount: r.pendingCount, teacherComment: input.teacherComment || null, gradedById: actorId, gradedAt: new Date() },
    });
    await writeAuditLog(tx, { actorId, action: "SUBMISSION_GRADE", entity: "Submission", entityId: sub.id, before: { score: sub.score }, after: { score: updated.score } });
    return { score: r.score, pendingCount: r.pendingCount };
  });
}
