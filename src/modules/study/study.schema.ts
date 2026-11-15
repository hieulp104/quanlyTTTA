import { z } from "zod";

/** Bài làm bé gửi lên. Câu trả lời thô, server tự chấm lại — không tin điểm từ trình duyệt. */
export const submitAttemptSchema = z.object({
  assignmentId: z.string().min(1),
  /** Lúc bé bấm "Bắt đầu" (ms) — để tính thời gian làm bài. */
  startedAt: z.number().int().positive(),
  autoSubmitted: z.boolean().default(false),
  answers: z.record(z.string(), z.unknown()),
  /** questionId → object key file ghi âm / ảnh vở đã tải lên MinIO. */
  files: z.record(z.string(), z.string()).default({}),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const studentUploadSchema = z.object({
  assignmentId: z.string().min(1),
  kind: z.enum(["audio", "image"]),
  fileName: z.string().trim().min(1).max(200),
  size: z.number().int().positive().max(15 * 1024 * 1024, "File quá lớn (tối đa 15MB)"),
});
