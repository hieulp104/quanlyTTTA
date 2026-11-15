"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import { can } from "@/common/permissions/permissions";
import { fail, ok, type ActionResult } from "@/common/filters/error";
import { prisma } from "@/shared/prisma/prisma.service";
import { nextPendingId, saveGrade } from "@/modules/grading/grading.service";
import { saveGradeSchema } from "@/modules/grading/grading.schema";

export async function saveGradeAction(
  input: unknown,
): Promise<ActionResult<{ score: number | null; pendingCount: number; nextId: string | null }>> {
  const user = await requireUser(); // 1
  const parsed = saveGradeSchema.safeParse(input); // 3 (cần id để kiểm quyền)
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message);

  const sub = await prisma.submission.findUnique({
    where: { id: parsed.data.submissionId },
    select: { assignmentId: true, student: { select: { classGroup: { select: { teacherId: true, campusId: true } } } } },
  });
  if (!sub) return fail("NOT_FOUND");
  const ctx = { teacherIds: [sub.student.classGroup.teacherId], campusIds: [sub.student.classGroup.campusId] };
  if (!can(user, "grading.manage", ctx)) return fail("PERMISSION_DENIED"); // 2

  const r = await saveGrade(user.id, parsed.data); // 4
  revalidatePath("/cham-bai");
  revalidatePath(`/bai-tap/${sub.assignmentId}`);
  return ok({ ...r, nextId: await nextPendingId(user, parsed.data.submissionId) });
}
