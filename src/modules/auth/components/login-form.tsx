"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react";
import { Alert, Button, Input, Label } from "@/components/ui";
import { loginAction, type LoginState } from "@/modules/auth/auth.actions";

const initialState: LoginState = { error: null };

/** Tài khoản dùng thử — chỉ hiện khi máy chủ bật DEMO_ACCOUNTS (xem login-workspace). */
export type DemoAccount = { label: string; login: string };

type Props = {
  callbackUrl?: string;
  demoAccounts?: DemoAccount[];
  demoPassword?: string;
};

export function LoginForm({ callbackUrl, demoAccounts, demoPassword }: Props) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  // Controlled để nút "dùng thử" điền sẵn được, và React 19 không xóa ô sau khi gửi.
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-5">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      {state.error && (
        <Alert variant="danger" className="flex items-start gap-2.5 px-3.5 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="login" className="block text-sm font-medium text-foreground">
          Tên đăng nhập
        </Label>
        <Input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Mã học viên, SĐT phụ huynh hoặc tên nhân sự"
          className="px-3.5 py-2.5"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="block text-sm font-medium text-foreground">
          Mật khẩu
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3.5 py-2.5 pr-11"
          />
          <Button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            variant="ghost"
            size="icon-sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
      </div>

      <Button type="submit" disabled={pending} size="lg" className="w-full">
        {pending && <LoaderCircle className="size-4 animate-spin" />}
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </Button>

      {demoAccounts && demoAccounts.length > 0 && demoPassword && (
        <div className="rounded-control border border-wood-200 bg-wood-50 p-3.5">
          <p className="text-sm font-semibold text-foreground">Tài khoản dùng thử</p>
          <p className="mt-0.5 text-xs text-muted">Bấm để điền sẵn rồi bấm Đăng nhập.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {demoAccounts.map((a) => (
              <button
                key={a.login}
                type="button"
                onClick={() => {
                  setLogin(a.login);
                  setPassword(demoPassword);
                }}
                className="rounded-control border border-line bg-surface px-2 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-surface-raised"
              >
                <span className="font-semibold text-foreground">
                  {a.label}
                </span>
                <span className="block text-xs text-muted">{a.login}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
