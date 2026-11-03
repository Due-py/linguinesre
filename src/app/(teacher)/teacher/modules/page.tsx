import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleDashed, ShieldCheck } from "lucide-react";
import AppShell, { TEACHER_NAV } from "@/components/AppShell";
import { requireRole } from "@/lib/auth";
import { listModules } from "@/lib/module/server";

export const metadata: Metadata = { title: "Duyệt nội dung" };
export const dynamic = "force-dynamic";

const STATUS = { draft: "Nháp", team_checked: "Chờ thầy cô duyệt", teacher_approved: "Đã duyệt" } as const;

/** Danh sách Learning Module để thầy cô đọc và duyệt (bước Teacher Review trước khi công bố chính thức). */
export default async function TeacherModulesPage() {
  const profile = await requireRole("teacher");
  const modules = await listModules();
  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher" nav={TEACHER_NAV} current="/teacher/modules">
      <div className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Duyệt nội dung</h1>
          <p className="max-w-prose text-muted">
            Mỗi Learning Module đi qua: thu thập từ SGK, trích xuất (ghi số trang), nhóm soạn bài luyện, kiểm tra tự động, rồi thầy cô đọc và duyệt.
            Học sinh đã dùng được module “chờ duyệt”, kèm nhãn ghi rõ chưa được thầy cô duyệt.
          </p>
        </div>
        {modules.length === 0 ? (
          <p className="max-w-prose rounded-2xl bg-sunken px-5 py-4 text-muted">Chưa có module nào trong cơ sở dữ liệu. Nhóm chạy npm run module:seed để nạp.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {modules.map((m) => (
              <li key={m.id}>
                <Link href={`/teacher/modules/${m.id}`} className="group flex items-center gap-4 py-4">
                  {m.status === "teacher_approved" ? (
                    <ShieldCheck className="size-5 shrink-0 text-brand-strong" aria-hidden />
                  ) : (
                    <CircleDashed className="size-5 shrink-0 text-muted" aria-hidden />
                  )}
                  <span className="grid flex-1 gap-0.5">
                    <span className="font-extrabold group-hover:underline">
                      Unit {m.unitNo}: <span lang="en">{m.title}</span>
                    </span>
                    <span className="text-sm text-muted">{m.titleVi}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-muted">{STATUS[m.status]}</span>
                  <ArrowRight className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
