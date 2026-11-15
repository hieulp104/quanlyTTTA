"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { duplicateAssignmentAction } from "@/modules/assignments/assignments.actions";

export function AssignmentRowActions({ id, canManage }: { id: string; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1 whitespace-nowrap">
      <ButtonLink href={`/bai-tap/${id}`} variant="outline" size="sm">Kết quả</ButtonLink>
      {canManage && (
        <>
          <ButtonLink href={`/bai-tap/${id}/sua`} variant="ghost" size="icon-sm" aria-label="Sửa bài" title="Sửa bài">
            <Pencil className="size-4" />
          </ButtonLink>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Nhân bản để giao lớp khác"
            title="Nhân bản để giao lớp khác"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await duplicateAssignmentAction(id);
                if (r.ok) router.push(`/bai-tap/${r.data.id}/sua`);
              })
            }
          >
            <Copy className="size-4" />
          </Button>
        </>
      )}
    </div>
  );
}
