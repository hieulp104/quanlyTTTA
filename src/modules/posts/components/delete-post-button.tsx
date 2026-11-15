"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { deletePostAction } from "@/modules/posts/posts.actions";

export function DeletePostButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="dangerGhost"
      size="icon-sm"
      aria-label="Xóa bài đăng"
      disabled={pending}
      onClick={() => {
        if (!confirm("Xóa bài đăng này khỏi trang chủ?")) return;
        start(async () => {
          await deletePostAction(id);
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
