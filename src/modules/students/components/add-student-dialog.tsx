"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Alert, Button, Dialog, FormField, Input, Select } from "@/components/ui";
import { createStudentAction, type StudentFormState } from "@/modules/students/students.actions";

export function AddStudentButton({ classes }: { classes: { id: string; name: string; campus: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createStudentAction, { error: null } as StudentFormState);
  useEffect(() => {
    if (state.created) router.refresh();
  }, [state.created, router]);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><UserPlus className="size-4" /> Thêm học viên</Button>
      {open && (
        <Dialog title="Thêm học viên" onClose={() => setOpen(false)} size="sm">
          <form action={action} className="space-y-4">
            {state.error && <Alert variant="danger">{state.error}</Alert>}
            {state.created && (
              <Alert variant="success">
                Đã thêm <b>{state.created.fullName}</b>. Tài khoản đăng nhập của bé: <b>{state.created.code}</b>, mật khẩu ban đầu <b>123456</b>.
              </Alert>
            )}
            <FormField label="Họ tên học viên" required><Input name="fullName" required /></FormField>
            <FormField label="Lớp" required>
              <Select name="classId" required>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} – {c.campus}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tên phụ huynh"><Input name="parentName" /></FormField>
              <FormField label="SĐT phụ huynh" hint="Phụ huynh đăng nhập bằng số này"><Input name="parentPhone" inputMode="tel" /></FormField>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Đóng</Button>
              <Button type="submit" disabled={pending}>Thêm</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
