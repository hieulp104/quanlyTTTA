"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Ba câu mẫu dạng "nhìn hình chọn từ" — hình là nội dung câu hỏi nên dùng emoji thay ảnh. */
const QUESTIONS = [
  { ask: "Đây là con gì?", picture: "🐘", label: "con voi", answer: "elephant", options: ["elephant", "monkey", "tiger", "rabbit"] },
  { ask: "Đây là quả gì?", picture: "🍎", label: "quả táo", answer: "apple", options: ["banana", "apple", "orange", "grape"] },
  { ask: "Đây là xe gì?", picture: "🚌", label: "xe buýt", answer: "bus", options: ["car", "train", "bike", "bus"] },
] as const;

/**
 * Điện thoại ở trang giới thiệu: bố mẹ bấm thử vài câu như các con làm bài.
 * Chỉ là minh họa, không gọi server.
 */
export function PhoneDemo() {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const q = QUESTIONS[step];
  const correct = !!q && picked === q.answer;

  // Trả lời đúng thì tự sang câu sau.
  useEffect(() => {
    if (!correct) return;
    const t = setTimeout(() => {
      setStep((s) => s + 1);
      setPicked(null);
    }, 1100);
    return () => clearTimeout(t);
  }, [correct]);

  const pick = (word: string) => {
    if (correct) return;
    setPicked(word);
    if (word !== q.answer) setWrongCount((n) => n + 1);
  };

  const progress = Math.round(((step + (correct ? 1 : 0)) / QUESTIONS.length) * 100);

  return (
    <div className="relative mx-auto w-full max-w-[340px]">
      <span className="gs-wiggle absolute -left-3 -top-5 z-10 rounded-2xl rounded-bl-sm bg-wood-300 px-4 py-2 font-display text-lg font-bold text-[#1f2544] shadow-md sm:-left-10">
        Bố mẹ bấm thử xem!
      </span>
      <div className="-rotate-2 rounded-[40px] bg-[#1f2544] p-3.5 shadow-2xl transition-[rotate] duration-300 hover:rotate-0 focus-within:rotate-0">
        <div className="flex min-h-[372px] flex-col rounded-[28px] bg-white p-4 text-[#1f2544]">
          <div className="mb-3 flex justify-between text-xs text-gray-500">
            <span>Unit 3 – Nhìn hình chọn từ</span>
            <span className="tabular-nums">{Math.min(step + 1, QUESTIONS.length)}/{QUESTIONS.length}</span>
          </div>
          <div className="mb-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <i className="block h-full rounded-full bg-green-600 transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>

          {q ? (
            <div key={step} className="gs-rise flex flex-1 flex-col">
              <p className="font-display text-xl font-bold">{q.ask}</p>
              <p className={cn("my-2 text-center text-7xl", correct && "gs-pop")} role="img" aria-label={q.label}>{q.picture}</p>
              <div className="grid grid-cols-2 gap-2.5">
                {q.options.map((w) => {
                  const isPicked = picked === w;
                  return (
                    <button
                      key={isPicked && !correct ? `${w}-${wrongCount}` : w}
                      type="button"
                      onClick={() => pick(w)}
                      aria-pressed={isPicked}
                      className={cn(
                        "rounded-2xl border-2 py-2.5 font-semibold transition-[border-color,background-color,translate] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:translate-y-0",
                        isPicked && correct && "border-green-600 bg-green-50",
                        isPicked && !correct && "gs-shake border-red-400 bg-red-50",
                        !isPicked && "border-gray-200 hover:border-gray-300",
                      )}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
              <p aria-live="polite" className="mt-3 min-h-[42px] text-sm font-semibold">
                {picked && (
                  <span key={`${picked}-${wrongCount}`} className={cn("gs-rise block rounded-2xl px-3 py-2.5", correct ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700")}>
                    {correct ? "Giỏi quá! Đúng rồi." : "Chưa đúng, thử lại nhé."}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div className="gs-rise flex flex-1 flex-col items-center justify-center text-center" aria-live="polite">
              <p className="gs-pop font-display text-6xl font-extrabold text-green-600">{QUESTIONS.length}/{QUESTIONS.length}</p>
              <p className="mt-2 font-display text-xl font-bold">Xong bài rồi!</p>
              <p className="mt-1 text-sm text-gray-500">Bài thật còn có nghe hiểu, nối từ, sắp xếp câu và ghi âm đọc to.</p>
              <button
                type="button"
                onClick={() => { setStep(0); setPicked(null); }}
                className="mt-4 rounded-full border-2 border-gray-200 px-4 py-2 text-sm font-semibold transition-colors hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Làm lại từ đầu
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
