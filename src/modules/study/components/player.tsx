"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Mic, Square, Volume2, X } from "lucide-react";
import { Alert, Button, Dialog, Textarea } from "@/components/ui";
import { cn, nowMs } from "@/lib/utils";
import { QUESTION_TYPE_ICON, QUESTION_TYPE_LABEL } from "@/common/enums";
import type { PlayerQuestion } from "@/modules/study/study.service";
import { requestStudentUploadAction, submitAttemptAction } from "@/modules/study/study.actions";
import { useSpeech } from "@/modules/study/components/use-speech";
import { QuestionPicture } from "@/modules/study/components/review-list";

type Props = {
  assignment: { id: string; title: string; timeLimitMin: number; questions: PlayerQuestion[] };
};

type FileState = { key: string; previewUrl: string; duration?: number };
const PAIR_COLORS = ["#2f6fdf", "#e08a00", "#1f9d63", "#9b51e0", "#c8102e", "#0097a7"];

/** Nén ảnh vở trước khi tải lên — ảnh điện thoại 4–8MB xuống còn vài trăm KB. */
function compressImage(file: File, max = 1400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.75);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function Player({ assignment }: Props) {
  const router = useRouter();
  const qs = assignment.questions;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, FileState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"submit" | "quit" | null>(null);
  const [pending, startTransition] = useTransition();
  // Mốc bắt đầu cố định từ lần render đầu (bé vừa bấm "Bắt đầu").
  const [startedAt] = useState(() => nowMs());
  const submitted = useRef(false);
  const deadline = assignment.timeLimitMin ? startedAt + assignment.timeLimitMin * 60_000 : 0;
  const [left, setLeft] = useState(assignment.timeLimitMin * 60);
  const { say, stop, playing } = useSpeech();

  const q = qs[idx];
  const setAnswer = (id: string, v: unknown) => setAnswers((a) => ({ ...a, [id]: v }));

  const isAnswered = useCallback(
    (x: PlayerQuestion) => {
      const v = answers[x.id];
      if (x.type === "SPEAK") return Boolean(files[x.id]);
      if (x.type === "WRITE") return Boolean(files[x.id]) || Boolean((v as { text?: string })?.text?.trim());
      if (v === undefined || v === null || v === "") return false;
      if (x.type === "ORDER") return (v as unknown[]).length === x.words!.length;
      if (x.type === "MATCH") return Object.keys(v as object).length === x.left!.length;
      return true;
    },
    [answers, files],
  );
  const answeredCount = qs.filter(isAnswered).length;

  const submit = useCallback(
    (auto: boolean) => {
      if (submitted.current) return;
      submitted.current = true;
      stop();
      setConfirm(null);
      startTransition(async () => {
        const res = await submitAttemptAction({
          assignmentId: assignment.id,
          startedAt,
          autoSubmitted: auto,
          answers,
          files: Object.fromEntries(Object.entries(files).map(([k, f]) => [k, f.key])),
        });
        if (!res.ok) {
          submitted.current = false;
          setError(res.message);
          return;
        }
        router.push(`/ket-qua/${res.data.id}?moi=1`);
      });
    },
    [answers, files, assignment.id, router, stop, startedAt],
  );

  // Đồng hồ đếm ngược — hết giờ thì tự nộp.
  useEffect(() => {
    if (!deadline) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        submit(true);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [deadline, submit]);

  // Nhắc khi lỡ tay đóng tab giữa chừng.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const go = (i: number) => {
    if (i < 0 || i >= qs.length) return;
    stop();
    setIdx(i);
  };

  async function upload(questionId: string, blob: Blob, fileName: string, kind: "audio" | "image", extra?: Partial<FileState>) {
    setBusy(questionId);
    setError(null);
    const ticket = await requestStudentUploadAction({ assignmentId: assignment.id, kind, fileName, size: blob.size });
    if (!ticket.ok) {
      setBusy(null);
      setError(ticket.message);
      return;
    }
    const put = await fetch(ticket.data.url, { method: "PUT", body: blob, headers: { "Content-Type": blob.type || "application/octet-stream" } }).catch(() => null);
    setBusy(null);
    if (!put?.ok) {
      setError("Chưa tải file lên được. Con kiểm tra mạng rồi thử lại nhé.");
      return;
    }
    setFiles((f) => ({ ...f, [questionId]: { key: ticket.data.key, previewUrl: URL.createObjectURL(blob), ...extra } }));
  }

  const timeText = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const isLast = idx === qs.length - 1;
  const leftCount = qs.length - answeredCount;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="outline" size="icon" aria-label="Thoát" onClick={() => setConfirm("quit")} className="rounded-full">
          <X className="size-5" />
        </Button>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full border border-line bg-surface" aria-hidden>
          <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${(answeredCount / qs.length) * 100}%` }} />
        </div>
        {deadline > 0 && (
          <span className={cn("min-w-[88px] rounded-full border px-3 py-1 text-center font-display text-lg font-bold tabular-nums", left <= 60 ? "border-primary bg-primary text-on-primary" : "border-line bg-surface")}>
            ⏱ {timeText}
          </span>
        )}
      </div>

      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

      <div className="rounded-[28px] border border-line bg-surface p-5 shadow-card sm:p-8">
        <p className="text-sm font-bold text-primary">
          Câu {idx + 1}/{qs.length} · <span aria-hidden>{QUESTION_TYPE_ICON[q.type]}</span> {QUESTION_TYPE_LABEL[q.type]}
        </p>

        {q.type !== "FILL" && <h2 className="mt-1 mb-5 font-display text-2xl font-bold leading-tight sm:text-3xl">{q.prompt}</h2>}

        {(q.type === "MCQ" || q.type === "PICTURE" || q.type === "LISTEN") && (
          <>
            {q.type === "PICTURE" && (
              <div className="mb-5 text-center text-[7rem] leading-none">
                <QuestionPicture image={q.image} imageUrl={q.imageUrl} />
              </div>
            )}
            {q.type === "LISTEN" && (
              <ListenControls q={q} say={say} playing={playing} />
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {q.options!.map((o, i) => {
                const sel = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAnswer(q.id, i)}
                    aria-pressed={sel}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-lg font-semibold shadow-[0_4px_0] transition active:translate-y-0.5",
                      sel ? "border-info bg-surface-info text-foreground shadow-info" : "border-line bg-surface shadow-line hover:border-line-strong",
                    )}
                  >
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border-2 text-sm", sel ? "border-info bg-info text-on-primary" : "border-line text-muted")}>
                      {"ABCDEF"[i]}
                    </span>
                    {o}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {q.type === "FILL" && (
          <>
            <p className="mb-3 text-sm text-muted">Gõ từ còn thiếu vào ô trống</p>
            <p className="font-display text-2xl font-semibold leading-[2.4] sm:text-3xl">
              {q.prompt.split("___")[0]}
              <input
                key={q.id}
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-label="Từ còn thiếu"
                value={String(answers[q.id] ?? "")}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isLast && go(idx + 1)}
                className="mx-1 w-40 rounded-t-lg border-0 border-b-4 border-info bg-surface-info px-2 text-center text-info outline-none focus:bg-blue-50"
              />
              {q.prompt.split("___").slice(1).join("___")}
            </p>
          </>
        )}

        {q.type === "ORDER" && <OrderQuestion key={q.id} q={q} value={(answers[q.id] as string[]) ?? []} onChange={(v) => setAnswer(q.id, v.length ? v : undefined)} />}

        {q.type === "MATCH" && <MatchQuestion key={q.id} q={q} value={(answers[q.id] as Record<number, number>) ?? {}} onChange={(v) => setAnswer(q.id, v)} />}

        {q.type === "SPEAK" && (
          <SpeakQuestion
            key={q.id}
            q={q}
            file={files[q.id]}
            busy={busy === q.id}
            say={say}
            onRecorded={(blob, duration) => upload(q.id, blob, `bai-noi.${blob.type.includes("mp4") ? "m4a" : "webm"}`, "audio", { duration })}
            onError={setError}
          />
        )}

        {q.type === "WRITE" && (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-note">Con gõ bài viết ở đây</span>
              <Textarea
                rows={6}
                spellCheck={false}
                value={(answers[q.id] as { text?: string })?.text ?? ""}
                onChange={(e) => setAnswer(q.id, { text: e.target.value })}
                className="text-lg"
              />
              <span className="mt-1 block text-xs text-muted">
                {(((answers[q.id] as { text?: string })?.text ?? "").match(/[A-Za-zÀ-ỹ']+/g) ?? []).length} từ
              </span>
            </label>
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-line p-5 text-center text-sm text-text-secondary hover:border-info">
              {busy === q.id ? <LoaderCircle className="mx-auto size-6 animate-spin" /> : <Camera className="mx-auto size-6" />}
              <b className="mt-1 block">Hoặc chụp ảnh bài viết trong vở</b>
              <span className="text-muted">Bấm để chụp / chọn ảnh</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const blob = await compressImage(f);
                    await upload(q.id, blob, "bai-viet.jpg", "image");
                  } catch {
                    setError("Không đọc được ảnh này, con chụp lại nhé.");
                  }
                }}
              />
              {files[q.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={files[q.id].previewUrl} alt="Ảnh bài viết" className="mx-auto mt-3 max-h-64 rounded-control" />
              )}
            </label>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => go(idx - 1)} disabled={idx === 0}>Câu trước</Button>
        <div className="hidden flex-wrap justify-center gap-1.5 sm:flex">
          {qs.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Câu ${i + 1}`}
              aria-current={i === idx ? "step" : undefined}
              className={cn(
                "size-8 rounded-full border-2 text-xs font-bold",
                isAnswered(x) ? "border-info bg-info text-on-primary" : "border-line bg-surface text-muted",
                i === idx && "ring-2 ring-foreground ring-offset-2",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {isLast ? (
          <Button onClick={() => setConfirm("submit")} disabled={pending || Boolean(busy)} className="bg-success hover:bg-success/90">
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            Nộp bài
          </Button>
        ) : (
          <Button onClick={() => go(idx + 1)}>Câu tiếp</Button>
        )}
      </div>

      {confirm === "submit" && (
        <Dialog
          size="sm"
          title={leftCount ? `Con còn ${leftCount} câu chưa làm` : "Nộp bài nhé?"}
          onClose={() => setConfirm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirm(null)}>Xem lại</Button>
              <Button onClick={() => submit(false)} disabled={pending}>Nộp bài</Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary">
            {leftCount ? "Câu bỏ trống sẽ không được điểm. Con có muốn quay lại làm nốt không?" : "Con đã làm hết các câu. Kiểm tra lại hoặc nộp bài luôn."}
          </p>
        </Dialog>
      )}
      {confirm === "quit" && (
        <Dialog
          size="sm"
          title="Thoát bài làm?"
          onClose={() => setConfirm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { submitted.current = true; router.push("/hoc-tap"); }}>Thoát</Button>
              <Button onClick={() => setConfirm(null)}>Làm tiếp</Button>
            </div>
          }
        >
          <p className="text-sm text-text-secondary">Bài làm chưa nộp sẽ không được lưu.</p>
        </Dialog>
      )}
    </div>
  );
}

