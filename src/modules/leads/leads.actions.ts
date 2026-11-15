"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/modules/auth/auth.service";
import { can } from "@/common/permissions/permissions";
import { fail, ok, type ActionResult } from "@/common/filters/error";
import { prisma } from "@/shared/prisma/prisma.service";
import { writeAuditLog } from "@/shared/audit/audit.service";
import { createLead } from "@/modules/leads/leads.service";
import { leadInputSchema, leadStatusSchema } from "@/modules/leads/leads.schema";

export type LeadFormState = { error: string | null; done?: { parentName: string; phone: string } };

/** Form đăng ký học thử trên trang giới thiệu — công khai, không cần đăng nhập. */
export async function submitLeadAction(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const parsed = leadInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Thông tin chưa hợp lệ." };
  const done = { parentName: parsed.data.parentName, phone: parsed.data.phone };
  if (parsed.data.website) return { error: null, done }; // bot điền ô bẫy → giả vờ thành công
  await createLead(parsed.data);
  revalidatePath("/dang-ky-hoc-thu");
  return { error: null, done };
}

export async function updateLeadStatusAction(input: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!can(user, "lead.manage")) return fail("PERMISSION_DENIED");
  const parsed = leadStatusSchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR");
  await prisma.$transaction(async (tx) => {
    const before = await tx.lead.findUniqueOrThrow({ where: { id: parsed.data.id } });
    await tx.lead.update({ where: { id: before.id }, data: { status: parsed.data.status } });
    await writeAuditLog(tx, {
      actorId: user.id,
      action: "LEAD_STATUS",
      entity: "Lead",
      entityId: before.id,
      before: { status: before.status },
      after: { status: parsed.data.status },
    });
  });
  revalidatePath("/dang-ky-hoc-thu");
  return ok(null);
}
