import NextAuth from "next-auth";
import { authConfig } from "@/modules/auth/auth.config";

/**
 * Từ Next.js 16, "middleware" đổi tên thành "proxy".
 * Chỉ kiểm tra "đã đăng nhập hay chưa" — quyền chi tiết (can()) nằm ở page/action.
 * Trang giới thiệu "/" và form đăng ký học thử là công khai.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|images/|.*\.(?:png|jpg|jpeg|webp|svg)$).*)"],
};
