"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle } from "lucide-react";
import type { FormState } from "@/lib/form";

export const inputClass =
  "h-14 w-full rounded-xl border border-line-strong bg-surface px-4 text-base text-ink placeholder:text-muted transition-colors hover:border-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger";

/** Ô nhập có nhãn, gợi ý và lỗi gắn đúng bằng aria (trình đọc màn hình đọc được). */
export function Field({
  label,
  name,
  state,
  hint,
  className = "",
  ...props
}: { label: string; name: string; state: FormState; hint?: string } & Omit<ComponentProps<"input">, "name">) {
  const id = useId();
  const error = state?.fields?.[name];
  const defaultValue = props.type === "password" ? undefined : state?.values?.[name];
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...props}
        className={`${inputClass} ${className}`}
      />
      {error ? (
        <p id={`${id}-err`} className="flex items-start gap-1.5 text-sm font-semibold text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Lỗi chung hoặc thông báo thành công của cả biểu mẫu. Có biểu tượng + chữ, không chỉ màu. */
export function FormMessage({ state }: { state: FormState }) {
  if (state?.error)
    return (
      <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
        <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        {state.error}
      </p>
    );
  if (state?.notice)
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-strong">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        {state.notice}
      </p>
    );
  return null;
}

/** Nút gửi: tự biết đang xử lý, khóa lại để không gửi hai lần. */
export function SubmitButton({
  children,
  pendingLabel = "Đang xử lý…",
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "quiet";
  className?: string;
}) {
  const { pending } = useFormStatus();
  // app:… là kiểu nút Google (viên thuốc, lún nhẹ khi bấm) ngoài trang nghiên cứu; phần còn lại giữ như cũ cho .theme-classic.
  const styles =
    variant === "primary"
      ? "bg-brand text-on-brand shadow-button hover:bg-brand-strong app:hover:shadow-card"
      : "border border-line-strong bg-surface text-ink hover:bg-sunken app:border-line app:text-brand app:hover:bg-brand-soft";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-bold transition-colors disabled:cursor-wait disabled:opacity-70 app:font-medium app:press ${styles} ${className}`}
    >
      {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </button>
  );
}

/**
 * Ô mật khẩu có nút con mắt để xem mình đã gõ gì (thay cho ô "nhập lại mật khẩu"). Nút là button thật, có nhãn đổi theo
 * trạng thái và aria-pressed, cao 44px để dễ bấm trên điện thoại.
 */
export function PasswordField({ label, name, state, hint, ...props }: { label: string; name: string; state: FormState; hint?: string } & Omit<ComponentProps<"input">, "name" | "type">) {
  const id = useId();
  const [shown, setShown] = useState(false);
  const error = state?.fields?.[name];
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          {...props}
          className={`${inputClass} pr-14`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-pressed={shown}
          aria-controls={id}
          aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute inset-y-0 right-1 my-auto grid size-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink"
        >
          {shown ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} className="flex items-start gap-1.5 text-sm font-semibold text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
