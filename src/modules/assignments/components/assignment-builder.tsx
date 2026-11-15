"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Copy, LoaderCircle, Plus, Trash2, Volume2, X } from "lucide-react";
import { Alert, Button, Card, CardContent, Checkbox, ChoiceLabel, FormField, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { DEFAULT_SKILL, QUESTION_TYPE_ICON, QUESTION_TYPE_LABEL, SKILL_LABEL, SKILL_ORDER } from "@/common/enums";
import type { QuestionType, Skill } from "@/generated/prisma/enums";
import { requestUploadAction, saveAssignmentAction } from "@/modules/assignments/assignments.actions";
import { useSpeech } from "@/modules/study/components/use-speech";

type Data = Record<string, unknown>;
export type DraftQuestion = { id?: string; key: string; type: QuestionType; skill: Skill; prompt: string; data: Data; mediaUrl?: string | null };

export type BuilderProps = {
  assignmentId?: string;
  initial: {
    title: string;
    note: string;
    classIds: string[];
    dueAt: string; // yyyy-MM-ddTHH:mm giờ VN
    timeLimitMin: number;
    maxAttempts: number;
    questions: DraftQuestion[];
  };
  classes: { id: string; name: string; campus: string }[];
  importRequest?: { id: string; files: { name: string; url: string | null }[]; note: string | null };
  hasSubmissions: boolean;
};

const BLANK: Record<QuestionType, () => { prompt: string; data: Data }> = {
  MCQ: () => ({ prompt: "", data: { options: ["", "", "", ""], answer: 0 } }),
  FILL: () => ({ prompt: "", data: { answers: [""] } }),
  PICTURE: () => ({ prompt: "Đây là gì?", data: { image: "", imageKey: null, options: ["", "", "", ""], answer: 0 } }),
  MATCH: () => ({ prompt: "Nối hình với từ đúng", data: { pairs: [["", ""], ["", ""], ["", ""]] } }),
  LISTEN: () => ({ prompt: "", data: { audioText: "", audioKey: null, options: ["", "", "", ""], answer: 0 } }),
  ORDER: () => ({ prompt: "Sắp xếp các từ thành câu đúng", data: { words: [] } }),
  SPEAK: () => ({ prompt: "Con đọc to câu sau rồi gửi cho cô nhé", data: { text: "" } }),
  WRITE: () => ({ prompt: "", data: { minWords: 0 } }),
};
const TYPES = Object.keys(BLANK) as QuestionType[];
let seq = 0;
const newKey = () => `q${Date.now()}${seq++}`;

export function AssignmentBuilder({ assignmentId, initial, classes, importRequest, hasSubmissions }: BuilderProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [note, setNote] = useState(initial.note);
  const [classIds, setClassIds] = useState(initial.classIds);
  const [dueAt, setDueAt] = useState(initial.dueAt);
  const [timeLimitMin, setTimeLimit] = useState(initial.timeLimitMin);
  const [maxAttempts, setMaxAttempts] = useState(initial.maxAttempts);
  const [questions, setQuestions] = useState<DraftQuestion[]>(initial.questions);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { say } = useSpeech();

  const update = (key: string, patch: Partial<DraftQuestion>) => setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  const updateData = (key: string, patch: Data) => setQuestions((qs) => qs.map((q) => (q.key === key ? { ...q, data: { ...q.data, ...patch } } : q)));
  const move = (i: number, d: number) => setQuestions((qs) => { const a = qs.slice(); const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  function add(type: QuestionType) {
    const b = BLANK[type]();
    setQuestions((qs) => [...qs, { key: newKey(), type, skill: DEFAULT_SKILL[type], ...b }]);
    setTimeout(() => document.getElementById("q-end")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function uploadMedia(q: DraftQuestion, file: File, purpose: "question-image" | "question-audio") {
    setError(null);
    const t = await requestUploadAction({ purpose, fileName: file.name, contentType: file.type, size: file.size });
    if (!t.ok) return setError(t.message);
    const put = await fetch(t.data.url, { method: "PUT", body: file }).catch(() => null);
    if (!put?.ok) return setError("Không tải file lên được, thử lại nhé.");
    updateData(q.key, purpose === "question-image" ? { imageKey: t.data.key } : { audioKey: t.data.key });
    update(q.key, { mediaUrl: URL.createObjectURL(file) });
  }

  const save = () =>
    start(async () => {
      setError(null);
      const res = await saveAssignmentAction(
        {
          title, note, classIds, timeLimitMin, maxAttempts,
          dueAt: new Date(dueAt).toISOString(),
          importRequestId: importRequest?.id,
          questions: questions.map(({ id, type, skill, prompt, data }) => ({ id, type, skill, prompt, data })),
        },
        assignmentId,
      );
      if (!res.ok) {
        setError(res.message);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/bai-tap/${res.data.id}`);
      router.refresh();
    });

  return (
    <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
      <div className="min-w-0 space-y-3">
        {error && <Alert variant="danger">{error}</Alert>}
        {hasSubmissions && <Alert variant="warning">Bài này đã có học viên nộp. Sửa đáp án thì điểm các bé sẽ được tính lại theo đáp án mới.</Alert>}
        {importRequest && (
          <Alert variant="info">
            <b>Nhập từ file trung tâm gửi:</b>{" "}
            {importRequest.files.map((f, i) => (
              <span key={i}>{f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-link underline">{f.name}</a> : f.name}{i < importRequest.files.length - 1 ? ", " : ""}</span>
            ))}
            {importRequest.note && <span className="block text-xs">Ghi chú: {importRequest.note}</span>}
          </Alert>
        )}

        {!questions.length && (
          <Card><CardContent className="text-center text-muted">✏️ Chưa có câu hỏi. Chọn dạng bài bên dưới để thêm.</CardContent></Card>
        )}

        {questions.map((q, i) => (
          <Card key={q.key}>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">Câu {i + 1} · <span aria-hidden>{QUESTION_TYPE_ICON[q.type]}</span> {QUESTION_TYPE_LABEL[q.type]}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Lên" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Xuống" disabled={i === questions.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Nhân bản câu" onClick={() => setQuestions((qs) => [...qs.slice(0, i + 1), { ...structuredClone({ ...q, mediaUrl: undefined }), mediaUrl: q.mediaUrl, id: undefined, key: newKey() }, ...qs.slice(i + 1)])}><Copy className="size-4" /></Button>
                  <Button variant="dangerGhost" size="icon-sm" aria-label="Xóa câu" onClick={() => setQuestions((qs) => qs.filter((x) => x.key !== q.key))}><Trash2 className="size-4" /></Button>
                </div>
              </div>

              <FormField label={q.type === "FILL" ? "Câu có chỗ trống (gõ ___ ở chỗ cần điền)" : "Câu hỏi / yêu cầu"}>
                <Input value={q.prompt} onChange={(e) => update(q.key, { prompt: e.target.value })} placeholder={q.type === "FILL" ? "VD: She ___ to school every day." : ""} />
              </FormField>

              {q.type === "PICTURE" && (
                <FormField label="Hình ảnh" hint="Dán một emoji (🐘) hoặc tải ảnh lên">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid size-20 place-items-center overflow-hidden rounded-control border border-line text-5xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {q.mediaUrl ? <img src={q.mediaUrl} alt="" className="size-full object-cover" /> : String(q.data.image || "🖼️")}
                    </span>
                    <Input className="max-w-40" value={String(q.data.image ?? "")} onChange={(e) => { updateData(q.key, { image: e.target.value, imageKey: null }); update(q.key, { mediaUrl: null }); }} placeholder="🐘" />
                    <label className="cursor-pointer rounded-control border border-line px-3 py-2 text-sm hover:bg-surface-subtle">
                      Tải ảnh lên
                      <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadMedia(q, e.target.files[0], "question-image")} />
                    </label>
                  </div>
                </FormField>
              )}

              {q.type === "LISTEN" && (
                <>
                  <FormField label="Nội dung bài nghe" hint="Máy đọc bằng giọng bản ngữ. Có file mp3 của giáo trình thì tải lên để dùng file đó.">
                    <Textarea rows={2} value={String(q.data.audioText ?? "")} onChange={(e) => updateData(q.key, { audioText: e.target.value })} />
                  </FormField>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => say(String(q.data.audioText || "Please type the listening text first."), 0.9)}><Volume2 className="size-4" /> Nghe thử</Button>
                    <label className="cursor-pointer rounded-control border border-line px-3 py-1.5 text-sm hover:bg-surface-subtle">
                      {q.data.audioKey ? "Đổi file nghe" : "Tải file nghe (mp3)"}
                      <input type="file" accept="audio/*" hidden onChange={(e) => e.target.files?.[0] && uploadMedia(q, e.target.files[0], "question-audio")} />
                    </label>
                    {q.mediaUrl && <audio controls src={q.mediaUrl} className="h-9" />}
                  </div>
                </>
              )}

              {(q.type === "MCQ" || q.type === "PICTURE" || q.type === "LISTEN") && (
                <div className="space-y-2">
                  {(q.data.options as string[]).map((o, k) => (
                    <div key={k} className="grid grid-cols-[28px_1fr_36px] items-center gap-2">
                      <input type="radio" aria-label="Đáp án đúng" name={`ans-${q.key}`} checked={q.data.answer === k} onChange={() => updateData(q.key, { answer: k })} className="size-5 accent-success" />
                      <Input value={o} placeholder={`Đáp án ${"ABCDEF"[k]}`} onChange={(e) => updateData(q.key, { options: (q.data.options as string[]).map((x, j) => (j === k ? e.target.value : x)) })} />
                      <Button variant="ghost" size="icon-sm" aria-label="Xóa đáp án" disabled={(q.data.options as string[]).length <= 2}
                        onClick={() => { const opts = (q.data.options as string[]).filter((_, j) => j !== k); const ans = q.data.answer as number; updateData(q.key, { options: opts, answer: ans === k ? 0 : ans > k ? ans - 1 : ans }); }}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    {(q.data.options as string[]).length < 6 && <Button variant="subtle" size="sm" onClick={() => updateData(q.key, { options: [...(q.data.options as string[]), ""] })}><Plus className="size-4" /> Thêm đáp án</Button>}
                    <span className="text-xs text-muted">Tích vào ô tròn ở đáp án đúng.</span>
                  </div>
                </div>
              )}

              {q.type === "FILL" && (
                <FormField label="Đáp án đúng" hint="Nhiều đáp án được chấp nhận thì cách nhau bởi dấu /">
                  <Input value={(q.data.answers as string[]).join(" / ")} onChange={(e) => updateData(q.key, { answers: e.target.value.split("/").map((s) => s.trim()).filter(Boolean) })} />
                </FormField>
              )}

              {q.type === "ORDER" && (
                <FormField label="Câu đúng" hint="Bé sẽ thấy các từ bị xáo trộn và bấm theo đúng thứ tự.">
                  <Input defaultValue={(q.data.words as string[]).join(" ")} placeholder="VD: I can see three ducks" onChange={(e) => updateData(q.key, { words: e.target.value.trim().split(/\s+/).filter(Boolean) })} />
                </FormField>
              )}

              {q.type === "MATCH" && (
                <FormField label="Các cặp hình – từ">
                  <div className="space-y-2">
                    {(q.data.pairs as [string, string][]).map((p, k) => (
                      <div key={k} className="grid grid-cols-[90px_1fr_36px] items-center gap-2">
                        <Input value={p[0]} placeholder="Emoji" className="text-center text-xl" onChange={(e) => updateData(q.key, { pairs: (q.data.pairs as [string, string][]).map((x, j) => (j === k ? [e.target.value, x[1]] : x)) })} />
                        <Input value={p[1]} placeholder="Từ tiếng Anh" onChange={(e) => updateData(q.key, { pairs: (q.data.pairs as [string, string][]).map((x, j) => (j === k ? [x[0], e.target.value] : x)) })} />
                        <Button variant="ghost" size="icon-sm" aria-label="Xóa cặp" disabled={(q.data.pairs as unknown[]).length <= 2} onClick={() => updateData(q.key, { pairs: (q.data.pairs as unknown[]).filter((_, j) => j !== k) })}><X className="size-4" /></Button>
                      </div>
                    ))}
                    {(q.data.pairs as unknown[]).length < 6 && <Button variant="subtle" size="sm" onClick={() => updateData(q.key, { pairs: [...(q.data.pairs as unknown[]), ["", ""]] })}><Plus className="size-4" /> Thêm cặp</Button>}
                  </div>
                </FormField>
              )}

              {q.type === "SPEAK" && (
                <FormField label="Câu / đoạn bé cần đọc to">
                  <Textarea rows={2} value={String(q.data.text ?? "")} onChange={(e) => updateData(q.key, { text: e.target.value })} />
                </FormField>
              )}

              {q.type === "WRITE" && (
                <p className="text-sm text-muted">Bé gõ bài viết hoặc chụp ảnh vở gửi lên. Cô chấm điểm 0–10 và nhận xét.</p>
              )}

              {(q.type === "MCQ" || q.type === "FILL") && (
                <FormField label="Kỹ năng" hint="Để thống kê bé hay sai phần nào" className="max-w-56">
                  <Select value={q.skill} onChange={(e) => update(q.key, { skill: e.target.value as Skill })}>
                    {SKILL_ORDER.map((s) => <option key={s} value={s}>{SKILL_LABEL[s]}</option>)}
                  </Select>
                </FormField>
              )}
            </CardContent>
          </Card>
        ))}
        <span id="q-end" />

        <Card><CardContent>
          <h2 className="mb-3 font-semibold">Thêm câu hỏi</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TYPES.map((t) => (
              <button key={t} type="button" onClick={() => add(t)} className="rounded-control border-[1.5px] border-dashed border-line-strong px-2 py-3 text-sm font-semibold transition hover:border-primary hover:text-primary">
                <span className="block text-2xl" aria-hidden>{QUESTION_TYPE_ICON[t]}</span>
                {QUESTION_TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </CardContent></Card>
      </div>

      <div className="min-w-0">
        <Card className="xl:sticky xl:top-4"><CardContent className="space-y-4">
          <FormField label="Tên bài" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Unit 5 – At school" />
          </FormField>
          <FormField label="Giao cho lớp" required>
            <div className="space-y-1">
              {classes.map((c) => (
                <ChoiceLabel key={c.id} className={cn("border border-line", classIds.includes(c.id) && "border-primary/40 bg-brand-50")}>
                  <Checkbox checked={classIds.includes(c.id)} onChange={(e) => setClassIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))} />
                  {c.name} <span className="ml-auto text-xs text-muted">{c.campus}</span>
                </ChoiceLabel>
              ))}
            </div>
          </FormField>
          <FormField label="Hạn nộp">
            <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Thời gian làm">
              <Select value={timeLimitMin} onChange={(e) => setTimeLimit(Number(e.target.value))} className="min-w-0">
                {[0, 10, 15, 20, 25, 30, 45, 60].map((m) => <option key={m} value={m}>{m ? `${m} phút` : "Không giới hạn"}</option>)}
              </Select>
            </FormField>
            <FormField label="Số lần được làm">
              <Select value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className="min-w-0">
                {[1, 2, 3, 5, 0].map((m) => <option key={m} value={m}>{m ? `${m} lần` : "Không giới hạn"}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Lời dặn cho bé">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: Nhớ nghe 2 lần trước khi chọn nhé!" />
          </FormField>
          <Button size="lg" className="w-full" onClick={save} disabled={pending}>
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {assignmentId ? "Lưu thay đổi" : "Giao bài"}
          </Button>
        </CardContent></Card>
      </div>
    </div>
  );
}
