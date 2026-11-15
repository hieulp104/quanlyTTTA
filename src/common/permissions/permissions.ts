/**
 * ═══════════════════════════════════════════════════════════════
 * GOSPEAK — Tầng phân quyền tập trung (cùng mô hình với QLNS)
 * ═══════════════════════════════════════════════════════════════
 * QUY TẮC BẮT BUỘC: mọi kiểm tra quyền đi qua `can()` trong file này.
 * TUYỆT ĐỐI không viết `if (user.roleCodes.includes("TEACHER"))` rải rác.
 *
 * scope quyết định "được làm trên phạm vi dữ liệu nào":
 *   ALL      — toàn trung tâm (cả 2 cơ sở)
 *   CAMPUS   — chỉ cơ sở của mình
 *   ASSIGNED — chỉ lớp mình phụ trách (giáo viên)
 *   SELF     — chỉ của chính mình (học viên) hoặc con mình (phụ huynh)
 *
 * 1 user có thể mang nhiều role → lấy scope RỘNG NHẤT.
 */

import type { PermissionScope } from "@/generated/prisma/enums";

// ═══════════════════ DANH MỤC QUYỀN ═══════════════════

export const PERMISSIONS = [
  // --- Học viên tự học ---
  { code: "study.do", module: "study", name: "Làm bài tập được giao" },
  { code: "result.view", module: "study", name: "Xem kết quả bài làm" },
  { code: "child.view", module: "study", name: "Phụ huynh xem tình hình học của con" },

  // --- Tổng quan ---
  { code: "dashboard.view", module: "report", name: "Xem trang tổng quan lớp/trung tâm" },

  // --- Bài tập ---
  { code: "assignment.view", module: "assignment", name: "Xem bài tập & kết quả lớp" },
  { code: "assignment.manage", module: "assignment", name: "Soạn, giao, sửa, xóa bài tập" },
  { code: "assignment.import", module: "assignment", name: "Gửi file Word/PDF để nhập bài" },
  { code: "assignment.importProcess", module: "assignment", name: "Nhập bài từ file trung tâm gửi (học vụ)" },
  { code: "grading.manage", module: "assignment", name: "Chấm bài nói, bài viết & nhận xét" },

  // --- Lớp & học viên ---
  { code: "class.view", module: "class", name: "Xem lớp học" },
  { code: "class.manage", module: "class", name: "Thêm/sửa lớp, đổi giáo viên" },
  { code: "student.view", module: "student", name: "Xem học viên" },
  { code: "student.manage", module: "student", name: "Thêm/sửa/chuyển lớp học viên" },
  { code: "student.import", module: "student", name: "Nhập danh sách học viên từ Excel" },

  // --- Tuyển sinh & trang giới thiệu ---
  { code: "lead.view", module: "lead", name: "Xem đăng ký học thử" },
  { code: "lead.manage", module: "lead", name: "Cập nhật trạng thái chăm sóc đăng ký" },
  { code: "post.manage", module: "post", name: "Đăng tin tức & lịch khai giảng" },

  // --- Hệ thống ---
  { code: "audit.view", module: "system", name: "Xem nhật ký hệ thống" },
] as const;

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

// ═══════════════════ VAI TRÒ ═══════════════════

export const ROLE_CODES = ["ADMIN", "ACADEMIC", "TEACHER", "PARENT", "STUDENT"] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_LABEL: Record<RoleCode, string> = {
  ADMIN: "Quản lý trung tâm",
  ACADEMIC: "Học vụ",
  TEACHER: "Giáo viên",
  PARENT: "Phụ huynh",
  STUDENT: "Học viên",
};

type RoleGrants = Partial<Record<PermissionCode, PermissionScope>>;

/**
 * Bộ quyền MẶC ĐỊNH khi seed. Nguồn chân lý lúc chạy là bảng role_permissions.
 */
