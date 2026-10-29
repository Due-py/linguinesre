import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import SessionList from "@/components/SessionList";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listSessions } from "@/lib/sessions";

export const metadata: Metadata = { title: "Lịch sử luyện tập của học sinh" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/;

/** Giáo viên xem các buổi luyện của MỘT học sinh. RLS: học sinh không thuộc lớp của giáo viên này thì không đọc được hồ sơ. */
export default async function TeacherStudentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ class?: string }>;
}) {
  const profile = await requireRole("teacher");
  const { id } = await params;
  const { class: classId } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data: student } = await supabase.from("profiles").select("id, display_name, grade, role").eq("id", id).maybeSingle();
  if (!student || student.role !== "student") notFound();
  const sessions = await listSessions(id, 200);
  const back = classId && UUID.test(classId) ? { href: `/teacher/classes/${classId}`, label: "Về lớp" } : { href: "/teacher", label: "Về danh sách lớp" };
  const name = student.display_name ?? "Học sinh";

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher">
      <div className="grid gap-8">
        <div className="grid gap-3">
          <Link href={back.href} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{name}</h1>
          <p className="text-muted">
            {student.grade ? `Lớp ${student.grade}. ` : ""}
            {sessions.filter((s) => s.status === "completed").length} buổi hoàn thành.
          </p>
        </div>
        {sessions.length === 0 ? (
          <p className="max-w-prose rounded-2xl bg-sunken px-5 py-4 text-muted">Học sinh này chưa có buổi luyện nào.</p>
        ) : (
          <SessionList sessions={sessions} hrefFor={(s) => `/teacher/sessions/${s.id}${classId && UUID.test(classId) ? `?class=${classId}` : ""}`} />
        )}
      </div>
    </AppShell>
  );
}
