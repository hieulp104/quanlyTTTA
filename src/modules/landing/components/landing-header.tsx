"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { BrandMark } from "@/components/theme";
import { cn } from "@/lib/utils";

const LINKS = [
  ["#gioi-thieu", "Về GoSpeak"],
  ["#khoa-hoc", "Khóa học"],
  ["#phuong-phap", "Phương pháp"],
  ["#giao-vien", "Giáo viên"],
  ["#hoat-dong", "Hoạt động"],
  ["#tin-tuc", "Tin tức"],
  ["#lien-he", "Liên hệ"],
] as const;

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-[min(100%-32px,1180px)] items-center gap-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="GoSpeak English – Trang chủ">
          <BrandMark size="lg" />
          <span className="leading-none">
            <span className="block font-display text-xl font-extrabold">GoSpeak</span>
            <span className="mt-0.5 block whitespace-nowrap text-xs text-muted">English for your future</span>
          </span>
        </Link>
        <nav
          aria-label="Điều hướng chính"
          className={cn(
            "ml-auto gap-0.5",
            open ? "absolute inset-x-0 top-[72px] flex flex-col border-b border-line bg-surface px-4 pb-4 shadow-lg" : "hidden xl:flex",
          )}
        >
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="gs-navlink whitespace-nowrap px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto hidden gap-2 sm:flex xl:ml-0">
          <ButtonLink href="/login" variant="outline" size="sm" className="rounded-full">Đăng nhập</ButtonLink>
          <ButtonLink href="#dang-ky" size="sm" className="rounded-full">Đăng ký học thử</ButtonLink>
        </div>
        <button type="button" className="ml-auto p-2 sm:ml-0 xl:hidden" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>
    </header>
  );
}
