import { ShieldX } from "lucide-react";

import { ButtonLink, EmptyState, IconTile } from "@/components/ui";

export function ForbiddenWorkspace() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        variant="plain"
        className="max-w-md"
        icon={
          <IconTile tone="danger" shape="circle" size="xl">
            <ShieldX className="size-7" />
          </IconTile>
        }
        title="Bạn không có quyền truy cập"
        description="Trang này giới hạn theo vai trò. Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ quản lý trung tâm."
        action={
          <ButtonLink href="/sau-dang-nhap" className="mt-2">
            Về trang chính
          </ButtonLink>
        }
      />
    </div>
  );
}
