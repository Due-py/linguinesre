"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signInWithCode, signUp, updatePassword } from "@/app/(auth)/actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/form";

const linkClass = "font-bold text-brand-strong underline underline-offset-4 hover:text-ink";

export function LoginForm({ linkInvalid }: { linkInvalid?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      {linkInvalid && !state && (
        <FormMessage state={{ error: "Liên kết trong email đã hết hạn hoặc đã dùng rồi. Hãy đăng nhập hoặc yêu cầu liên kết mới." }} />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" state={state} />
      <Field label="Mật khẩu" name="password" type="password" autoComplete="current-password" state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang đăng nhập…">Đăng nhập</SubmitButton>
      <p className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-sm">
        <Link href="/forgot-password" className={linkClass}>
          Quên mật khẩu?
        </Link>
        <span className="text-muted">
          Chưa có tài khoản?{" "}
          <Link href="/signup" className={linkClass}>
            Đăng ký
          </Link>
        </span>
      </p>
    </form>
  );
}

/** Học sinh có phiếu đăng nhập (mã HS + PIN) của nhóm nghiên cứu. Tài khoản email dùng tab "Email" (LoginForm). */
export function CodeLoginForm() {
  const [state, action] = useActionState<FormState, FormData>(signInWithCode, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field
        label="Mã học sinh"
        name="code"
        autoComplete="username"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="HS008"
        state={state}
      />
      <Field
        label="PIN"
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={6}
        hint="6 chữ số in trên phiếu đăng nhập của bạn."
        state={state}
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang đăng nhập…">Đăng nhập</SubmitButton>
      <p className="text-sm text-muted">Quên PIN? Báo nhóm nghiên cứu để được cấp lại.</p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState<FormState, FormData>(signUp, null);
  if (state?.notice) {
    return (
      <div className="grid gap-5">
        <FormMessage state={state} />
        <p className="text-sm text-muted">
          Không thấy thư? Kiểm tra mục thư rác, hoặc{" "}
          <Link href="/signup" className={linkClass}>
            thử lại với email khác
          </Link>
          .
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" state={state} />
      <Field
        label="Mật khẩu"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="Ít nhất 8 ký tự."
        state={state}
      />
      <Field label="Nhập lại mật khẩu" name="confirm" type="password" autoComplete="new-password" state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang tạo tài khoản…">Tạo tài khoản</SubmitButton>
      <p className="text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href="/login" className={linkClass}>
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState<FormState, FormData>(requestPasswordReset, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Email đã đăng ký" name="email" type="email" autoComplete="email" inputMode="email" state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang gửi…">Gửi liên kết đặt lại</SubmitButton>
      <p className="text-sm">
        <Link href="/login" className={linkClass}>
          Quay lại đăng nhập
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState<FormState, FormData>(updatePassword, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      <Field label="Mật khẩu mới" name="password" type="password" autoComplete="new-password" hint="Ít nhất 8 ký tự." state={state} />
      <Field label="Nhập lại mật khẩu mới" name="confirm" type="password" autoComplete="new-password" state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang lưu…">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
