"use client";

import { useActionState } from "react";
import { Archive, ArchiveRestore, KeyRound, UserMinus } from "lucide-react";
import { createClass, removeMember, renameClass, resetStudentPassword, setClassStatus } from "@/app/(teacher)/teacher/actions";
import { Field, FormMessage, inputClass, SubmitButton } from "@/components/form";
import type { FormState } from "@/lib/form";

export function CreateClassForm() {
  const [state, action] = useActionState<FormState, FormData>(createClass, null);
  return (
    <form action={action} className="grid max-w-md gap-5" noValidate>
      <Field label="Tên lớp" name="name" maxLength={60} placeholder="Ví dụ: 8A1" autoComplete="off" state={state} />
      <div className="grid gap-1.5">
        <label htmlFor="class-grade" className="text-sm font-bold">
          Khối lớp
        </label>
        <select id="class-grade" name="grade" defaultValue={state?.values?.grade ?? ""} className={inputClass}>
          <option value="">Nhiều khối</option>
          {[6, 7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>
              Lớp {g}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted">Chọn một khối thì chỉ học sinh cùng khối mới vào được lớp bằng mã.</p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang tạo lớp…" className="w-fit">
        Tạo lớp
      </SubmitButton>
    </form>
  );
}

export function RenameClassForm({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(renameClass, null);
  return (
    <form action={action} className="grid max-w-md gap-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <Field label="Tên lớp" name="name" defaultValue={name} maxLength={60} autoComplete="off" state={state} />
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Đang lưu…" variant="quiet" className="w-fit">
        Lưu tên lớp
      </SubmitButton>
    </form>
  );
}

/** Lưu trữ cần xác nhận vì học sinh sẽ không vào lớp bằng mã được nữa. Mở lại thì không cần. */
export function ClassStatusForm({ id, archived }: { id: string; archived: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(setClassStatus, null);
  return (
    <form
      action={action}
      className="grid gap-3"
      onSubmit={(e) => {
        if (!archived && !window.confirm("Lưu trữ lớp này? Học sinh sẽ không vào lớp bằng mã được nữa. Danh sách học sinh vẫn được giữ.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={archived ? "active" : "archived"} />
      <FormMessage state={state} />
      <SubmitButton variant="quiet" className="w-fit" pendingLabel="Đang lưu…">
        {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
        {archived ? "Mở lại lớp" : "Lưu trữ lớp"}
      </SubmitButton>
    </form>
  );
}

export function RemoveMemberForm({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(removeMember, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Đưa ${name} ra khỏi lớp? Tài khoản và dữ liệu luyện tập của bạn ấy vẫn được giữ.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <SubmitButton variant="quiet" pendingLabel="…" className="min-h-11 px-4 text-sm">
        <UserMinus className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">Đưa ra khỏi lớp</span>
        <span className="sr-only">{name}</span>
      </SubmitButton>
      {state?.error && (
        <span role="alert" className="mt-1 block text-sm font-semibold text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}

/**
 * Đặt mật khẩu tạm cho học sinh dùng tên tài khoản (không có email). Mật khẩu tạm hiện một lần ngay dưới nút để thầy cô
 * đọc cho học sinh; học sinh đăng nhập rồi đổi ở trang Tài khoản.
 */
export function ResetPasswordForm({ classId, studentId, name }: { classId: string; studentId: string; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetStudentPassword, null);
  return (
    <form
      action={action}
      className="grid justify-items-end gap-2"
      onSubmit={(e) => {
        if (!window.confirm(`Đặt mật khẩu tạm cho ${name}? Mật khẩu cũ của bạn ấy sẽ không dùng được nữa.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="studentId" value={studentId} />
      <SubmitButton variant="quiet" pendingLabel="…" className="min-h-11 px-4 text-sm">
        <KeyRound className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">Đặt lại mật khẩu</span>
        <span className="sr-only">{name}</span>
      </SubmitButton>
      {state?.notice && (
        <p role="status" className="max-w-xs rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand-strong">
          <span className="font-semibold">{state.notice}</span>
          <br />
          Đọc cho {name}, bạn ấy đăng nhập rồi đổi mật khẩu ở trang Tài khoản.
        </p>
      )}
      {state?.error && (
        <span role="alert" className="block max-w-xs text-sm font-semibold text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
