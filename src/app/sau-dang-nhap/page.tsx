import { redirect } from "next/navigation";
import { getCurrentUser, homePathFor } from "@/modules/auth/auth.service";

/** Đăng nhập xong thì về đúng trang chính của từng loại tài khoản. */
export default async function AfterLoginPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/doi-mat-khau");
  redirect(homePathFor(user));
}
