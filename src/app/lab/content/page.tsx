import Link from "next/link";
import { UNITS } from "@/content/units";
import { STATUS_LABEL } from "./status";

export default function ContentIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent-ink">
          Duyệt nội dung
        </span>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Nội dung các Unit</h1>
        <p className="text-muted">Chọn một Unit để đọc và kiểm tra trước khi mở cho học sinh.</p>
      </header>
      <ul className="grid gap-3">
        {UNITS.map((unit) => (
          <li key={unit.id}>
            <Link
              href={`/lab/content/${unit.id}`}
              className="flex items-center justify-between gap-4 rounded-3xl bg-surface p-5 hover:bg-level-1"
            >
              <span>
                <span className="block text-sm font-semibold text-muted">
                  Lớp {unit.grade} · Unit {unit.unit}
                </span>
                <span className="block text-xl font-bold">
                  {unit.title} <span className="font-normal text-muted">({unit.titleVi})</span>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-background px-3 py-1 text-sm font-semibold">
                {STATUS_LABEL[unit.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
