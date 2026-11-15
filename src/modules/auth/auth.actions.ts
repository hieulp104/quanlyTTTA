"use server";

import { AuthError } from "next-auth";
import {
  changeOwnPassword,
  requireUser,
  signIn,
  signOut,
} from "@/modules/auth/auth.service";
import { changePasswordSchema, loginSchema } from "@/modules/auth/auth.schema";

export type LoginState = {
  error: string | null;
  /** Giữ lại tên đăng nhập đã nhập để không bắt gõ lại khi sai mật khẩu. */
  login?: string;
};

/** Chỉ nhận đường dẫn nội bộ để tránh open redirect (giống QLNS). */
function safeCallbackPath(raw: string | null | undefined): string {
  const fallback = "/sau-dang-nhap";
  if (!raw) return fallback;
  let path: string;
  try {
    path = raw.startsWith("/") ? raw : new URL(raw).pathname + new URL(raw).search;
  } catch {
    return fallback;
  }
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  if (path === "/" || path === "/login" || path.startsWith("/login?")) return fallback;
  return path;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const login = String(formData.get("login") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = safeCallbackPath(formData.get("callbackUrl") as string | null);

  const parsed = loginSchema.safeParse({ login, password });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", login };
  }

  try {
    await signIn("credentials", { login, password, redirectTo: callbackUrl });
  } catch (error) {
    // signIn ném redirect khi thành công — phải để nó đi tiếp, không bắt.
    if (error instanceof AuthError) {
      return { error: "Tên đăng nhập hoặc mật khẩu không đúng.", login };
    }
    throw error;
  }
  return { error: null };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export type ChangePasswordState = { error: string | null };

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };

  const result = await changeOwnPassword(user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) return { error: "Mật khẩu hiện tại không đúng." };

  await signOut({ redirectTo: "/login?doi-mat-khau=thanh-cong" });
  return { error: null };
}
