"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Alert, Button, Dialog } from "@/components/ui";
import { deleteAssignmentAction } from "@/modules/assignments/assignments.actions";

export function DeleteAssignmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="dangerOutline" onClick={() => setOpen(true)}><Trash2 className="size-4" /> Xóa bài</Button>
      {open && (
        <Dialog
          size="sm"
          variant="danger"
          title="Xóa bài tập này?"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteAssignmentAction(id);
                    if (!r.ok) return setError(r.message);
                    router.push("/bai-tap");
                    router.refresh();
                  })
                }
              >
                Xóa bài
              </Button>
            </div>
          }
        >
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          <p className="text-sm text-text-secondary">Bài sẽ biến mất khỏi danh sách của các bé. Điểm đã có vẫn được lưu trong nhật ký hệ thống.</p>
        </Dialog>
      )}
    </>
  );
}
