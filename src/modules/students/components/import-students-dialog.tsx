"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LoaderCircle } from "lucide-react";
import { Alert, Badge, Button, Dialog, FormField, Input, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui";
import { importStudentsAction, previewStudentImportAction, type PreviewRow } from "@/modules/students/students.actions";

/** Nhập danh sách học viên có sẵn của trung tâm (câu 7): chọn file → xem trước → nhập. */
export function ImportStudentsButton({ classes }: { classes: { id: string; name: string; campus: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [defaultClassId, setDefault] = useState(classes[0]?.id ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const template = () => {
    const csv = "﻿Họ tên,Lớp,Tên phụ huynh,SĐT phụ huynh\r\nNguyễn Văn An," + (classes[0]?.name ?? "Starters 1A") + ",Nguyễn Thị Hoa,0912000111\r\nTrần Bảo Châu," + (classes[0]?.name ?? "Starters 1A") + ",Trần Văn Nam,0988000222\r\n";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "mau-danh-sach-hoc-vien.csv";
    a.click();
  };
  const unmatched = rows.filter((r) => !r.classId).length;

  return (
    <>
      <Button onClick={() => { setOpen(true); setRows([]); setMsg(null); }}><FileSpreadsheet className="size-4" /> Nhập từ Excel</Button>
      {open && (
        <Dialog
          title="Nhập danh sách học viên"
          size="lg"
          onClose={() => setOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
              <Button
                disabled={!rows.length || pending}
                onClick={() =>
                  start(async () => {
                    const r = await importStudentsAction({ defaultClassId, rows });
                    if (!r.ok) return setMsg({ ok: false, text: r.message });
                    setMsg({ ok: true, text: `Đã nhập ${r.data.count} học viên. Mỗi bé có mã đăng nhập riêng, phụ huynh đăng nhập bằng SĐT, mật khẩu ban đầu 123456.` });
                    setRows([]);
                    router.refresh();
                  })
                }
              >
                {pending && <LoaderCircle className="size-4 animate-spin" />} Nhập {rows.length || ""} học viên
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-muted">
              File .xlsx hoặc .csv, dòng đầu là tiêu đề cột: <b>Họ tên</b>, <b>Lớp</b>, <b>Tên phụ huynh</b>, <b>SĐT phụ huynh</b>.{" "}
              <button type="button" onClick={template} className="text-link underline">Tải file mẫu</button>
            </p>
            {msg && <Alert variant={msg.ok ? "success" : "danger"}>{msg.text}</Alert>}
            <FormField label="File danh sách">
              <Input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const fd = new FormData();
                  fd.set("file", f);
                  start(async () => {
                    setMsg(null);
                    const r = await previewStudentImportAction(fd);
                    if (!r.ok) { setRows([]); return setMsg({ ok: false, text: r.message }); }
                    setRows(r.data.rows);
                  });
                }}
              />
            </FormField>
            <FormField label="Lớp mặc định" hint="Dùng khi file không có cột Lớp hoặc tên lớp không khớp">
              <Select value={defaultClassId} onChange={(e) => setDefault(e.target.value)}>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.campus}</option>)}
              </Select>
            </FormField>
            {rows.length > 0 && (
              <>
                <Alert variant="info">Đọc được <b>{rows.length}</b> học viên.{unmatched ? ` ${unmatched} bé chưa khớp tên lớp sẽ vào lớp mặc định.` : ""}</Alert>
                <TableContainer className="max-h-72">
                  <Table>
                    <TableHeader><TableRow><TableHead>Họ tên</TableHead><TableHead>Lớp</TableHead><TableHead>Phụ huynh</TableHead><TableHead>SĐT</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {rows.slice(0, 100).map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>{r.fullName}</TableCell>
                          <TableCell>{r.classId ? classes.find((c) => c.id === r.classId)?.name : <Badge variant="warning">{r.className || "–"} → mặc định</Badge>}</TableCell>
                          <TableCell>{r.parentName}</TableCell>
                          <TableCell>{r.parentPhone}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
