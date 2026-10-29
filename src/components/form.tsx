"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import type { FormState } from "@/lib/form";

export const inputClass =
  "h-[52px] w-full rounded-xl border-2 border-line bg-surface px-4 text-base font-medium text-ink placeholder:text-muted/70 transition-colors hover:border-ink/40 focus:border-ink focus:outline-none aria-[invalid=true]:border-danger";

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
  const styles =
    variant === "primary"
      ? "bg-brand text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong"
      : "border-2 border-ink/80 bg-surface text-ink hover:bg-sunken";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-bold transition-colors disabled:cursor-wait disabled:opacity-70 ${styles} ${className}`}
    >
      {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </button>
  );
}
