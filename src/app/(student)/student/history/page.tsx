import type { Metadata } from "next";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import ButtonLink from "@/components/ButtonLink";
import SessionList from "@/components/SessionList";
import { requireRole } from "@/lib/auth";
import { listSessions } from "@/lib/sessions";

export const metadata: Metadata = { title: "Lịch sử luyện tập" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const profile = await requireRole("student");
  const sessions = await listSessions(profile.id, 200);

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/history">
      <div className="grid gap-8">
        <div className="grid gap-2">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Lịch sử luyện tập</h1>
          <p className="max-w-prose text-muted">Mọi buổi luyện của bạn, mới nhất ở trên. Mở một buổi để xem lại câu trả lời, nghe lại bản ghi và nhận xét.</p>
        </div>
        {sessions.length === 0 ? (
          <div className="grid max-w-prose gap-4 rounded-3xl bg-sunken px-6 py-6">
            <p className="text-muted">Bạn chưa có buổi luyện nào. Sau buổi đầu tiên, câu trả lời và nhận xét sẽ được lưu ở đây.</p>
            <ButtonLink href="/student/practice">Chọn Unit để luyện</ButtonLink>
          </div>
        ) : (
          <SessionList
            sessions={sessions}
            hrefFor={(s) => (s.status === "completed" ? `/student/sessions/${s.id}` : `/student/practice/session/${s.id}`)}
          />
        )}
      </div>
    </AppShell>
  );
}
