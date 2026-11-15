import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SKILL_LABEL } from "@/common/enums";
import type { Skill } from "@/generated/prisma/enums";
import { scoreTone } from "@/modules/study/study.scoring";
import type { StudentAssignmentState } from "@/modules/study/study.service";

/** Điểm thang 10 có màu: ≥8 xanh, ≥5 vàng, dưới 5 đỏ. */
export function ScoreText({ score, className }: { score: number | null | undefined; className?: string }) {
  if (score === null || score === undefined) return <span className="text-muted">–</span>;
  const tone = scoreTone(score);
  return (
    <span
      className={cn(
        "font-display text-lg font-extrabold tabular-nums",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-danger",
        className,
      )}
    >
      {score.toLocaleString("vi-VN")}
    </span>
  );
}

const STATE: Record<StudentAssignmentState, { label: string; variant: "warning" | "danger" | "info" | "success" }> = {
  todo: { label: "Chưa làm", variant: "warning" },
  overdue: { label: "Chưa làm · quá hạn", variant: "danger" },
  pending: { label: "Chờ cô chấm", variant: "info" },
  done: { label: "Đã chấm", variant: "success" },
};

export function StateBadge({ state }: { state: StudentAssignmentState }) {
  return <Badge variant={STATE[state].variant}>{STATE[state].label}</Badge>;
}

/** Thanh tỉ lệ đúng theo kỹ năng. */
export function SkillBars({ skills }: { skills: { skill: Skill; pct: number }[] }) {
  if (!skills.length) {
    return <p className="text-sm text-muted">Chưa có dữ liệu. Làm bài xong sẽ hiện ở đây.</p>;
  }
  return (
    <div className="space-y-3">
      {skills.map((s) => (
        <div key={s.skill} className="grid grid-cols-[84px_1fr_44px] items-center gap-3 text-sm">
          <span className="text-text-secondary">{SKILL_LABEL[s.skill]}</span>
          <div className="h-3 overflow-hidden rounded-full bg-surface-subtle">
            <div
              className={cn("gs-grow h-full rounded-full", s.pct >= 75 ? "bg-success" : s.pct >= 50 ? "bg-wood-400" : "bg-danger")}
              style={{ width: `${s.pct}%` }}
            />
          </div>
          <span className="text-right font-semibold tabular-nums">{s.pct}%</span>
        </div>
      ))}
    </div>
  );
}

/** "còn 3 ngày" / "quá hạn 2 ngày" — các bé và phụ huynh đọc nhanh hơn ngày tháng. */
export function relativeDue(due: Date): string {
  const diff = due.getTime() - Date.now();
  const days = Math.round(Math.abs(diff) / 86_400_000);
  if (diff < 0) return days < 1 ? "vừa hết hạn" : `quá hạn ${days} ngày`;
  if (diff < 86_400_000) return `còn ${Math.max(1, Math.round(diff / 3_600_000))} giờ`;
  return `còn ${days} ngày`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")} phút`;
}
