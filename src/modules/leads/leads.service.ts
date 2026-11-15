import { prisma } from "@/shared/prisma/prisma.service";
import type { LeadStatus } from "@/generated/prisma/enums";
import type { LeadInput } from "@/modules/leads/leads.schema";

export async function countNewLeads() {
  return prisma.lead.count({ where: { status: "NEW" } });
}

export async function listLeads(status?: LeadStatus) {
  return prisma.lead.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: { campus: { select: { name: true } } },
  });
}

export async function leadCounts() {
  const rows = await prisma.lead.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<Record<LeadStatus, number>>;
}

export async function createLead(input: LeadInput) {
  return prisma.lead.create({
    data: {
      parentName: input.parentName,
      phone: input.phone,
      childAge: input.childAge || null,
      course: input.course,
      campusId: input.campusId || null,
      callTime: input.callTime || null,
      note: input.note || null,
    },
  });
}
