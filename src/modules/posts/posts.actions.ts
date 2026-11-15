"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import { can } from "@/common/permissions/permissions";
import { fail, ok, type ActionResult } from "@/common/filters/error";
import { prisma } from "@/shared/prisma/prisma.service";
import { writeAuditLog } from "@/shared/audit/audit.service";
import { postInputSchema } from "@/modules/posts/posts.schema";

export type PostFormState = { error: string | null; savedAt?: number };

export async function createPostAction(_prev: PostFormState, formData: FormData): Promise<PostFormState> {
  const user = await requireUser();
  if (!can(user, "post.manage")) return { error: "Bạn không có quyền đăng tin." };
  const parsed = postInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
  await prisma.$transaction(async (tx) => {
    const p = await tx.post.create({
      data: { ...parsed.data, campusId: parsed.data.campusId || null, createdById: user.id },
    });
    await writeAuditLog(tx, { actorId: user.id, action: "POST_CREATE", entity: "Post", entityId: p.id, after: { title: p.title } });
  });
  revalidatePath("/tin-tuc");
  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}

export async function deletePostAction(id: string): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!can(user, "post.manage")) return fail("PERMISSION_DENIED");
  await prisma.$transaction(async (tx) => {
    const p = await tx.post.update({ where: { id }, data: { deletedAt: new Date() } });
    await writeAuditLog(tx, { actorId: user.id, action: "POST_DELETE", entity: "Post", entityId: id, before: { title: p.title } });
  });
  revalidatePath("/tin-tuc");
  revalidatePath("/");
  return ok(null);
}
