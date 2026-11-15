"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui";

export function StudentFilters({ classes, classId, q }: { classes: { id: string; name: string }[]; classId?: string; q?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const push = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.push(`/hoc-vien${p.size ? `?${p}` : ""}`);
  };
  return (
    <form
      className="mb-4 flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        push({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
      }}
    >
      <Select aria-label="Chọn lớp" value={classId ?? ""} onChange={(e) => push({ lop: e.target.value })} className="max-w-xs">
        <option value="">Tất cả lớp</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <Input name="q" defaultValue={q} placeholder="Tìm tên, mã HV, SĐT phụ huynh… (Enter)" className="max-w-sm" />
    </form>
  );
}