function ListenControls({ q, say, playing }: { q: PlayerQuestion; say: (t: string, r?: number, tag?: string) => boolean; playing: string | null }) {
  const audio = useRef<HTMLAudioElement>(null);
  const play = (rate: number, tag: string) => {
    if (q.audioUrl && audio.current) {
      audio.current.playbackRate = rate < 0.8 ? 0.75 : 1;
      audio.current.currentTime = 0;
      void audio.current.play();
      return;
    }
    say(q.audioText ?? "", rate, tag);
  };
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4">
      {q.audioUrl && <audio ref={audio} src={q.audioUrl} preload="auto" />}
      <button
        type="button"
        onClick={() => play(0.9, "normal")}
        aria-label="Nghe"
        className={cn("grid size-20 place-items-center rounded-full bg-info text-on-primary shadow-[0_5px_0] shadow-blue-700", playing === "normal" && "animate-pulse")}
      >
        <Volume2 className="size-9" />
      </button>
      <button
        type="button"
        onClick={() => play(0.6, "slow")}
        aria-label="Nghe chậm"
        className={cn("grid size-14 place-items-center rounded-full bg-surface-info text-2xl", playing === "slow" && "animate-pulse")}
      >
        🐢
      </button>
      <p className="text-sm text-muted">Bấm loa để nghe, 🐢 để nghe chậm.<br />Con nghe được nhiều lần.</p>
    </div>
  );
}

