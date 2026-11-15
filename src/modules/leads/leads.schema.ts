import { z } from "zod";
import { normalizePhone } from "@/lib/utils";

export const leadInputSchema = z.object({
  parentName: z.string().trim().min(1, "Bố mẹ nhập họ tên giúp trung tâm nhé.").max(100),
  phone: z
    .string()
    .trim()
    .transform((v) => normalizePhone(v))
    .refine((v) => /^0\d{9}$/.test(v), "Số điện thoại chưa đúng. Ví dụ: 0912 345 678."),
  childAge: z.string().trim().max(50).optional().default(""),
  course: z.string().trim().min(1).max(100),
  campusId: z.string().trim().optional().default(""),
  callTime: z.string().trim().max(50).optional().default(""),
  note: z.string().trim().max(500).optional().default(""),
  agree: z.literal("on", { message: "Bố mẹ tích vào ô đồng ý để trung tâm được liên hệ." }),
  /** Ô bẫy chống spam — người thật không thấy nên luôn để trống. */
  website: z.string().optional().default(""),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export const leadStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "CALLED", "TRIAL_BOOKED", "ENROLLED", "DROPPED"]),
});
