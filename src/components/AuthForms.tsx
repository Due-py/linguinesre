"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/app/(auth)/actions";
import { Field, FormMessage, PasswordField, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/form";

const linkClass = "font-medium text-brand underline-offset-4 hover:underline";

/**
 * Một biểu mẫu đăng nhập cho mọi người: email, tên tài khoản, hoặc mã học sinh + PIN của nhóm nghiên cứu.
 * Máy chủ tự nhận ra loại (lib/identity.ts), nên không còn hai tab.
 */
export function LoginForm({ linkInvalid }: { linkInvalid?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(signIn, null);
  return (
    <form action={action} className="grid gap-5" noValidate>
      {linkInvalid && !state && (
        <FormMessage state={{ error: "Liên kết trong email đã hết hạn hoặc đã dùng rồi. Hãy đăng nhập hoặc yêu cầu liên kết mới." }} />
      )}
      <Field
        label="Email, tên tài khoản hoặc mã học sinh"
        name="identifier"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        state={state}
      />
      <PasswordField label="Mật khẩu hoặc PIN" name="password" autoComplete="current-password" state={state} />
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
      <p className="rounded-2xl bg-tint px-4 py-3 text-sm text-muted">Học sinh có phiếu đăng nhập: nhập mã học sinh (như HS008) và PIN 6 số trên phiếu.</p>
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
      <Field
        label="Họ và tên"
        name="fullName"
        autoComplete="name"
        autoCapitalize="words"
        maxLength={40}
        hint="Tên thật, có dấu, ví dụ Nguyễn Minh Anh. Thầy cô trong lớp sẽ thấy tên này."
        state={state}
      />
      <Field
        label="Email hoặc tên tài khoản"
        name="identifier"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={80}
        hint="Không có email? Tự đặt một tên tài khoản không dấu, ví dụ minhanh_8a. Quên mật khẩu thì nhờ thầy cô đặt lại."
        state={state}
      />
      <PasswordField label="Mật khẩu" name="password" autoComplete="new-password" hint="Ít nhất 8 ký tự. Bấm hình con mắt để xem lại." state={state} />
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
      <PasswordField label="Mật khẩu mới" name="password" autoComplete="new-password" hint="Ít nhất 8 ký tự." state={state} />
      <Field label="Nhập lại mật khẩu mới" name="confirm" type="password" autoComplete="new-password" state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang lưu…">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
