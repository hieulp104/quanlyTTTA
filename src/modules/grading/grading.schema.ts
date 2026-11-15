import { z } from "zod";

export const saveGradeSchema = z.object({
  submissionId: z.string().min(1),
  /** answerId → điểm 0–10 + nhận xét. Điểm null = chưa chấm câu đó. */
  grades: z.array(
    z.object({
      answerId: z.string().min(1),
      score: z.number().int().min(0).max(10).nullable(),
      comment: z.string().trim().max(500).optional().default(""),
    }),
  ),
  teacherComment: z.string().trim().max(1000).optional().default(""),
});

export type SaveGradeInput = z.infer<typeof saveGradeSchema>;
