"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Volume2 } from "lucide-react";
import { Alert, Badge, Button, Card, CardContent, FormField, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { MANUAL_TYPES, QUESTION_TYPE_ICON, QUESTION_TYPE_LABEL } from "@/common/enums";
import type { SubmissionDetail } from "@/modules/study/study.service";
import { saveGradeAction } from "@/modules/grading/grading.actions";
import { AnswerView, CorrectAnswer, itemMark } from "@/modules/study/components/review-list";
import { useSpeech } from "@/modules/study/components/use-speech";

const QUICK = {
  SPEAK: ["Phát âm rõ ràng, cô khen!", "Chú ý âm cuối /s/ nhé.", "Con đọc to và tự tin hơn nhé.", "Ngữ điệu tự nhiên, rất tốt!"],
  WRITE: ["Câu đúng ngữ pháp, rất tốt!", "Thêm từ nối and, but, because nhé.", "Chú ý viết hoa đầu câu.", "Ý hay, con viết dài hơn nhé."],
} as const;

type Grade = { score: number | null; comment: string };

export function GradeForm({ submission: sub }: { submission: SubmissionDetail }) {
  const router = useRouter();
  const { say } = useSpeech();
  const [grades, setGrades] = useState<Record<string, Grade>>(() =>
    Object.fromEntries(sub.items.filter((i) => MANUAL_TYPES.includes(i.type) && i.answerId).map((i) => [i.answerId!, { score: i.manualScore, comment: i.comment ?? "" }])),
  );
  const [overall, setOverall] = useState(sub.teacherComment ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = (answerId: string, patch: Partial<Grade>) => setGrades((g) => ({ ...g, [answerId]: { ...g[answerId], ...patch } }));

  const save = () =>
    start(async () => {
      const r = await saveGradeAction({
        submissionId: sub.id,
        grades: Object.entries(grades).map(([answerId, g]) => ({ answerId, score: g.score, comment: g.comment })),
        teacherComment: overall,
      });
      if (!r.ok) return setMsg({ ok: false, text: r.message });
      if (r.data.nextId) {
        router.push(`/cham-bai/${r.data.nextId}?vua-cham=${encodeURIComponent(sub.student.fullName)}`);
      } else {
        router.push(`/bai-tap/${sub.assignment.id}`);
      }
      router.refresh();
    });

  return (
    <div className="space-y-3 pb-24">
      {msg && <Alert variant={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
      {sub.items.map((item, i) => {
        const manual = MANUAL_TYPES.includes(item.type);
        const mark = itemMark(item);
        const g = item.answerId ? grades[item.answerId] : undefined;
        return (
          <Card key={item.id} className={cn("border-l-[6px]", manual ? "border-l-info" : mark.tone === "ok" ? "border-l-success" : "border-l-danger")}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">Câu {i + 1}. <span aria-hidden>{QUESTION_TYPE_ICON[item.type]}</span> {item.prompt}</p>
                {manual ? <Badge variant="info">Cô chấm</Badge> : mark.label}
              </div>
              <p className="text-xs text-muted">{QUESTION_TYPE_LABEL[item.type]}</p>

              {!manual ? (
                <div className="mt-2 text-sm">
                  <span className="text-muted">Bé chọn: </span><AnswerView item={item} />
                  {mark.tone !== "ok" && <p className="font-semibold text-success">Đáp án: <CorrectAnswer item={item} /></p>}
                </div>
              ) : (
                <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="min-w-0 text-sm">
                    {item.type === "SPEAK" && (
                      <p className="mb-2 text-muted">
                        Câu cần đọc: “{String(item.data.text)}”{" "}
                        <Button variant="ghost" size="xs" onClick={() => say(String(item.data.text).replace(/^Gợi ý:\s*/, ""), 0.85)}><Volume2 className="size-3.5" /> Mẫu</Button>
                      </p>
                    )}
                    <AnswerView item={item} />
                  </div>
                  {item.answerId && g && (
                    <div className="rounded-control bg-surface-subtle p-3">
                      <p className="mb-2 text-xs font-semibold">Điểm (0–10)</p>
                      <div className="mb-3 flex flex-wrap gap-1">
                        {Array.from({ length: 11 }, (_, n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => set(item.answerId!, { score: n })}
                            aria-pressed={g.score === n}
                            className={cn("size-8 rounded-md border text-sm font-bold", g.score === n ? "border-foreground bg-foreground text-background" : "border-line bg-surface")}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                      <Textarea rows={2} placeholder="Nhận xét cho bé…" value={g.comment} onChange={(e) => set(item.answerId!, { comment: e.target.value })} />
                      <div className="mt-2 flex flex-wrap gap-1">
                        {QUICK[item.type as "SPEAK" | "WRITE"].map((c) => (
                          <button key={c} type="button" onClick={() => set(item.answerId!, { comment: (g.comment ? g.comment.trim() + " " : "") + c })} className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs hover:border-primary">
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Card><CardContent>
        <FormField label="Nhận xét chung (phụ huynh sẽ xem được)">
          <Textarea rows={3} value={overall} onChange={(e) => setOverall(e.target.value)} placeholder="VD: Con tiến bộ phần nghe, cần luyện thêm phát âm âm cuối." />
        </FormField>
      </CardContent></Card>

      <div className="sticky bottom-0 flex justify-end gap-2 bg-gradient-to-t from-background via-background to-transparent pb-2 pt-6">
        <Button variant="outline" onClick={() => router.back()}>Hủy</Button>
        <Button size="lg" onClick={save} disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          Lưu điểm & nhận xét
        </Button>
      </div>
    </div>
  );
}
