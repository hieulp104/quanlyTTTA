"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import { can, hasPermission, type PermissionCode, type SessionUser } from "@/common/permissions/permissions";
import { fail, ok, type ActionResult } from "@/common/filters/error";
import { prisma } from "@/shared/prisma/prisma.service";
import { buildObjectKey, objectExists, presignedUploadUrl } from "@/lib/minio";
import {
  assignmentAccess,
  createAssignment,
  createImportRequest,
  softDeleteAssignment,
  updateAssignment,
} from "@/modules/assignments/assignments.service";
import {
  assignmentInputSchema,
  importRequestSchema,
  uploadTicketSchema,
} from "@/modules/assignments/assignments.schema";

function firstIssue(error: { issues: { message: string; path: PropertyKey[] }[] }): string {
  const issue = error.issues[0];
  if (!issue) return "Dữ liệu nhập vào không hợp lệ.";
  const qIndex = issue.path[0] === "questions" ? Number(issue.path[1]) : NaN;
  return Number.isFinite(qIndex) ? `Câu ${qIndex + 1}: ${issue.message}` : issue.message;
}

/** User có quyền trên TẤT CẢ các lớp được chọn không (giáo viên chỉ giao cho lớp mình dạy). */
async function canOnClasses(user: SessionUser, permission: PermissionCode, classIds: string[]) {
  const classes = await prisma.classGroup.findMany({
    where: { id: { in: classIds }, deletedAt: null },
    select: { teacherId: true, campusId: true },
  });
  if (classes.length !== classIds.length) return false;
  return classes.every((c) => can(user, permission, { teacherIds: [c.teacherId], campusIds: [c.campusId] }));
}

export async function saveAssignmentAction(
  input: unknown,
  id?: string,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser(); // 1. session
  if (!hasPermission(user, "assignment.manage")) return fail("PERMISSION_DENIED");

  const parsed = assignmentInputSchema.safeParse(input); // 3. validate
  if (!parsed.success) return fail("VALIDATION_ERROR", firstIssue(parsed.error));

  // 2. quyền trên từng lớp được chọn + trên bài đang sửa
  if (!(await canOnClasses(user, "assignment.manage", parsed.data.classIds))) {
    return fail("PERMISSION_DENIED", "Bạn chỉ giao bài được cho lớp mình phụ trách.");
  }
  if (id) {
    const access = await assignmentAccess(id);
    if (!access) return fail("NOT_FOUND");
    if (!can(user, "assignment.manage", access)) return fail("PERMISSION_DENIED");
  }
  if (parsed.data.importRequestId && !hasPermission(user, "assignment.importProcess")) {
    return fail("PERMISSION_DENIED");
  }

  // 4. ghi + audit log (trong service)
  const a = id
    ? await updateAssignment(user.id, id, parsed.data)
    : await createAssignment(user.id, parsed.data);
  revalidatePath("/bai-tap");
  return ok({ id: a.id });
}

export async function deleteAssignmentAction(id: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  const access = await assignmentAccess(id);
  if (!access) return fail("NOT_FOUND");
  if (!can(user, "assignment.manage", access)) return fail("PERMISSION_DENIED");
  await softDeleteAssignment(user.id, id);
  revalidatePath("/bai-tap");
  return ok(null);
}

/** Nhân bản bài để giao lớp khác — bản sao chưa giao lớp nào, mở trình soạn để chọn lớp. */
export async function duplicateAssignmentAction(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const access = await assignmentAccess(id);
  if (!access) return fail("NOT_FOUND");
  if (!can(user, "assignment.view", access) || !hasPermission(user, "assignment.manage")) return fail("PERMISSION_DENIED");

  const src = await prisma.assignment.findUniqueOrThrow({ where: { id }, include: { questions: true } });
  const copy = await prisma.assignment.create({
    data: {
      title: `${src.title} (bản sao)`,
      note: src.note,
      dueAt: new Date(Date.now() + 7 * 86_400_000),
      timeLimitMin: src.timeLimitMin,
      maxAttempts: src.maxAttempts,
      createdById: user.id,
      questions: {
        create: src.questions.map((q) => ({ position: q.position, type: q.type, skill: q.skill, prompt: q.prompt, data: q.data ?? {} })),
      },
    },
  });
  return ok({ id: copy.id });
}

/**
 * Xin URL tải file lên MinIO (ảnh câu hỏi, file nghe, file đề Word/PDF).
 * Trình duyệt PUT thẳng lên MinIO, không đi qua server — cùng cách QLNS làm.
 */
export async function requestUploadAction(
  input: unknown,
): Promise<ActionResult<{ url: string; key: string }>> {
  const user = await requireUser();
  const parsed = uploadTicketSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message);
  const need: PermissionCode = parsed.data.purpose === "import-file" ? "assignment.import" : "assignment.manage";
  if (!hasPermission(user, need) && !hasPermission(user, "assignment.manage")) return fail("PERMISSION_DENIED");

  const key = buildObjectKey(`assignments/${parsed.data.purpose}/${user.id}`, parsed.data.fileName);
  try {
    return ok({ url: await presignedUploadUrl(key), key });
  } catch {
    return fail("INTERNAL_ERROR", "Chưa kết nối được kho lưu file. Kiểm tra MinIO đang chạy.");
  }
}

export async function createImportRequestAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!hasPermission(user, "assignment.import") && !hasPermission(user, "assignment.manage")) return fail("PERMISSION_DENIED");
  const parsed = importRequestSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message);
  if (!(await canOnClasses(user, "assignment.view", parsed.data.classIds))) return fail("PERMISSION_DENIED");
  for (const k of parsed.data.fileKeys) {
    if (!k.startsWith(`assignments/import-file/${user.id}/`) || !(await objectExists(k))) {
      return fail("VALIDATION_ERROR", "File chưa tải lên xong, thử lại nhé.");
    }
  }
  await createImportRequest(user.id, parsed.data);
  revalidatePath("/bai-tap");
  return ok(null);
}
