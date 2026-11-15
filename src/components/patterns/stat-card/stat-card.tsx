import type { ReactNode } from "react";

import { Card } from "@/components/ui/surfaces";
import { cn } from "@/lib/utils";

type Tone =
  | "primary"
  | "danger"
  | "income"
  | "incomeMuted"
  | "pending"
  | "expense"
  | "warning"
  | "info"
  | "neutral";

/** Chỉ các tông cần gây chú ý mới đổi màu con số; còn lại để màu chữ thường cho đỡ rối. */
const VALUE_TONE: Partial<Record<Tone, string>> = {
  primary: "text-primary",
  danger: "text-danger",
  income: "text-money-income",
  incomeMuted: "text-money-income-muted",
  expense: "text-money-expense",
};

/** Ô số liệu: nhãn nhỏ ở trên, con số lớn ở dưới — không kèm ô icon. */
export function StatCard({
  label,
  value,
  detail,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Card className={cn("px-5 py-4", className)}>
      <p className="truncate text-sm text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 whitespace-nowrap font-display text-display font-bold tracking-tight tabular-nums",
          VALUE_TONE[tone] ?? "text-foreground",
        )}
      >
        {value}
      </p>
      {detail && <div className="mt-1 text-xs text-muted">{detail}</div>}
    </Card>
  );
}
