"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import { can } from "@/common/permissions/permissions";
import { fail, ok, type ActionResult } from "@/common/filters/error";
import { buildObjectKey, objectExists, presignedUploadUrl } from "@/lib/minio";
import { getPlayerAssignment, submitAttempt } from "@/modules/study/study.service";
import { studentUploadSchema, submitAttemptSchema } from "@/modules/study/study.schema";

/** Nộp bài. Server tự chấm lại, kiểm số lần làm và file đính kèm. */
export async function submitAttemptAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser(); // 1. session
  if (!user.studentId || !can(user, "study.do", { ownerIds: [user.id] })) return fail("PERMISSION_DENIED"); // 2. quyền
  const parsed = submitAttemptSchema.safeParse(input); // 3. validate
  if (!parsed.success) return fail("VALIDATION_ERROR");

  const a = await getPlayerAssignment(user.studentId, parsed.data.assignmentId);
  if (!a) return fail("NOT_FOUND", "Không tìm thấy bài tập này.");
  if (a.maxAttempts && a.attempts >= a.maxAttempts) {
    return fail("CONFLICT", `Con đã làm đủ ${a.maxAttempts} lần cô cho phép.`);
  }
  // File phải nằm trong thư mục của chính bé và đã tải lên xong.
  for (const key of Object.values(parsed.data.files)) {
    if (!key.startsWith(`submissions/${user.studentId}/`) || !(await objectExists(key))) {
      return fail("VALIDATION_ERROR", "File ghi âm / ảnh chưa tải lên xong. Con thử lại nhé.");
    }
  }

  const sub = await submitAttempt(user.studentId, parsed.data); // 4. ghi
  revalidatePath("/hoc-tap");
  return ok({ id: sub.id });
}

/** Xin URL tải file ghi âm / ảnh vở lên MinIO. */
export async function requestStudentUploadAction(
  input: unknown,
): Promise<ActionResult<{ url: string; key: string }>> {
  const user = await requireUser();
  if (!user.studentId || !can(user, "study.do", { ownerIds: [user.id] })) return fail("PERMISSION_DENIED");
  const parsed = studentUploadSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message);

  const key = buildObjectKey(`submissions/${user.studentId}/${parsed.data.assignmentId}`, parsed.data.fileName);
  try {
    return ok({ url: await presignedUploadUrl(key), key });
  } catch {
    return fail("INTERNAL_ERROR", "Chưa tải file lên được. Con thử lại sau nhé.");
  }
}
