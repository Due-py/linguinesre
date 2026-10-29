"use client";

import { useActionState, useId } from "react";
import { CircleAlert, LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteMyAccount, type DeleteState } from "@/app/account/actions";
import { inputClass } from "@/components/form";

/** Xóa tài khoản: không hoàn tác được, nên phải gõ chữ xác nhận (DESIGN.md: thao tác không hoàn tác luôn có bước xác nhận). */
export default function DeleteAccountForm() {
  const [state, action] = useActionState<DeleteState, FormData>(deleteMyAccount, null);
  const id = useId();
  return (
    <form action={action} className="grid max-w-md gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={id} className="text-sm font-bold">
          Gõ chữ <span className="font-mono">xoa</span> để xác nhận
        </label>
        <input id={id} name="confirm" autoComplete="off" autoCapitalize="none" className={inputClass} aria-invalid={state?.error ? true : undefined} />
      </div>
      {state?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}
      <DeleteButton />
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-danger px-6 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Trash2 className="size-5" aria-hidden />}
      {pending ? "Đang xóa…" : "Xóa tài khoản và toàn bộ dữ liệu"}
    </button>
  );
}
