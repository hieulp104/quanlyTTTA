"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Card } from "@/components/ui";
import { QUESTION_TYPE_LABEL } from "@/common/enums";
import type { PlayerQuestion } from "@/modules/study/study.service";
import { Player } from "@/modules/study/components/player";

type Props = {
  assignment: {
    id: string;
    title: string;
    note: string | null;
    timeLimitMin: number;
    maxAttempts: number;
    attempts: number;
    questions: PlayerQuestion[];
  };
};

/** Màn dặn dò trước khi làm — đồng hồ chỉ bắt đầu chạy khi bé bấm "Bắt đầu". */
export function PlayerGate({ assignment: a }: Props) {
  const [started, setStarted] = useState(false);
  if (started) return <Player assignment={a} />;

  const types = [...new Set(a.questions.map((q) => q.type))];
  const hasAudio = types.includes("LISTEN") || types.includes("SPEAK");

  return (
    <Card className="mx-auto max-w-xl p-8 text-center">
      <p className="text-6xl" aria-hidden>📒</p>
      <h1 className="mt-3 font-display text-h1 font-extrabold">{a.title}</h1>
      {a.note && <Alert variant="warning" className="mt-4 text-left">💬 Cô dặn: {a.note}</Alert>}
      <ul className="mx-auto mt-5 inline-grid gap-2 text-left text-text-secondary">
        <li>📝 {a.questions.length} câu: {types.map((t) => QUESTION_TYPE_LABEL[t].toLowerCase()).join(", ")}</li>
        <li>⏱ {a.timeLimitMin ? `Thời gian: ${a.timeLimitMin} phút, hết giờ bài tự nộp` : "Không giới hạn thời gian"}</li>
        <li>🔁 {a.maxAttempts ? `Được làm ${a.maxAttempts} lần (con đã làm ${a.attempts} lần)` : "Được làm lại nhiều lần"}</li>
        {hasAudio && <li>🎧 Có bài nghe / ghi âm: con nhớ bật loa hoặc đeo tai nghe</li>}
      </ul>
      <div className="mt-7">
        <Button size="xl" onClick={() => setStarted(true)}>Bắt đầu làm bài</Button>
      </div>
      <p className="mt-4 text-sm"><Link href="/hoc-tap" className="text-muted hover:underline">Để sau</Link></p>
    </Card>
  );
}
