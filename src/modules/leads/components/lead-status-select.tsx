"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { LEAD_STATUS_LABEL } from "@/common/enums";
import type { LeadStatus } from "@/generated/prisma/enums";
import { updateLeadStatusAction } from "@/modules/leads/leads.actions";

export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      aria-label="Trạng thái chăm sóc"
      defaultValue={status}
      disabled={pending}
      className="min-w-36 py-1.5 text-sm"
      onChange={(e) =>
        start(async () => {
          await updateLeadStatusAction({ id, status: e.target.value });
          router.refresh();
        })
      }
    >
      {(Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((s) => <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>)}
    </Select>
  );
}
