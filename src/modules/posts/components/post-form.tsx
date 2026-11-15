"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, FormField, Input, Select, Textarea } from "@/components/ui";
import { nowMs } from "@/lib/utils";
import { POST_KIND_LABEL } from "@/common/enums";
import { createPostAction, type PostFormState } from "@/modules/posts/posts.actions";

export function PostForm({ campuses }: { campuses: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createPostAction, { error: null } as PostFormState);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.savedAt) form.current?.reset();
  }, [state.savedAt]);
  const nextWeek = new Date(nowMs() + 7 * 86_400_000).toISOString().slice(0, 10);

  return (
    <form ref={form} action={action} className="space-y-4">
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {state.savedAt && <Alert variant="success">Đã đăng. Trang chủ đã cập nhật.</Alert>}
      <FormField label="Loại">
        <Select name="kind" defaultValue="OPENING">
          {Object.entries(POST_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </FormField>
      <FormField label="Tiêu đề" required><Input name="title" required placeholder="VD: Khai giảng lớp Movers tháng 12" /></FormField>
      <FormField label="Ngày (khai giảng / sự kiện)"><Input type="date" name="eventDate" defaultValue={nextWeek} /></FormField>
      <FormField label="Cơ sở">
        <Select name="campusId" defaultValue="">
          <option value="">Cả 2 cơ sở</option>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </FormField>
      <FormField label="Mô tả ngắn"><Textarea name="body" rows={3} /></FormField>
      <Button type="submit" className="w-full" disabled={pending}>Đăng lên trang chủ</Button>
    </form>
  );
}
