import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import { ClassStatusForm, RemoveMemberForm, RenameClassForm } from "@/components/ClassForms";
import CopyCode from "@/components/CopyCode";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Chi tiết lớp" };
export const dynamic = "force-dynamic";

type MemberRow = {
  student_id: string;
  joined_at: string;
  profiles: { display_name: string | null; grade: number | null } | null;
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("teacher");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  // RLS: lớp của giáo viên khác không trả về dòng nào, nên trang báo "không tìm thấy".
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("id, name, grade, join_code, status").eq("id", id).maybeSingle();
  if (!cls) notFound();

  const { data: members } = await supabase
    .from("class_members")
    .select("student_id, joined_at, profiles(display_name, grade)")
    .eq("class_id", id);
  const rows = ((members ?? []) as unknown as MemberRow[])
    .map((m) => ({
      id: m.student_id,
      name: m.profiles?.display_name ?? "Chưa có tên",
      grade: m.profiles?.grade ?? null,
      joinedAt: m.joined_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const archived = cls.status === "archived";

  // Số buổi hoàn thành và lần luyện gần nhất của từng học sinh (RLS: chỉ học sinh trong lớp của giáo viên này).
  const { data: sessions } = rows.length
    ? await supabase
        .from("practice_sessions")
        .select("student_id, status, started_at")
        .in(
          "student_id",
          rows.map((r) => r.id),
        )
    : { data: [] };
  const practice = new Map<string, { completed: number; last: string | null }>();
  for (const s of sessions ?? []) {
    const p = practice.get(s.student_id) ?? { completed: 0, last: null };
    if (s.status === "completed") p.completed++;
    if (!p.last || s.started_at > p.last) p.last = s.started_at;
    practice.set(s.student_id, p);
  }

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher">
      <div className="grid gap-12">
        <div className="grid gap-4">
          <Link href="/teacher" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            Về danh sách lớp
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{cls.name}</h1>
          <p className="text-muted">
            {cls.grade ? `Lớp ${cls.grade}` : "Nhiều khối"}
            {archived ? ", đã lưu trữ" : ""}
          </p>
        </div>

        <section aria-labelledby="code" className="grid gap-3">
          <h2 id="code" className="text-2xl font-extrabold tracking-tight">
            Mã lớp
          </h2>
          <CopyCode code={cls.join_code} size="lg" />
          <p className="max-w-prose text-muted">
            {archived
              ? "Lớp đã lưu trữ nên học sinh không vào bằng mã này được. Mở lại lớp để dùng lại mã."
              : "Đọc hoặc gửi mã này cho học sinh. Các bạn nhập ở trang chính hoặc lúc thiết lập tài khoản. Mã chỉ để vào lớp, không thay mật khẩu đăng nhập."}
          </p>
        </section>

        <section aria-labelledby="students" className="grid gap-4">
          <h2 id="students" className="text-2xl font-extrabold tracking-tight">
            Học sinh ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <p className="max-w-prose rounded-2xl bg-sunken px-5 py-4 text-muted">
              Chưa có học sinh nào trong lớp. Khi học sinh nhập mã lớp, tên các bạn sẽ hiện ở đây.
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {rows.map((r) => {
                const p = practice.get(r.id);
                return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="grid">
                    <Link href={`/teacher/students/${r.id}?class=${cls.id}`} className="w-fit text-lg font-bold hover:underline">
                      {r.name}
                    </Link>
                    <span className="text-sm text-muted">
                      {r.grade ? `Lớp ${r.grade}, ` : ""}vào lớp ngày {dateFmt.format(new Date(r.joinedAt))}
                    </span>
                    <span className="text-sm font-semibold">
                      {p?.last
                        ? `${p.completed} buổi hoàn thành, luyện gần nhất ngày ${dateFmt.format(new Date(p.last))}`
                        : "Chưa luyện"}
                    </span>
                  </div>
                  <RemoveMemberForm classId={cls.id} studentId={r.id} name={r.name} />
                </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="settings" className="grid gap-6">
          <h2 id="settings" className="text-2xl font-extrabold tracking-tight">
            Cài đặt lớp
          </h2>
          <RenameClassForm id={cls.id} name={cls.name} />
          <ClassStatusForm id={cls.id} archived={archived} />
        </section>
      </div>
    </AppShell>
  );
}
