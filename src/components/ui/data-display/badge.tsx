import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold leading-none",
  {
    variants: {
      // Chữ mang màu trạng thái + nền đậm hơn surface-*: bảng dài toàn chữ trắng trên
      // nền pha 12% thì mọi trạng thái trông như nhau (phản hồi khách 30/10/2026).
      variant: {
        success: "border-success/45 bg-success/15 text-success",
        warning: "border-warning/45 bg-warning/15 text-warning",
        danger: "border-danger/45 bg-danger/15 text-danger",
        income: "border-money-income/20 bg-surface-income text-money-income",
        pending: "border-money-pending/20 bg-surface-pending text-money-pending",
        expense: "border-money-expense/20 bg-surface-expense text-money-expense",
        info: "border-info/45 bg-info/15 text-info",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
