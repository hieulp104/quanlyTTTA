import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Làm tròn số công về 2 chữ số. Số công luôn là bội của 0.25 (nửa công, và công
 * tăng ca = giờ ÷ 4), nhưng cộng bằng số thực trong JS cho ra 10.379999999999999
 * — ghi thẳng ra bảng hoặc ô Excel là kế toán thấy nguyên chuỗi đó.
 *
 * Để ở đây chứ KHÔNG ở `payroll.config.ts`: file đó import `prisma`, nên bảng
 * lương (client component) import vào là kéo cả module server sang bundle client
 * và build vỡ. `tsc` không bắt được, chỉ `next build` mới báo.
 */
export function roundDays(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * tailwind-merge không biết các cỡ chữ riêng của theme (text-display, text-h1…) nên
 * coi chúng là màu chữ và xóa mất khi gặp `text-primary` đứng sau. Khai báo để nó
 * xếp đúng nhóm cỡ chữ.
 */
const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: ["display", "h1", "h2", "h3"] }] } },
});

/**
 * Thời điểm hiện tại (ms). Server Component render một lần mỗi request nên đọc giờ
 * lúc render là đúng ý — gom về một hàm để rule react-hooks/purity không báo nhầm.
 */
export function nowMs(): number {
  return Date.now();
}

/** Gộp class Tailwind, class sau ghi đè class trước khi trùng nhóm. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Định dạng tiền VND: 1500000 → "1.500.000 ₫" */
export function formatVnd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Định dạng ngày theo giờ Việt Nam: "20/07/2026" */
export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

/** Định dạng ngày giờ: "20/07/2026 14:30" */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(d);
}

/** Chữ cái đầu của tên, dùng cho avatar: "Nguyễn Bá Thông" → "NT" */
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Khoảng thời gian tương đối, tiếng Việt: "5 phút trước", "3 ngày trước".
 * Quá 7 ngày thì trả về ngày cụ thể — "60 ngày trước" không giúp ai cả.
 */
export function formatRelativeTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days} ngày trước`;

  return formatDate(d);
}

/**
 * SĐT về đúng dạng lưu trong DB (chỉ chữ số, vd 0912345678).
 * SĐT cũng là tên đăng nhập, nên form hồ sơ và form đăng nhập phải dùng
 * chung một cách chuẩn hóa — lệch nhau là người dùng không đăng nhập được.
 */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s.\-()]/g, "");
}

/** SĐT VN sau khi chuẩn hóa: 10–11 chữ số, bắt đầu bằng 0. */
export const PHONE_PATTERN = /^0\d{9,10}$/;

/**
 * SĐT nhập MỚI cho khách và nhân viên (đặc tả IT-04, 15/10/2026): đúng 10 chữ
 * số, bắt đầu bằng 0. `PHONE_PATTERN` 10–11 số ở trên vẫn giữ cho ô đăng nhập,
 * để người có số cũ 11 chữ số chưa kịp sửa vẫn vào được.
 */
export const PHONE_INPUT_PATTERN = /^0\d{9}$/;

/**
 * Số rõ ràng là gõ cho có: 0123456789, 0987654321, 0000000000, 0999999999…
 * Dữ liệu thật đã lọt 0123456789 vào hồ sơ khách.
 */
export function isFakePhone(phone: string): boolean {
  if (/^(\d)\1+$/.test(phone.slice(1))) return true;
  return phone === "0123456789" || phone === "0987654321" || phone === "0123456788";
}

/** Câu báo lỗi SĐT nhập mới, null là hợp lệ. Dùng chung schema khách hàng + nhân sự. */
export function phoneInputProblem(phone: string): string | null {
  if (!PHONE_INPUT_PATTERN.test(phone)) {
    return "Số điện thoại phải đúng 10 chữ số và bắt đầu bằng 0";
  }
  if (isFakePhone(phone)) {
    return "Số điện thoại này là số giả (vd 0123456789) — nhập số thật";
  }
  return null;
}

/** 00:00 UTC của ngày hôm nay theo giờ VN — mốc so sánh cho cột `date`/ngày nghiệp vụ. */
export function todayVnUtc(): Date {
  const vn = new Date(Date.now() + 7 * 3_600_000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

/**
 * Ngày nghiệp vụ (lưu 00:00 UTC của ngày được chọn) có rơi SAU hôm nay + `days`
 * ngày theo giờ VN không. `days = 0` là "không được sau hôm nay".
 */
export function isAfterTodayVn(value: Date, days = 0): boolean {
  return value.getTime() > todayVnUtc().getTime() + days * 86_400_000;
}

/**
 * 00:00 UTC ngày `day` tháng `monthIndex` (0–11, tràn sang năm sau được) năm `year`.
 * Thay cho `Date.UTC` khi cắt kỳ theo năm: `Date.UTC` coi năm 0–99 là 1900–1999, nên
 * giao dịch gõ nhầm năm 26 bị tìm ở năm 1926 và không bao giờ hiện ra để sửa.
 */
export function utcDate(year: number, monthIndex: number, day = 1): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  return date;
}

/** Năm sớm nhất hợp lệ cho ngày nghiệp vụ — công ty chưa có dữ liệu trước mốc này. */
export const MIN_BUSINESS_YEAR = 2020;
