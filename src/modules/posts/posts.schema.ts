import { z } from "zod";

export const postInputSchema = z.object({
  kind: z.enum(["OPENING", "EVENT", "NEWS"]),
  title: z.string().trim().min(1, "Nhập tiêu đề").max(160),
  body: z.string().trim().max(1000).optional().default(""),
  eventDate: z.coerce.date({ message: "Ngày không hợp lệ" }),
  campusId: z.string().trim().optional().default(""),
});
