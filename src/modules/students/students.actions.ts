"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import { can, hasPermission } from "@/common/permissions/permissions";
import { fail, ok, type ActionResult } from "@/common/filters/error";
import { prisma } from "@/shared/prisma/prisma.service";
import { createStudents } from "@/modules/students/students.service";
import { parseStudentFile, type ParsedStudentRow } from "@/modules/students/students.excel";
import { studentImportSchema, studentInputSchema } from "@/modules/students/students.schema";
import { normalizeText } from "@/modules/study/study.scoring";

async function classCtx(classId: string) {
  const c = await prisma.classGroup.findFirst({ where: { id: classId, deletedAt: null }, select: { teacherId: true, campusId: true } });
  return c ? { teacherIds: [c.teacherId], campusIds: [c.campusId] } : null;
}

export type StudentFormState = { error: string | null; created?: { code: string; fullName: string } };

export async function createStudentAction(_prev: StudentFormState, formData: FormData): Promise<StudentFormState> {
  const user = await requireUser();
  if (!hasPermission(user, "student.manage")) return { error: "Bạn không có quyền thêm học viên." };
  const parsed = studentInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  const ctx = await classCtx(parsed.data.classId);
  if (!ctx || !can(user, "student.manage", ctx)) return { error: "Bạn chỉ thêm được học viên vào lớp mình phụ trách." };

  const [st] = await createStudents(user.id, [parsed.data]);
  revalidatePath("/hoc-vien");
  return { error: null, created: { code: st.code, fullName: st.fullName } };
}

export type PreviewRow = ParsedStudentRow & { classId: string | null };

/** Bước 1 nhập Excel: đọc file, khớp tên lớp, trả bản xem trước — CHƯA ghi gì. */
export async function previewStudentImportAction(formData: FormData): Promise<ActionResult<{ rows: PreviewRow[] }>> {
  const user = await requireUser();
  if (!hasPermission(user, "student.import")) return fail("PERMISSION_DENIED");
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return fail("VALIDATION_ERROR", "Chọn file danh sách trước nhé.");
  if (file.size > 5 * 1024 * 1024) return fail("VALIDATION_ERROR", "File quá lớn (tối đa 5MB).");
  if (!/\.(xlsx|csv)$/i.test(file.name)) return fail("VALIDATION_ERROR", "Chỉ nhận file .xlsx hoặc .csv.");

  let parsed;
  try {
    parsed = await parseStudentFile(file.name, await file.arrayBuffer());
  } catch {
    return fail("VALIDATION_ERROR", "Không đọc được file này. Thử lưu lại dạng .xlsx hoặc .csv.");
  }
  if (parsed.error) return fail("VALIDATION_ERROR", parsed.error);

  const classes = await prisma.classGroup.findMany({ where: { deletedAt: null }, select: { id: true, name: true, teacherId: true, campusId: true } });
  const usable = classes.filter((c) => can(user, "student.import", { teacherIds: [c.teacherId], campusIds: [c.campusId] }));
  return ok({
    rows: parsed.rows.map((r) => ({ ...r, classId: usable.find((c) => normalizeText(c.name) === normalizeText(r.className))?.id ?? null })),
  });
}

/** Bước 2 nhập Excel: ghi học viên + tạo tài khoản bé và phụ huynh. */
export async function importStudentsAction(input: unknown): Promise<ActionResult<{ count: number }>> {
  const user = await requireUser();
  if (!hasPermission(user, "student.import")) return fail("PERMISSION_DENIED");
  const parsed = studentImportSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message);

  const rows = parsed.data.rows.map((r) => ({
    fullName: r.fullName,
    classId: r.classId ?? parsed.data.defaultClassId,
    parentName: r.parentName ?? "",
    parentPhone: /^0\d{9}$/.test(r.parentPhone ?? "") ? r.parentPhone! : "",
  }));
  for (const cid of new Set(rows.map((r) => r.classId))) {
    const ctx = await classCtx(cid);
    if (!ctx || !can(user, "student.import", ctx)) return fail("PERMISSION_DENIED", "Có học viên thuộc lớp bạn không phụ trách.");
  }
  const created = await createStudents(user.id, rows);
  revalidatePath("/hoc-vien");
  return ok({ count: created.length });
}
