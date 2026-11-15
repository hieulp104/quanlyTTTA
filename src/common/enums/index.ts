/**
 * Nhãn tiếng Việt cho enum Prisma — giao diện không bao giờ hiện mã enum thô.
 */
import type {
  AssignmentSource,
  LeadStatus,
  PostKind,
  QuestionType,
  Skill,
} from "@/generated/prisma/enums";

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  MCQ: "Chọn đáp án đúng",
  FILL: "Điền từ còn thiếu",
  PICTURE: "Nhìn hình chọn từ",
  MATCH: "Nối hình với từ",
  LISTEN: "Nghe và trả lời",
  ORDER: "Sắp xếp thành câu",
  SPEAK: "Đọc to, ghi âm",
  WRITE: "Viết đoạn văn",
};

/** Emoji minh họa dạng bài — các bé nhận ra nhanh hơn chữ. */
export const QUESTION_TYPE_ICON: Record<QuestionType, string> = {
  MCQ: "🔤",
  FILL: "✏️",
  PICTURE: "🖼️",
  MATCH: "🔗",
  LISTEN: "🎧",
  ORDER: "🧩",
  SPEAK: "🎙️",
  WRITE: "📝",
};

/** Dạng bài giáo viên chấm tay. */
export const MANUAL_TYPES: readonly QuestionType[] = ["SPEAK", "WRITE"];

/** Kỹ năng mặc định của từng dạng bài (MCQ/FILL cho giáo viên chọn lại). */
export const DEFAULT_SKILL: Record<QuestionType, Skill> = {
  MCQ: "GRAMMAR",
  FILL: "VOCABULARY",
  PICTURE: "VOCABULARY",
  MATCH: "VOCABULARY",
  LISTEN: "LISTENING",
  ORDER: "GRAMMAR",
  SPEAK: "SPEAKING",
  WRITE: "WRITING",
};

export const SKILL_LABEL: Record<Skill, string> = {
  LISTENING: "Nghe",
  SPEAKING: "Nói",
  READING: "Đọc",
  WRITING: "Viết",
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
};

export const SKILL_ORDER: Skill[] = ["LISTENING", "SPEAKING", "READING", "WRITING", "VOCABULARY", "GRAMMAR"];

export const SOURCE_LABEL: Record<AssignmentSource, string> = {
  WEB: "Soạn trên web",
  FILE: "Nhập từ file",
};

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Mới",
  CALLED: "Đã gọi",
  TRIAL_BOOKED: "Hẹn học thử",
  ENROLLED: "Đã nhập học",
  DROPPED: "Không tiếp tục",
};

export const POST_KIND_LABEL: Record<PostKind, string> = {
  OPENING: "Lịch khai giảng",
  EVENT: "Sự kiện",
  NEWS: "Tin tức / góc phụ huynh",
};
