"use client";

import { useState } from "react";
import { Button, Dialog, Textarea } from "@/components/ui";

/** Soạn sẵn tin nhắn nhắc bé chưa làm bài — cô dán vào nhóm Zalo lớp. */
export function RemindButton({ title, due, names }: { title: string; due: string; names: string[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const msg = `[GoSpeak English] Kính gửi phụ huynh, các bé sau chưa làm bài "${title}" (hạn ${due}):\n${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}\nBố mẹ nhắc con vào làm bài giúp cô nhé. Cảm ơn bố mẹ!`;
  const [text, setText] = useState(msg);

  return (
    <>
      <Button size="sm" onClick={() => { setText(msg); setCopied(false); setOpen(true); }}>Nhắc qua Zalo</Button>
      {open && (
        <Dialog
          title="Tin nhắn nhắc làm bài"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
              <Button onClick={async () => { await navigator.clipboard.writeText(text).catch(() => null); setCopied(true); }}>
                {copied ? "Đã sao chép ✓" : "Sao chép"}
              </Button>
            </div>
          }
        >
          <p className="mb-2 text-sm text-muted">Sao chép tin nhắn rồi dán vào nhóm Zalo của lớp.</p>
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} />
        </Dialog>
      )}
    </>
  );
}
