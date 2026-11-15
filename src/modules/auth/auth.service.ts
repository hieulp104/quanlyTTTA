import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/modules/auth/auth.config";
import { prisma } from "@/shared/prisma/prisma.service";
import {
  hasPermission,
  widestScope,
  type SessionUser,
} from "@/common/permissions/permissions";
import type { PermissionScope } from "@/generated/prisma/enums";
import { loginSchema } from "@/modules/auth/auth.schema";

/**
 * Nạp toàn bộ quyền hiệu lực của user từ DB.
 * User nhiều role → gộp lại, mỗi quyền lấy scope RỘNG NHẤT.
 */
export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    include: {
      studentProfile: { select: { id: true, deletedAt: true } },
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!user) return null;
  // Học viên đã nghỉ (hồ sơ bị xóa mềm) thì tài khoản cũng không dùng được nữa.
  if (user.userType === "STUDENT" && (!user.studentProfile || user.studentProfile.deletedAt)) {
    return null;
  }

  const permissions: Record<string, PermissionScope> = {};
  for (const { role } of user.roles) {
    for (const rp of role.permissions) {
      const merged = widestScope(permissions[rp.permission.code], rp.scope);
      if (merged) permissions[rp.permission.code] = merged;
    }
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    userType: user.userType,
    campusId: user.campusId,
    studentId: user.studentProfile?.id ?? null,
    roleCodes: user.roles.map((r) => r.role.code),
    permissions,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Bao lâu thì nạp lại quyền từ DB một lần (giống QLNS). */
const SESSION_REVALIDATE_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        login: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { login, password } = parsed.data;

        const user = await prisma.user.findFirst({
          where: { username: login, deletedAt: null, isActive: true },
          select: { id: true, fullName: true, passwordHash: true },
        });
        if (!user) return null;
        if (!(await bcrypt.compare(password, user.passwordHash))) return null;

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, name: user.fullName };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger }) {
      const isStale =
        typeof token.refreshedAt !== "number" ||
        Date.now() - token.refreshedAt > SESSION_REVALIDATE_MS;

      if (user?.id || trigger === "update" || isStale) {
        const id = user?.id ?? (token.sub as string | undefined);
        if (id) {
          const sessionUser = await loadSessionUser(id);
          token.sub = sessionUser?.id ?? token.sub;
          token.sessionUser = sessionUser ?? undefined;
          token.refreshedAt = Date.now();
        }
      }
      return token;
    },

    async session({ session, token }) {
      const sessionUser = token.sessionUser as SessionUser | undefined;
      if (!sessionUser) {
        session.user = { ...session.user, id: "" } as typeof session.user;
        return session;
      }
      session.user = { ...session.user, ...sessionUser } as typeof session.user;
      return session;
    },
  },
});

/** Lấy user hiện tại kèm bảng quyền. Trả null nếu chưa đăng nhập. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  return user?.id ? user : null;
}

/** Bắt buộc phải đăng nhập — ném lỗi nếu không, dùng trong server action. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

/**
 * Trang đầu tiên sau khi đăng nhập — theo quyền, không theo tên vai trò:
 * học viên vào danh sách bài, phụ huynh vào trang của con, nhân sự vào tổng quan.
 */
export function homePathFor(user: SessionUser): string {
  if (hasPermission(user, "study.do")) return "/hoc-tap";
  if (hasPermission(user, "child.view")) return "/phu-huynh";
  if (hasPermission(user, "dashboard.view")) return "/dashboard";
  return "/khong-co-quyen";
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: "WRONG_CURRENT" }> {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null, isActive: true },
    select: { id: true, passwordHash: true },
  });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return { ok: false, reason: "WRONG_CURRENT" };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
  });
  return { ok: true };
}
