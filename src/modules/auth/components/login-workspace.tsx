import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { Alert } from "@/components/ui";
import { BrandPanel } from "@/components/patterns/auth-brand-panel";
import { BrandMark } from "@/components/theme";
import { getCurrentUser, homePathFor } from "@/modules/auth/auth.service";
import { LoginForm, type DemoAccount } from "@/modules/auth/components/login-form";

export type LoginWorkspaceProps = {
  searchParams: Promise<{ callbackUrl?: string; "doi-mat-khau"?: string }>;
};

/**
 * Bản demo cho khách xem: mỗi vai trò đúng MỘT tài khoản. Bật bằng DEMO_ACCOUNTS=true
 * trong .env, bản thật tắt đi.
 */
const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: "Học viên", login: "hv001" },
  { label: "Phụ huynh", login: "0912345678" },
  { label: "Giáo viên", login: "cogiao" },
  { label: "Học vụ", login: "hocvu" },
  { label: "Quản lý", login: "admin" },
];

export async function LoginWorkspace({ searchParams }: LoginWorkspaceProps) {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user));

  const params = await searchParams;
  const justChangedPassword = params["doi-mat-khau"] === "thanh-cong";
  const demo = process.env.DEMO_ACCOUNTS === "true";

  return (
    <main className="relative flex min-h-screen overflow-hidden">
      <BrandPanel className="absolute inset-0 z-0 flex flex-col p-12">
        <div className="relative hidden lg:block">
          <Link href="/" className="flex items-center gap-4">
            <BrandMark size="lg" className="size-12 rounded-[14px] border-0 bg-white text-primary" />
            <p className="text-h2 font-bold leading-[1.2] tracking-tight text-on-primary">GoSpeak English</p>
          </Link>
        </div>
        <div className="relative my-auto hidden max-w-[560px] lg:block">
          <h1 className="text-display font-bold leading-tight text-on-primary">
            Hello! Hôm nay mình học gì nào?
          </h1>
          <p className="mt-6 max-w-[520px] text-base leading-relaxed text-on-primary/80">
            Học viên làm bài tập về nhà, giáo viên giao và chấm bài, phụ huynh xem điểm và
            nhận xét của con. Cả 2 cơ sở dùng chung một hệ thống.
          </p>
        </div>
      </BrandPanel>

      <div className="gospeak-login-form-panel relative z-10 ml-auto flex w-full flex-col justify-center">
        <div className="gospeak-login-form-card mx-auto w-full max-w-sm">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandMark size="lg" />
            <p className="text-base font-bold leading-none text-foreground">GoSpeak English</p>
          </Link>

          <h1 className="text-h1 font-bold tracking-tight text-foreground">Đăng nhập</h1>
          <p className="mt-2 text-sm text-muted">
            Học viên dùng mã học viên, phụ huynh dùng số điện thoại đã đăng ký với trung tâm.
          </p>

          {justChangedPassword && (
            <Alert variant="success" role="status" className="mt-6 flex items-start gap-2.5">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              <span>Đổi mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.</span>
            </Alert>
          )}

          <div className="mt-8">
            <LoginForm
              callbackUrl={params.callbackUrl}
              demoAccounts={demo ? DEMO_ACCOUNTS : undefined}
              demoPassword={demo ? process.env.DEMO_PASSWORD ?? "123456" : undefined}
            />
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-muted">
            Quên mật khẩu? Liên hệ giáo viên chủ nhiệm hoặc hotline trung tâm để được cấp lại.
            <br />
            <Link href="/" className="text-link hover:underline">Về trang giới thiệu</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
