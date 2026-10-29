import Link from "next/link";
import { Plus } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import CopyCode from "@/components/CopyCode";

export type ClassRow = { id: string; name: string; grade: number | null; joinCode: string; status: "active" | "archived"; students: number };

const studentsLabel = (n: number) => (n === 0 ? "Chưa có học sinh" : `${n} học sinh`);
const gradeLabel = (g: number | null) => (g ? `Lớp ${g}` : "Nhiều khối");

/** Tổng quan của giáo viên: danh sách lớp là việc đầu tiên cần làm, nên đứng ngay trên cùng. */
export default function TeacherHome({ name, classes }: { name: string; classes: ClassRow[] }) {
  const active = classes.filter((c) => c.status === "active");
  const archived = classes.filter((c) => c.status === "archived");

  return (
    <div className="grid gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-muted">Chào {name},</p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Lớp của bạn</h1>
        </div>
        <ButtonLink href="/teacher/classes/new">
          <Plus className="size-5" aria-hidden />
          Tạo lớp
        </ButtonLink>
      </div>

      {active.length === 0 ? (
        <section className="grid max-w-xl gap-4 rounded-[2rem] bg-sunken px-6 py-8 sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight">Tạo lớp đầu tiên của bạn</h2>
          <p className="text-muted">
            Mỗi lớp có một mã gồm 6 ký tự. Bạn đưa mã cho học sinh, các bạn nhập mã ở trang chính để vào lớp.
          </p>
          <ButtonLink href="/teacher/classes/new" className="w-fit">
            Tạo lớp
          </ButtonLink>
        </section>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {active.map((c) => (
            <li key={c.id} className="grid gap-4 py-6 md:grid-cols-[1fr_auto] md:items-center">
              <div className="grid gap-1">
                <Link href={`/teacher/classes/${c.id}`} className="w-fit text-2xl font-extrabold tracking-tight underline-offset-4 hover:underline">
                  {c.name}
                </Link>
                <p className="text-muted">
                  {gradeLabel(c.grade)}, {studentsLabel(c.students)}
                </p>
              </div>
              <div className="grid gap-1.5">
                <span className="text-sm font-bold text-muted">Mã lớp</span>
                <CopyCode code={c.joinCode} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer items-center font-bold text-muted hover:text-ink">
            Lớp đã lưu trữ ({archived.length})
          </summary>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {archived.map((c) => (
              <li key={c.id}>
                <Link href={`/teacher/classes/${c.id}`} className="flex min-h-12 items-center justify-between gap-4 py-3 text-muted hover:text-ink">
                  <span className="font-bold">{c.name}</span>
                  <span className="text-sm">{studentsLabel(c.students)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
