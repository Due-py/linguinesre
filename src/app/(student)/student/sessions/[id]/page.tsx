import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import SessionReport from "@/components/SessionReport";
import { requireRole } from "@/lib/auth";
import { loadReport } from "@/lib/sessions";

export const metadata: Metadata = { title: "Tổng kết buổi luyện" };
export const dynamic = "force-dynamic";

/** Tổng kết một buổi của chính học sinh. Buổi của người khác: RLS không trả dòng nào nên báo không tìm thấy. */
export default async function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("student");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const report = await loadReport(id);
  if (!report || report.studentId !== profile.id) notFound();

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/history">
      <SessionReport report={report} mode="student" back={{ href: "/student/history", label: "Về lịch sử luyện tập" }} />
    </AppShell>
  );
}
