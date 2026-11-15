import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MANUAL_TYPES, QUESTION_TYPE_ICON, QUESTION_TYPE_LABEL } from "@/common/enums";
import type { SubmissionDetail } from "@/modules/study/study.service";

type Item = SubmissionDetail["items"][number];

/** Hình câu hỏi: ảnh tải lên hoặc emoji. */
export function QuestionPicture({ image, imageUrl, className }: { image?: unknown; imageUrl?: string | null; className?: string }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={cn("mx-auto max-h-48 rounded-card object-contain", className)} />;
  }
  return <span className={className}>{String(image ?? "")}</span>;
}

/** Bài làm của bé, viết ra chữ dễ đọc cho từng dạng bài. */
export function AnswerView({ item }: { item: Item }) {
  const v = item.value as unknown;
  const d = item.data;
  const empty = <i className="text-muted">(bỏ trống)</i>;
  switch (item.type) {
    case "MCQ":
    case "PICTURE":
    case "LISTEN":
      return v === null || v === undefined ? empty : <>{(d.options as string[])[Number(v)]}</>;
    case "FILL":
      return v ? <>{String(v)}</> : empty;
    case "ORDER":
      return Array.isArray(v) && v.length ? <>{v.join(" ")}</> : empty;
    case "MATCH": {
      const pairs = d.pairs as [string, string][];
      const map = (v ?? {}) as Record<string, number>;
      return (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {pairs.map((p, i) => (
            <span key={i}>
              {p[0]} → {map[i] !== undefined ? pairs[map[i]]?.[1] : "?"} {Number(map[i]) === i ? "✓" : "✗"}
            </span>
          ))}
        </span>
      );
    }
    case "SPEAK": {
      if (item.fileUrl) return <audio controls src={item.fileUrl} className="mt-1 w-full max-w-sm" />;
      const sample = v as { duration?: number } | null;
      return sample?.duration ? <Badge variant="info">🎙️ Bản ghi âm {sample.duration} giây (dữ liệu mẫu)</Badge> : empty;
    }
    case "WRITE": {
      const text = (v as { text?: string } | null)?.text;
      return (
        <span className="block space-y-2">
          {text && <span className="block whitespace-pre-wrap">{text}</span>}
          {item.fileUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.fileUrl} alt="Ảnh bài viết của bé" className="max-h-80 rounded-control border border-line" />
          )}
          {!text && !item.fileUrl && empty}
        </span>
      );
    }
  }
}

export function CorrectAnswer({ item }: { item: Item }) {
  const d = item.data;
  switch (item.type) {
    case "MCQ":
    case "PICTURE":
    case "LISTEN":
      return <>{(d.options as string[])[Number(d.answer)]}</>;
    case "FILL":
      return <>{(d.answers as string[]).join(" / ")}</>;
    case "ORDER":
      return <>{(d.words as string[]).join(" ")}</>;
    case "MATCH":
      return <>{(d.pairs as [string, string][]).map((p) => `${p[0]} → ${p[1]}`).join("   ")}</>;
    default:
      return null;
  }
}

export function itemMark(item: Item): { tone: "ok" | "part" | "no" | "wait"; label: React.ReactNode } {
  if (MANUAL_TYPES.includes(item.type)) {
    if (item.manualScore === null) return { tone: "wait", label: <Badge variant="info">Chờ cô chấm</Badge> };
    const s = item.manualScore;
    return { tone: s >= 8 ? "ok" : s >= 5 ? "part" : "no", label: <Badge variant={s >= 8 ? "success" : s >= 5 ? "warning" : "danger"}>{s}/10</Badge> };
  }
  const f = item.autoFraction ?? 0;
  if (f === 1) return { tone: "ok", label: <Badge variant="success">Đúng</Badge> };
  if (f > 0) {
    const n = (item.data.pairs as unknown[] | undefined)?.length ?? 1;
    return { tone: "part", label: <Badge variant="warning">Đúng {Math.round(f * n)}/{n}</Badge> };
  }
  return { tone: "no", label: <Badge variant="danger">Chưa đúng</Badge> };
}

const BORDER = { ok: "border-l-success", part: "border-l-wood-400", no: "border-l-danger", wait: "border-l-info" };

/** Danh sách từng câu kèm bài làm, đáp án, nhận xét của cô. */
export function ReviewList({ items, showCorrect = true }: { items: Item[]; showCorrect?: boolean }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const mark = itemMark(item);
        return (
          <div key={item.id} className={cn("rounded-card border border-l-[6px] border-line bg-surface px-5 py-4 shadow-card", BORDER[mark.tone])}>
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold text-foreground">
                Câu {i + 1}. <span aria-hidden>{QUESTION_TYPE_ICON[item.type]}</span> {item.prompt}
              </p>
              {mark.label}
            </div>
            <p className="mt-0.5 text-xs text-muted">{QUESTION_TYPE_LABEL[item.type]}</p>
            {item.type === "SPEAK" && <p className="mt-2 text-sm text-muted">Câu cần đọc: “{String(item.data.text)}”</p>}
            <div className="mt-2 text-sm text-text-secondary">
              <span className="text-muted">Bài làm: </span>
              <AnswerView item={item} />
            </div>
            {showCorrect && !MANUAL_TYPES.includes(item.type) && mark.tone !== "ok" && (
              <p className="mt-1 text-sm font-semibold text-success">
                Đáp án: <CorrectAnswer item={item} />
              </p>
            )}
            {item.comment && (
              <div className="mt-3 rounded-control bg-wood-50 px-3.5 py-2.5 text-sm">
                <span className="block text-xs font-semibold text-wood-700">Cô nhận xét</span>
                {item.comment}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
