"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PIN_LENGTH } from "@/lib/auth/pin";
import { login, register, type AuthFormState } from "./actions";

const inputClass =
  "rounded-2xl border border-line bg-background px-4 py-3 text-base disabled:opacity-60";

export function AuthForm({ mode, configured }: { mode: "register" | "login"; configured: boolean }) {
  const isRegister = mode === "register";
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(isRegister ? register : login, {});
  const disabled = pending || !configured;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-3xl bg-surface p-6">
      {!configured && (
        <p className="rounded-2xl bg-level-2 p-4 text-sm">
          Web chưa được kết nối với cơ sở dữ liệu nên tạm thời chưa {isRegister ? "đăng ký" : "đăng nhập"} được.
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Mã lớp</span>
        <input
          name="classCode"
          required
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Ví dụ: 8A1-XK7Q"
          defaultValue={state.fields?.classCode}
          disabled={disabled}
          className={`${inputClass} uppercase`}
        />
        <span className="text-xs text-muted">Thầy cô sẽ đưa mã lớp cho bạn.</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Biệt danh</span>
        <input
          name="nickname"
          required
          minLength={2}
          maxLength={20}
          autoComplete="username"
          placeholder="Ví dụ: Mèo Con"
          defaultValue={state.fields?.nickname}
          disabled={disabled}
          className={inputClass}
        />
        {isRegister && <span className="text-xs text-muted">Đừng dùng họ tên thật. 2–20 ký tự.</span>}
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">PIN ({PIN_LENGTH} chữ số)</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern={`\\d{${PIN_LENGTH}}`}
          minLength={PIN_LENGTH}
          maxLength={PIN_LENGTH}
          required
          autoComplete={isRegister ? "new-password" : "current-password"}
          disabled={disabled}
          className={`${inputClass} tracking-[0.5em]`}
        />
      </label>

      {isRegister && (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Nhập lại PIN</span>
          <input
            name="pinConfirm"
            type="password"
            inputMode="numeric"
            pattern={`\\d{${PIN_LENGTH}}`}
            minLength={PIN_LENGTH}
            maxLength={PIN_LENGTH}
            required
            autoComplete="new-password"
            disabled={disabled}
            className={`${inputClass} tracking-[0.5em]`}
          />
          <span className="text-xs text-muted">Nhớ PIN nhé. Quên PIN thì nhờ thầy cô đặt lại.</span>
        </label>
      )}

      {state.error && (
        <p role="alert" className="rounded-2xl bg-level-2 p-4 text-sm font-semibold">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="rounded-full bg-accent px-6 py-3 font-bold text-accent-ink disabled:opacity-60"
      >
        {pending ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
      </button>

      <p className="text-center text-sm text-muted">
        {isRegister ? (
          <>
            Đã có tài khoản?{" "}
            <Link href="/dang-nhap" className="font-semibold text-foreground underline">
              Đăng nhập
            </Link>
          </>
        ) : (
          <>
            Chưa có tài khoản?{" "}
            <Link href="/dang-ky" className="font-semibold text-foreground underline">
              Đăng ký bằng mã lớp
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
