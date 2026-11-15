"use client";

import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";
import { BrandLogoBox } from "./brand-logo-box";

/** Logo GoSpeak: ô chữ "S" + tên. Khi có file logo thật, BrandMark tự dùng icon trong theme assets. */
export function BrandLogo({
  compact = false,
  descriptor,
  inverse = false,
  sidebar = false,
  className,
}: {
  compact?: boolean;
  descriptor?: string;
  inverse?: boolean;
  sidebar?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const mark = (
    <BrandMark
      size={sidebar || compact ? "sm" : "md"}
      tone={inverse ? "inverse" : "brand"}
      className={sidebar ? "size-7 rounded-md border-0 bg-primary text-on-primary shadow-none" : undefined}
    />
  );

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center transition-[gap] duration-200",
        sidebar && compact ? "gap-0" : "gap-2.5",
        className,
      )}
    >
      {sidebar ? <BrandLogoBox>{mark}</BrandLogoBox> : mark}
      {(!compact || sidebar) && (
        <span
          aria-hidden={sidebar && compact ? true : undefined}
          className={cn(
            "min-w-0 overflow-hidden leading-tight",
            sidebar && "transition-[width,opacity] duration-200",
            sidebar && compact ? "w-0 opacity-0" : sidebar ? "w-[120px] opacity-100" : "",
          )}
        >
          <span className={cn("block truncate text-sm font-bold", inverse ? "text-on-primary" : "text-foreground")}>
            GoSpeak
          </span>
          <span className={cn("block truncate text-xs font-medium", inverse ? "text-on-primary/75" : "text-muted")}>
            {descriptor ?? "Cổng học tập"}
          </span>
        </span>
      )}
    </span>
  );
}
