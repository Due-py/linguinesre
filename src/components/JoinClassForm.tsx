"use client";

import { useActionState } from "react";
import { joinClass } from "@/app/(student)/student/actions";
import { Field, FormMessage, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/form";

/** Học sinh nhập mã lớp do thầy cô đưa. */
export default function JoinClassForm() {
  const [state, action] = useActionState<FormState, FormData>(joinClass, null);
  return (
    <form action={action} className="grid max-w-sm gap-4" noValidate>
      <Field
        label="Mã lớp"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={12}
        hint="6 chữ cái và chữ số, do thầy cô đưa cho bạn."
        state={state}
        className="uppercase tracking-[0.2em]"
      />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang vào lớp…" variant="quiet" className="w-fit">
        Vào lớp
      </SubmitButton>
    </form>
  );
}