function OrderQuestion({ q, value, onChange }: { q: PlayerQuestion; value: string[]; onChange: (v: string[]) => void }) {
  // Dựng lại thứ tự bé đã chọn khi quay lại câu này (từ trùng nhau thì lấy ô chưa dùng).
  const [picked, setPicked] = useState<number[]>(() => {
    const used: number[] = [];
    for (const w of value) {
      const i = q.words!.findIndex((x, j) => x.w === w && !used.includes(j));
      if (i >= 0) used.push(i);
    }
    return used;
  });
  const sync = (next: number[]) => {
    setPicked(next);
    onChange(next.map((i) => q.words![i].w));
  };
  return (
    <>
      <div className="mb-5 flex min-h-[72px] flex-wrap gap-2.5 border-b-2 border-dashed border-line pb-3" aria-label="Câu của con">
        {picked.length ? (
          picked.map((i, k) => (
            <button key={k} type="button" onClick={() => sync(picked.filter((_, j) => j !== k))} className="rounded-xl border-2 border-info bg-surface-info px-4 py-2 text-lg font-semibold shadow-[0_3px_0] shadow-info">
              {q.words![i].w}
            </button>
          ))
        ) : (
          <span className="self-center text-sm text-muted">Bấm vào các từ bên dưới theo đúng thứ tự…</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {q.words!.map((x, i) => (
          <button
            key={i}
            type="button"
            onClick={() => sync([...picked, i])}
            className={cn("rounded-xl border-2 border-line bg-surface px-4 py-2 text-lg font-semibold shadow-[0_3px_0] shadow-line", picked.includes(i) && "invisible")}
          >
            {x.w}
          </button>
        ))}
      </div>
    </>
  );
}

function MatchQuestion({ q, value, onChange }: { q: PlayerQuestion; value: Record<number, number>; onChange: (v: Record<number, number>) => void }) {
  const [active, setActive] = useState<number | null>(null);
  const owner = useMemo(() => Object.fromEntries(Object.entries(value).map(([l, r]) => [r, Number(l)])) as Record<number, number>, [value]);
  const set = (next: Record<number, number>) => onChange({ ...next });

  return (
    <>
      <p className="mb-3 text-sm text-muted">Bấm một hình bên trái, rồi bấm từ đúng bên phải.</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        <div className="space-y-3">
          {q.left!.map((l, i) => {
            const paired = value[i] !== undefined;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (paired) {
                    const next = { ...value };
                    delete next[i];
                    set(next);
                    setActive(i);
                  } else setActive(active === i ? null : i);
                }}
                style={paired ? { borderColor: PAIR_COLORS[i % 6], background: `${PAIR_COLORS[i % 6]}1f` } : undefined}
                className={cn("relative flex min-h-16 w-full items-center justify-center rounded-2xl border-2 bg-surface text-4xl", active === i ? "border-info bg-surface-info" : "border-line")}
              >
                {l}
                {paired && <span className="absolute right-2 top-1 text-xs font-extrabold" style={{ color: PAIR_COLORS[i % 6] }}>{i + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {q.right!.map((r) => {
            const o = owner[r.i];
            return (
              <button
                key={r.i}
                type="button"
                onClick={() => {
                  if (active === null) {
                    if (o !== undefined) {
                      const next = { ...value };
                      delete next[o];
                      set(next);
                    }
                    return;
                  }
                  const next = { ...value };
                  for (const k of Object.keys(next)) if (next[Number(k)] === r.i) delete next[Number(k)];
                  next[active] = r.i;
                  set(next);
                  setActive(null);
                }}
                style={o !== undefined ? { borderColor: PAIR_COLORS[o % 6], background: `${PAIR_COLORS[o % 6]}1f` } : undefined}
                className="relative flex min-h-16 w-full items-center justify-center rounded-2xl border-2 border-line bg-surface text-lg font-bold"
              >
                {r.w}
                {o !== undefined && <span className="absolute right-2 top-1 text-xs font-extrabold" style={{ color: PAIR_COLORS[o % 6] }}>{o + 1}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SpeakQuestion({
  q, file, busy, say, onRecorded, onError,
}: {
  q: PlayerQuestion;
  file?: FileState;
  busy: boolean;
  say: (t: string, r?: number, tag?: string) => boolean;
  onRecorded: (blob: Blob, duration: number) => void;
  onError: (m: string) => void;
}) {
  const rec = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => () => rec.current?.stream.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    if (!recording) return;
    const t0 = Date.now();
    const t = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      setSeconds(s);
      if (s >= 120) rec.current?.stop();
    }, 300);
    return () => clearInterval(t);
  }, [recording]);

  async function start() {
    if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      onError("Máy này chưa ghi âm được trên trình duyệt. Con chọn file ghi âm có sẵn ở bên dưới nhé.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Chưa có quyền dùng micro. Con bấm “Cho phép” khi trình duyệt hỏi, hoặc nhờ bố mẹ bật quyền micro.");
      return;
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    const t0 = Date.now();
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      onRecorded(new Blob(chunks, { type: r.mimeType || "audio/webm" }), Math.round((Date.now() - t0) / 1000));
    };
    rec.current = r;
    r.start();
    setSeconds(0);
    setRecording(true);
  }

  return (
    <div className="grid justify-items-center gap-4 text-center">
      <p className="w-full rounded-2xl bg-wood-50 px-5 py-4 text-xl font-semibold">{q.text}</p>
      <Button variant="outline" size="sm" onClick={() => say((q.text ?? "").replace(/^Gợi ý:\s*/, ""), 0.85, "model")}>
        <Volume2 className="size-4" /> Nghe mẫu
      </Button>
      <button
        type="button"
        onClick={() => (recording ? rec.current?.stop() : start())}
        disabled={busy}
        aria-label={recording ? "Dừng ghi âm" : "Bấm để ghi âm"}
        className={cn("grid size-24 place-items-center rounded-full bg-primary text-on-primary shadow-[0_5px_0] shadow-brand-800", recording && "animate-pulse")}
      >
        {busy ? <LoaderCircle className="size-10 animate-spin" /> : recording ? <Square className="size-9" /> : <Mic className="size-10" />}
      </button>
      <p className="text-sm text-muted">
        {recording ? `🔴 Đang ghi âm… ${seconds} giây (bấm lại để dừng)` : busy ? "Đang gửi bản ghi…" : file ? "Đã ghi xong! Con nghe lại, chưa ưng thì bấm micro để ghi lại." : "Bấm micro để bắt đầu ghi âm, bấm lần nữa để dừng."}
      </p>
      {file && <audio controls src={file.previewUrl} className="w-full max-w-md" />}
      <label className="cursor-pointer text-sm text-muted underline">
        Hoặc chọn file ghi âm có sẵn
        <input
          type="file"
          accept="audio/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onRecorded(f, 0);
          }}
        />
      </label>
    </div>
  );
}
