"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { Alert, Button, Checkbox, FormField, Input, Select } from "@/components/ui";
import { submitLeadAction, type LeadFormState } from "@/modules/leads/leads.actions";
import { COURSE_OPTIONS } from "@/modules/landing/landing.content";

export function LeadForm({ campuses }: { campuses: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(submitLeadAction, { error: null } as LeadFormState);

  if (state.done) {
    return (
      <div className="gs-rise py-10 text-center" role="status">
        <h2 className="font-display text-3xl font-bold text-success">Đã gửi đăng ký</h2>
        <p className="mt-2 text-text-secondary">
          Cảm ơn {state.done.parentName}. Trung tâm sẽ gọi lại số {state.done.phone} trong vòng 24 giờ.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <h2 className="font-display text-3xl font-bold">Đăng ký học thử miễn phí</h2>
      <p className="-mt-2 text-sm text-muted">Trung tâm gọi lại cho bố mẹ trong vòng 24 giờ để hẹn lịch kiểm tra đầu vào.</p>
      {state.error && <Alert variant="danger">{state.error}</Alert>}
      {/* Ô bẫy chống spam — ẩn với người dùng thật */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Họ tên phụ huynh" required htmlFor="lf-name"><Input id="lf-name" name="parentName" autoComplete="name" required /></FormField>
        <FormField label="Số điện thoại" required htmlFor="lf-phone"><Input id="lf-phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="09xx xxx xxx" required /></FormField>
        <FormField label="Tuổi / lớp của con" htmlFor="lf-age"><Input id="lf-age" name="childAge" placeholder="VD: 7 tuổi, lớp 2" /></FormField>
        <FormField label="Cơ sở mong muốn" htmlFor="lf-campus">
          <Select id="lf-campus" name="campusId">{campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </FormField>
        <FormField label="Khóa học quan tâm" htmlFor="lf-course">
          <Select id="lf-course" name="course">{COURSE_OPTIONS.map((c) => <option key={c}>{c}</option>)}</Select>
        </FormField>
        <FormField label="Gọi lại lúc nào tiện?" htmlFor="lf-time">
          <Select id="lf-time" name="callTime"><option>Giờ hành chính</option><option>Buổi tối</option><option>Cuối tuần</option></Select>
        </FormField>
      </div>
      <FormField label="Bố mẹ muốn chia sẻ thêm" htmlFor="lf-note"><Input id="lf-note" name="note" placeholder="Trình độ hiện tại, mong muốn của bố mẹ…" /></FormField>
      <label className="flex items-start gap-2.5 text-sm text-text-secondary">
        <Checkbox name="agree" className="mt-1" />
        Tôi đồng ý để GoSpeak English dùng thông tin này để liên hệ tư vấn, theo chính sách bảo mật của trung tâm.
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <LoaderCircle className="size-4 animate-spin" />} Gửi đăng ký
      </Button>
    </form>
  );
}
