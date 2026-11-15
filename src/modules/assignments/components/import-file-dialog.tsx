"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";
import { Alert, Button, Checkbox, ChoiceLabel, Dialog, FormField, Input } from "@/components/ui";
import { createImportRequestAction, requestUploadAction } from "@/modules/assignments/assignments.actions";

type ClassOption = { id: string; name: string; campus: string };

/** Gửi file đề Word/PDF của trung tâm để học vụ nhập thành bài tập (câu 2). */
export function ImportFileButton({ classes }: { classes: ClassOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      setError(null);
      if (!files.length) return setError("Chọn file đề trước nhé.");
      if (!classIds.length) return setError("Chọn ít nhất một lớp.");
      const keys: string[] = [];
      for (const f of files) {
        const t = await requestUploadAction({ purpose: "import-file", fileName: f.name, contentType: f.type, size: f.size });
        if (!t.ok) return setError(t.message);
        const put = await fetch(t.data.url, { method: "PUT", body: f }).catch(() => null);
        if (!put?.ok) return setError(`Không tải lên được file ${f.name}.`);
        keys.push(t.data.key);
      }
      const r = await createImportRequestAction({ fileKeys: keys, fileNames: files.map((f) => f.name), classIds, note });
      if (!r.ok) return setError(r.message);
      setOpen(false);
      setFiles([]);
      setClassIds([]);
      setNote("");
      router.refresh();
    });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileUp className="size-4" /> Gửi file Word/PDF để nhập
      </Button>
      {open && (
        <Dialog
          title="Gửi file đề để nhập bài"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
              <Button onClick={send} disabled={pending}>
                {pending && <LoaderCircle className="size-4 animate-spin" />} Gửi cho học vụ
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Học vụ sẽ nhập file thành bài tập trên web (nghe, chọn đáp án, điền từ…) rồi giao cho lớp.
            </p>
            {error && <Alert variant="danger">{error}</Alert>}
            <FormField label="File đề (Word, PDF, ảnh, file nghe)" required>
              <Input type="file" multiple accept=".doc,.docx,.pdf,image/*,audio/*" onChange={(e) => setFiles([...(e.target.files ?? [])])} />
            </FormField>
            <FormField label="Giao cho lớp" required>
              <div className="flex flex-wrap gap-1">
                {classes.map((c) => (
                  <ChoiceLabel key={c.id} className="border border-line">
                    <Checkbox
                      checked={classIds.includes(c.id)}
                      onChange={(e) => setClassIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id)))}
                    />
                    {c.name} <span className="text-xs text-muted">{c.campus}</span>
                  </ChoiceLabel>
                ))}
              </div>
            </FormField>
            <FormField label="Ghi chú cho học vụ">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="VD: hạn nộp thứ 6, cho làm 2 lần, 20 phút" />
            </FormField>
          </div>
        </Dialog>
      )}
    </>
  );
}