export const DEFAULT_ROLE_GRANTS: Record<RoleCode, RoleGrants> = {
  ADMIN: Object.fromEntries(
    PERMISSIONS.filter((p) => p.module !== "study").map((p) => [p.code, "ALL" as PermissionScope]),
  ) as RoleGrants,

  ACADEMIC: {
    "dashboard.view": "ALL",
    "assignment.view": "ALL",
    "assignment.manage": "ALL",
    "assignment.importProcess": "ALL",
    "grading.manage": "ALL",
    "class.view": "ALL",
    "student.view": "ALL",
    "student.manage": "ALL",
    "student.import": "ALL",
    "lead.view": "ALL",
    "lead.manage": "ALL",
    "post.manage": "ALL",
  },

  TEACHER: {
    "dashboard.view": "ASSIGNED",
    "assignment.view": "ASSIGNED",
    "assignment.manage": "ASSIGNED",
    "assignment.import": "ASSIGNED",
    "grading.manage": "ASSIGNED",
    "class.view": "ASSIGNED",
    "student.view": "ASSIGNED",
    "student.manage": "ASSIGNED",
    "student.import": "ASSIGNED",
  },

  PARENT: {
    "child.view": "SELF",
    "result.view": "SELF",
  },

  STUDENT: {
    "study.do": "SELF",
    "result.view": "SELF",
  },
};

// ═══════════════════ KIỂM TRA QUYỀN ═══════════════════

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  userType: "STAFF" | "STUDENT" | "PARENT";
  campusId: string | null;
  /** Học viên: id hồ sơ Student của chính bé. */
  studentId: string | null;
  roleCodes: string[];
  /** code quyền → scope rộng nhất mà user có */
  permissions: Record<string, PermissionScope>;
  mustChangePassword: boolean;
};

/** Ngữ cảnh của bản ghi đang thao tác — cần cho scope khác ALL. */
export type AccessContext = {
  /** Cơ sở của bản ghi (scope CAMPUS). Bài giao nhiều lớp → truyền danh sách. */
  campusIds?: string[];
  /** Giáo viên phụ trách các lớp liên quan (scope ASSIGNED). */
  teacherIds?: (string | null)[];
  /** Người sở hữu bản ghi: user của học viên hoặc user phụ huynh (scope SELF). */
  ownerIds?: (string | null)[];
};

const SCOPE_RANK: Record<PermissionScope, number> = {
  SELF: 1,
  ASSIGNED: 2,
  CAMPUS: 3,
  ALL: 4,
};

export function widestScope(
  a: PermissionScope | undefined,
  b: PermissionScope | undefined,
): PermissionScope | undefined {
  if (!a) return b;
  if (!b) return a;
  return SCOPE_RANK[a] >= SCOPE_RANK[b] ? a : b;
}

/**
 * Câu hỏi duy nhất mà toàn hệ thống dùng để kiểm tra quyền.
 *
 * @example
 *   if (!can(user, "assignment.manage", { teacherIds })) return fail("PERMISSION_DENIED");
 */
export function can(
  user: SessionUser | null | undefined,
  permission: PermissionCode,
  ctx: AccessContext = {},
): boolean {
  if (!user) return false;
  const scope = user.permissions[permission];
  if (!scope) return false;

  switch (scope) {
    case "ALL":
      return true;
    case "CAMPUS":
      if (!user.campusId || !ctx.campusIds?.length) return false;
      return ctx.campusIds.includes(user.campusId);
    case "ASSIGNED":
      if (!ctx.teacherIds?.length) return false;
      return ctx.teacherIds.includes(user.id);
    case "SELF":
      if (!ctx.ownerIds?.length) return false;
      return ctx.ownerIds.includes(user.id);
    default:
      return false;
  }
}

/** Có quyền ở bất kỳ phạm vi nào không — dùng để hiện/ẩn menu. */
export function hasPermission(
  user: SessionUser | null | undefined,
  permission: PermissionCode,
): boolean {
  return Boolean(user?.permissions[permission]);
}

/** Scope hiện có của một quyền — service dùng để lọc danh sách. */
export function scopeOf(
  user: SessionUser | null | undefined,
  permission: PermissionCode,
): PermissionScope | null {
  return user?.permissions[permission] ?? null;
}
