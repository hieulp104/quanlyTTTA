import { z } from "zod";

/**
 * Hình dạng cột `Question.data` theo từng dạng bài. Đáp án đúng nằm ở đây —
 * KHÔNG gửi nguyên data xuống trình duyệt học viên (dùng toPlayerQuestion trong study.service).
 */
const text = (msg: string) => z.string().trim().min(1, msg);
const options = z.array(text("Còn đáp án để trống")).min(2, "Cần ít nhất 2 đáp án").max(6);

export const mcqData = z.object({ options, answer: z.number().int().min(0) });
export const pictureData = z.object({
  /** Emoji minh họa (🐘) — dùng khi không tải ảnh lên. */
  image: z.string().trim().default(""),
  /** Object key ảnh trên MinIO. */
  imageKey: z.string().trim().optional().nullable(),
  options,
  answer: z.number().int().min(0),
});
export const listenData = z.object({
  /** Máy đọc đoạn này bằng giọng bản ngữ (Text-to-speech của trình duyệt). */
  audioText: text("Chưa có nội dung bài nghe"),
  /** File nghe mp3 của giáo trình (nếu có) — ưu tiên hơn giọng máy. */
  audioKey: z.string().trim().optional().nullable(),
  options,
  answer: z.number().int().min(0),
});
export const fillData = z.object({
  /** Các đáp án được chấp nhận (không phân biệt hoa thường, bỏ dấu câu). */
  answers: z.array(text("Đáp án trống")).min(1, "Cần ít nhất 1 đáp án đúng"),
});
export const matchData = z.object({
  pairs: z
    .array(z.tuple([text("Còn cặp nối để trống"), text("Còn cặp nối để trống")]))
    .min(2, "Cần ít nhất 2 cặp")
    .max(6),
});
export const orderData = z.object({
  words: z.array(text("Từ trống")).min(2, "Câu đúng cần ít nhất 2 từ").max(16),
});
export const speakData = z.object({ text: text("Chưa có câu để bé đọc") });
export const writeData = z.object({ minWords: z.number().int().min(0).default(0) });

const skill = z.enum(["LISTENING", "SPEAKING", "READING", "WRITING", "VOCABULARY", "GRAMMAR"]);
const base = { id: z.string().optional(), prompt: text("Câu hỏi chưa có nội dung"), skill };

export const questionInputSchema = z
  .discriminatedUnion("type", [
    z.object({ ...base, type: z.literal("MCQ"), data: mcqData }),
    z.object({ ...base, type: z.literal("PICTURE"), data: pictureData }),
    z.object({ ...base, type: z.literal("LISTEN"), data: listenData }),
    z.object({ ...base, type: z.literal("FILL"), data: fillData }),
    z.object({ ...base, type: z.literal("MATCH"), data: matchData }),
    z.object({ ...base, type: z.literal("ORDER"), data: orderData }),
    z.object({ ...base, type: z.literal("SPEAK"), data: speakData }),
    z.object({ ...base, type: z.literal("WRITE"), data: writeData }),
  ])
  .superRefine((q, ctx) => {
    if ("options" in q.data && q.data.answer >= q.data.options.length) {
      ctx.addIssue({ code: "custom", message: "Chưa chọn đáp án đúng" });
    }
    if (q.type === "FILL" && !q.prompt.includes("___")) {
      ctx.addIssue({ code: "custom", message: "Câu điền từ cần có ___ ở chỗ trống" });
    }
    if (q.type === "PICTURE" && !q.data.image && !q.data.imageKey) {
      ctx.addIssue({ code: "custom", message: "Câu nhìn hình chưa có hình" });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export const assignmentInputSchema = z.object({
  title: text("Bài tập cần có tên").max(160),
  note: z.string().trim().max(500).optional().default(""),
  classIds: z.array(z.string()).min(1, "Chọn ít nhất một lớp để giao bài"),
  dueAt: z.coerce.date({ message: "Hạn nộp không hợp lệ" }),
  timeLimitMin: z.coerce.number().int().min(0).max(180),
  maxAttempts: z.coerce.number().int().min(0).max(10),
  questions: z.array(questionInputSchema).min(1, "Thêm ít nhất một câu hỏi").max(60),
  /** Bài học vụ nhập từ file trung tâm gửi — đánh dấu nguồn & đóng yêu cầu nhập. */
  importRequestId: z.string().optional(),
});

export type AssignmentInput = z.infer<typeof assignmentInputSchema>;

export const importRequestSchema = z.object({
  fileKeys: z.array(z.string()).min(1, "Chọn file đề trước nhé"),
  fileNames: z.array(z.string()).min(1),
  classIds: z.array(z.string()).min(1, "Chọn ít nhất một lớp"),
  note: z.string().trim().max(500).optional().default(""),
});

export const uploadTicketSchema = z.object({
  purpose: z.enum(["question-image", "question-audio", "import-file"]),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.string().trim().max(100),
  size: z.number().int().positive().max(20 * 1024 * 1024, "File quá lớn (tối đa 20MB)"),
});
