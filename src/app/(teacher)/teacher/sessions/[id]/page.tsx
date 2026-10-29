import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import SessionReport from "@/components/SessionReport";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadReport } from "@/lib/sessions";

export const metadata: Metadata = { title: "Xem lại buổi luyện" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/;

/** Giáo viên xem lại một buổi (chữ ghi lời, bản ghi, nhận xét). Chỉ xem, không gọi AI. RLS quyết định có thấy hay không. */
export default async function TeacherSessionPage({
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

  const report = await loadReport(id);
  if (!report) notFound();
  const supabase = await createClient();
  const { data: student } = await supabase.from("profiles").select("display_name").eq("id", report.studentId).maybeSingle();
  if (!student) notFound();
  const query = classId && UUID.test(classId) ? `?class=${classId}` : "";

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher">
      <SessionReport
        report={report}
        mode="teacher"
        studentName={student.display_name ?? "Học sinh"}
        back={{ href: `/teacher/students/${report.studentId}${query}`, label: "Về các buổi của học sinh" }}
      />
    </AppShell>
  );
}
