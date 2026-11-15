"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Ảnh trang giới thiệu: thử ảnh thật trong public/images/landing/<file>,
 * chưa có ảnh thì hiện mảng màu + ghi chú để trung tâm biết chỗ cần ảnh.
 * Ảnh chân dung (có `alt` là tên) thì hiện chữ cái đầu của tên.
 */
export function LandingPhoto({
  file,
  hint,
  alt = "",
  className,
  tint = "bg-blue-50",
  children,
}: {
  file: string;
  hint?: string;
  alt?: string;
  className?: string;
  tint?: string;
  children?: React.ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // Ảnh lỗi trước khi React kịp gắn onError (lúc hydrate) thì kiểm tra lại một lần.
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && el.naturalWidth === 0) setFailed(true);
  }, []);
  const initial = alt.trim().split(" ").pop()?.[0];
  return (
    <div className={cn("group/photo relative grid place-items-center overflow-hidden text-center", tint, className)}>
      {failed ? (
        hint ? (
          <span className="px-4 text-xs text-muted">{hint}</span>
        ) : initial ? (
          <span aria-hidden className="font-display text-6xl font-extrabold text-foreground/15">{initial}</span>
        ) : null
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          src={`/images/landing/${file}`}
          alt={alt}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover/photo:scale-105"
          onError={() => setFailed(true)}
        />
      )}
      {children}
    </div>
  );
}
