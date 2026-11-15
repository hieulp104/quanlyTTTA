import { z } from "zod";

/**
 * Tên đăng nhập: nhân sự = tên tự đặt, học viên = mã HV (hv001), phụ huynh = SĐT.
 * Chuẩn hóa về chữ thường, bỏ khoảng trắng/dấu chấm trong SĐT để phụ huynh gõ
 * "0912 345 678" hay "0912.345.678" đều vào được.
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập tên đăng nhập")
  .transform((v) => (/^[\d\s.+-]+$/.test(v) ? v.replace(/[^\d]/g, "") : v.toLowerCase()));

/** Schema form đăng nhập — dùng chung cho server action và provider Auth.js. */
export const loginSchema = z.object({
  login: usernameSchema,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z.string().min(6, "Mật khẩu mới phải có ít nhất 6 ký tự"),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu mới"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Mật khẩu nhập lại không khớp",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Mật khẩu mới phải khác mật khẩu hiện tại",
    path: ["newPassword"],
  });
