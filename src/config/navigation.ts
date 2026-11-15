import {
  BookOpenCheck,
  CircleCheckBig,
  GraduationCap,
  House,
  LayoutDashboard,
  Megaphone,
  NotebookPen,
  PhoneCall,
  School,
  Star,
  UsersRound,
} from "lucide-react";
import type { PermissionCode } from "@/common/permissions/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Quyền tối thiểu để thấy mục này. Không có quyền → ẩn khỏi sidebar. */
  permission: PermissionCode;
  /** Số đếm cạnh menu (bài chờ chấm, đăng ký mới) — layout tính sẵn ở server. */
  badgeKey?: "grading" | "leads";
};

/**
 * Menu dùng chung cho mọi loại tài khoản — mỗi người chỉ thấy mục mình có quyền:
 * học viên 2 mục, phụ huynh 2 mục, giáo viên/quản lý phần còn lại.
 */
export const NAV_ITEMS: NavItem[] = [
  // Học viên
  { href: "/hoc-tap", label: "Bài tập", icon: House, permission: "study.do" },
  // Phụ huynh
  { href: "/phu-huynh", label: "Con học thế nào", icon: GraduationCap, permission: "child.view" },
  // Học viên + phụ huynh
  { href: "/ket-qua", label: "Kết quả", icon: Star, permission: "result.view" },
  // Nhân sự
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/bai-tap", label: "Bài tập", icon: NotebookPen, permission: "assignment.view" },
  { href: "/cham-bai", label: "Chấm bài", icon: CircleCheckBig, permission: "grading.manage", badgeKey: "grading" },
  { href: "/hoc-vien", label: "Học viên", icon: UsersRound, permission: "student.view" },
  { href: "/lop-hoc", label: "Lớp học", icon: School, permission: "class.view" },
  { href: "/dang-ky-hoc-thu", label: "Đăng ký học thử", icon: PhoneCall, permission: "lead.view", badgeKey: "leads" },
  { href: "/tin-tuc", label: "Tin tức & khai giảng", icon: Megaphone, permission: "post.manage" },
];

export const NAV_ICON_FALLBACK = BookOpenCheck;
