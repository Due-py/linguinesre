"use client";

import { useActionState, useState } from "react";
import { BookOpenText, Presentation } from "lucide-react";
import { completeOnboarding } from "@/app/onboarding/actions";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/form";

type Role = "student" | "teacher";

const ROLES = [
  { value: "student" as const, icon: BookOpenText, title: "Học sinh", text: "Luyện nói mỗi ngày và xem lại tiến bộ của mình." },
  { value: "teacher" as const, icon: Presentation, title: "Giáo viên", text: "Tạo lớp, lấy mã lớp và theo dõi học sinh của lớp." },
];

/** fullName: họ tên đã nhập lúc đăng ký (user_metadata). Có rồi thì không hỏi lại; tài khoản cũ chưa có thì hỏi "Họ và tên". */
export default function OnboardingForm({ fullName }: { fullName?: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(completeOnboarding, null);
  const [role, setRole] = useState<Role | "">((state?.values?.role as Role | undefined) ?? "");

  return (
    <form action={action} className="grid gap-8" noValidate>
      <fieldset className="grid gap-3">
        <legend className="mb-1 text-lg font-extrabold">Bạn là ai?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className="option-card group relative grid cursor-pointer gap-2 p-5 has-[:checked]:border-sky has-[:checked]:bg-sky-soft has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand"
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="peer sr-only"
              />
              <span className="grid size-11 place-items-center rounded-xl bg-sunken text-ink group-has-[:checked]:bg-sky group-has-[:checked]:text-white">
                <r.icon className="size-6" aria-hidden />
              </span>
              <span className="text-xl font-extrabold">{r.title}</span>
              <span className="text-sm text-muted">{r.text}</span>
              {/* Dấu chọn có chữ cho người không phân biệt được màu. */}
              <span className="absolute right-4 top-4 hidden rounded-full bg-sky px-2.5 py-0.5 text-xs font-bold text-white group-has-[:checked]:block">
                Đã chọn
              </span>
            </label>
          ))}
        </div>
        {state?.fields?.role && (
          <p className="text-sm font-semibold text-danger" role="alert">
            {state.fields.role}
          </p>
        )}
      </fieldset>

      {role && (
        <div className="grid gap-5">
          {fullName ? (
            <p className="text-lg">
              Họ và tên: <strong className="font-semibold">{fullName}</strong>
            </p>
          ) : (
            <Field
              label="Họ và tên"
              name="displayName"
              autoComplete="name"
              maxLength={40}
              hint={
                role === "student"
                  ? "Tên thật, có dấu. Thầy cô trong lớp sẽ thấy tên này."
                  : "Tên thật, có dấu. Học sinh trong lớp sẽ thấy tên này."
              }
              state={state}
            />
          )}

          {role === "student" && (
            <>
              <div className="grid gap-1.5">
                <label htmlFor="grade" className="text-sm font-bold">
                  Khối lớp
                </label>
                <select
                  id="grade"
                  name="grade"
                  defaultValue={state?.values?.grade ?? ""}
                  aria-invalid={state?.fields?.grade ? true : undefined}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Chọn khối lớp
                  </option>
                  {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      Lớp {g}
                    </option>
                  ))}
                </select>
                {state?.fields?.grade && <p className="text-sm font-semibold text-danger">{state.fields.grade}</p>}
              </div>

              <Field
                label="Mã lớp (không bắt buộc)"
                name="classCode"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={12}
                hint="Có mã từ thầy cô thì nhập ngay. Chưa có cũng không sao, bạn vào lớp sau được."
                state={state}
              />
            </>
          )}
        </div>
      )}

      <FormMessage state={state} />
      {role && <SubmitButton pendingLabel="Đang lưu…">Bắt đầu</SubmitButton>}
    </form>
  );
}
