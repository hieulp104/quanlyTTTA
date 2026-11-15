/**
 * Chấm điểm — hàm thuần, không đụng DB, dùng chung cho nộp bài, chấm lại khi
 * giáo viên sửa đáp án, và seed dữ liệu mẫu.
 *
 * Thang điểm: mỗi câu nặng như nhau. Câu tự chấm cho tỉ lệ 0–1 (câu nối được
 * điểm từng phần), câu nói/viết = điểm giáo viên / 10. Điểm bài = trung bình × 10,
 * làm tròn 1 chữ số. Câu nói/viết chưa chấm thì chưa tính → điểm "tạm tính".
 */
import type { QuestionType, Skill } from "@/generated/prisma/enums";
import { MANUAL_TYPES } from "@/common/enums";

/** Bỏ hoa thường, dấu câu, khoảng trắng thừa — bé gõ "Is." hay "is" đều đúng. */
export function normalizeText(s: unknown): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[.,!?;:'"’]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type QData = Record<string, unknown>;

/** Tỉ lệ đúng 0–1 của câu tự chấm. Câu nói/viết trả null (giáo viên chấm). */
export function gradeAuto(type: QuestionType, data: QData, value: unknown): number | null {
  if (MANUAL_TYPES.includes(type)) return null;
  if (value === undefined || value === null || value === "") return 0;

  switch (type) {
    case "MCQ":
    case "PICTURE":
    case "LISTEN":
      return Number(value) === Number(data.answer) ? 1 : 0;
    case "FILL": {
      const answers = (data.answers as string[]) ?? [];
      return answers.some((a) => normalizeText(a) === normalizeText(value)) ? 1 : 0;
    }
    case "ORDER": {
      const words = (data.words as string[]) ?? [];
      const got = Array.isArray(value) ? value.join(" ") : String(value);
      return normalizeText(got) === normalizeText(words.join(" ")) ? 1 : 0;
    }
    case "MATCH": {
      const pairs = (data.pairs as unknown[]) ?? [];
      const map = (value ?? {}) as Record<string, number>;
      let right = 0;
      pairs.forEach((_, i) => {
        if (Number(map[i]) === i) right++;
      });
      return pairs.length ? right / pairs.length : 0;
    }
    default:
      return 0;
  }
}

export type ScoredAnswer = {
  type: QuestionType;
  skill: Skill;
  autoFraction: number | null;
  manualScore: number | null;
};

export type ScoreResult = {
  /** Thang 10, null khi chưa có câu nào tính được. */
  score: number | null;
  pendingCount: number;
  perSkill: Partial<Record<Skill, { got: number; total: number }>>;
};

export function computeScore(answers: ScoredAnswer[]): ScoreResult {
  let got = 0;
  let total = 0;
  let pendingCount = 0;
  const perSkill: ScoreResult["perSkill"] = {};

  for (const a of answers) {
    let frac: number;
    if (MANUAL_TYPES.includes(a.type)) {
      if (a.manualScore === null || a.manualScore === undefined) {
        pendingCount++;
        continue;
      }
      frac = a.manualScore / 10;
    } else {
      frac = a.autoFraction ?? 0;
    }
    got += frac;
    total += 1;
    const s = (perSkill[a.skill] ??= { got: 0, total: 0 });
    s.got += frac;
    s.total += 1;
  }

  return {
    score: total ? Math.round((got / total) * 100) / 10 : null,
    pendingCount,
    perSkill,
  };
}

/** Màu điểm dùng chung: ≥8 tốt, ≥5 khá, còn lại cần cố gắng. */
export function scoreTone(score: number | null | undefined): "success" | "warning" | "danger" | null {
  if (score === null || score === undefined) return null;
  return score >= 8 ? "success" : score >= 5 ? "warning" : "danger";
}
