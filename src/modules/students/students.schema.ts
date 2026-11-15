import { z } from "zod";
import { normalizePhone } from "@/lib/utils";

const phone = z
  .string()
  .trim()
  .optional()
  .default("")
  .transform((v) => (v ? normalizePhone(v) : ""))
  .refine((v) => !v || /^0\d{9}$/.test(v), "SĐT phụ huynh chưa đúng (10 số, bắt đầu bằng 0)");

export const studentInputSchema = z.object({
  fullName: z.string().trim().min(1, "Nhập họ tên học viên").max(100),
  classId: z.string().min(1, "Chọn lớp"),
  parentName: z.string().trim().max(100).optional().default(""),
  parentPhone: phone,
});

export type StudentInput = z.infer<typeof studentInputSchema>;

export const studentImportSchema = z.object({
  defaultClassId: z.string().min(1, "Chọn lớp mặc định"),
  rows: z
    .array(
      z.object({
        fullName: z.string().trim().min(1),
        classId: z.string().nullable(),
        parentName: z.string().trim().optional().default(""),
        parentPhone: z.string().trim().optional().default(""),
      }),
    )
    .min(1, "Chưa có dòng nào để nhập")
    .max(500, "Mỗi lần nhập tối đa 500 học viên"),
});

export const studentFilterSchema = z.object({
  classId: z.string().optional(),
  campusId: z.string().optional(),
  q: z.string().trim().optional(),
});
