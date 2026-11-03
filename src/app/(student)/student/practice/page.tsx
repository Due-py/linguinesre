import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { listUnitsForGrade } from "@/lib/practice";
import { listModules } from "@/lib/module/server";

export const metadata: Metadata = { title: "Luyện nói" };
export const dynamic = "force-dynamic";

export default async function PracticeListPage() {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const [units, modules] = profile.grade ? await Promise.all([listUnitsForGrade(profile.grade), listModules(profile.grade)]) : [[], []];
  const moduleOf = new Map(modules.map((m) => [m.unitId, m]));

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/practice">
      <div className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Luyện nói</h1>
          <p className="max-w-prose text-muted">
            Chọn một Unit của lớp {profile.grade}. Unit có <strong className="text-ink">lộ trình 14 ngày</strong> được học trọn vẹn: kiến thức, nói có
            hướng dẫn, phản xạ, roleplay và bài đánh giá cuối. Unit khác có buổi luyện 5 câu, khoảng 10–15 phút.
          </p>
        </div>
        {units.length === 0 ? (
          <p className="max-w-prose rounded-2xl bg-sunken px-5 py-4 text-muted">
            Chưa có Unit nào của lớp {profile.grade} được thầy cô duyệt. Khi có, Unit sẽ hiện ở đây.
          </p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {units.map((u) => (
              <li key={u.id}>
                <Link
                  href={moduleOf.has(u.id) ? `/student/module/${moduleOf.get(u.id)!.id}` : `/student/practice/${u.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-sunken text-lg font-extrabold tabular-nums">{u.unitNo}</span>
                  <span className="grid gap-0.5">
                    <span lang="en" className="text-xl font-extrabold tracking-tight group-hover:underline">
                      {u.title}
                    </span>
                    <span className="text-muted">{u.titleVi}</span>
                    {moduleOf.has(u.id) && <span className="w-fit rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-bold text-brand-strong">Lộ trình 14 ngày</span>}
                  </span>
                  <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
