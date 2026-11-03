import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, TriangleAlert, Users } from "lucide-react";
import AppShell, { TEACHER_NAV } from "@/components/AppShell";
import { ClassStatusForm, RemoveMemberForm, RenameClassForm } from "@/components/ClassForms";
import CopyCode from "@/components/CopyCode";
import { Chip, Eyebrow, Progress, SectionHead, Stat } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { daysAgo, studentPractice, unitCoverage, type ClassSession } from "@/lib/classStats";
import { ERROR_TAGS, type ErrorTag } from "@/lib/module/schema";

export const metadata: Metadata = { title: "Chi tiết lớp" };
export const dynamic = "force-dynamic";

type MemberRow = {
  student_id: string;
  joined_at: string;
  profiles: { display_name: string | null; grade: number | null } | null;
};

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });
const shortFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireRole("teacher");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  // RLS: lớp của giáo viên khác không trả về dòng nào, nên trang báo "không tìm thấy".
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("id, name, grade, join_code, status").eq("id", id).maybeSingle();
  if (!cls) notFound();

  const { data: members } = await supabase.from("class_members").select("student_id, joined_at, profiles(display_name, grade)").eq("class_id", id);
  const rows = ((members ?? []) as unknown as MemberRow[])
    .map((m) => ({
      id: m.student_id,
      name: m.profiles?.display_name ?? "Chưa có tên",
      grade: m.profiles?.grade ?? null,
      joinedAt: m.joined_at,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const ids = rows.map((r) => r.id);
  const nameOf = new Map(rows.map((r) => [r.id, r.name]));
  const archived = cls.status === "archived";

  // Dữ liệu thật của học sinh trong lớp (RLS: chỉ học sinh trong lớp của giáo viên này). Không dùng dữ liệu nghiên cứu.
  const [{ data: sessions }, { data: lessons }, { data: mistakes }] = ids.length
    ? await Promise.all([
        supabase
          .from("practice_sessions")
          .select("student_id, unit_id, status, started_at, completed_at, session_answers(question_id, attempt_no, think_ms)")
          .in("student_id", ids),
        supabase.from("module_lessons").select("student_id, module_id, day, status, completed_at, modules(unit_no, title)").in("student_id", ids),
        supabase.from("module_attempts").select("student_id, error_tags").in("student_id", ids).neq("error_tags", "{}"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const practice = new Map<string, { completed: number; last: string | null }>();
  for (const s of sessions ?? []) {
    const p = practice.get(s.student_id) ?? { completed: 0, last: null };
    if (s.status === "completed") p.completed++;
    if (!p.last || s.started_at > p.last) p.last = s.started_at;
    practice.set(s.student_id, p);
  }
  const classSessions: ClassSession[] = (sessions ?? []).map((s) => ({
    studentId: s.student_id,
    unitId: s.unit_id,
    status: s.status,
    completedAt: s.completed_at,
    answers: ((s.session_answers ?? []) as { question_id: string; attempt_no: number; think_ms: number | null }[]).map((a) => ({
      questionId: a.question_id,
      attemptNo: a.attempt_no,
      thinkMs: a.think_ms,
    })),
  }));
  const weekly = studentPractice(classSessions, new Date());
  const coverage = unitCoverage(classSessions);
  const unitIds = [...new Set(classSessions.map((s) => s.unitId))];
  const { data: unitRows } = cls.grade
    ? await supabase.from("units").select("id, unit_no, title, grade").eq("grade", cls.grade).eq("status", "approved").order("unit_no")
    : unitIds.length
      ? await supabase.from("units").select("id, unit_no, title, grade").in("id", unitIds).order("grade").order("unit_no")
      : { data: [] };

  // Tiến độ module: mỗi học sinh, module đang học nhiều ngày nhất (số ngày đã xong / 14).
  type LessonRow = { student_id: string; module_id: string; day: number; status: string; completed_at: string | null; modules: { unit_no: number; title: string } | null };
  const lessonRows = (lessons ?? []) as unknown as LessonRow[];
  const moduleOf = new Map<string, { title: string; unitNo: number; done: number }>();
  for (const r of rows) {
    const mine = lessonRows.filter((l) => l.student_id === r.id);
    const byModule = new Map<string, { title: string; unitNo: number; done: number }>();
    for (const l of mine) {
      const m = byModule.get(l.module_id) ?? { title: l.modules?.title ?? "", unitNo: l.modules?.unit_no ?? 0, done: 0 };
      if (l.status === "completed") m.done++;
      byModule.set(l.module_id, m);
    }
    const best = [...byModule.values()].sort((a, b) => b.done - a.done)[0];
    if (best) moduleOf.set(r.id, best);
  }

  // Lỗi hay gặp của cả lớp: đếm nhãn lỗi (AI đã kiểm chứng, câu ngữ pháp sai) và số học sinh mắc. Không nêu tên ai mắc.
  const errorStats = new Map<ErrorTag, { count: number; students: Set<string> }>();
  for (const m of (mistakes ?? []) as { student_id: string; error_tags: string[] | null }[])
    for (const t of m.error_tags ?? [])
      if (t in ERROR_TAGS) {
        const e = errorStats.get(t as ErrorTag) ?? { count: 0, students: new Set<string>() };
        e.count++;
        e.students.add(m.student_id);
        errorStats.set(t as ErrorTag, e);
      }
  const topErrors = [...errorStats.entries()].sort((a, b) => b[1].students.size - a[1].students.size || b[1].count - a[1].count).slice(0, 5);

  // Hoạt động gần đây: ngày học module và buổi luyện tự do đã hoàn thành, mới nhất trước.
  const activity = [
    ...lessonRows
      .filter((l) => l.status === "completed" && l.completed_at)
      .map((l) => ({ at: l.completed_at!, who: l.student_id, what: `xong ngày ${l.day} của Unit ${l.modules?.unit_no ?? ""}`, en: l.modules?.title ?? "" })),
    ...(sessions ?? [])
      .filter((s) => s.status === "completed" && s.completed_at)
      .map((s) => ({ at: s.completed_at as string, who: s.student_id, what: "xong một buổi luyện tự do", en: "" })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const since = daysAgo(7);
  const activeWeek = new Set(activity.length ? [...lessonRows.filter((l) => l.completed_at && Date.parse(l.completed_at) >= since).map((l) => l.student_id), ...(sessions ?? []).filter((s) => s.completed_at && Date.parse(s.completed_at) >= since).map((s) => s.student_id)] : []);
  const avgDays = moduleOf.size ? Math.round(([...moduleOf.values()].reduce((n, m) => n + m.done, 0) / moduleOf.size) * 10) / 10 : null;

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher" nav={TEACHER_NAV} current="/teacher">
      <div className="grid gap-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="grid gap-3">
            <Link href="/teacher" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden />
              Về danh sách lớp
            </Link>
            <Eyebrow>
              {cls.grade ? `Lớp ${cls.grade}` : "Nhiều khối"}
              {archived ? " · đã lưu trữ" : ""}
            </Eyebrow>
            <h1 className="text-5xl font-semibold tracking-tight">{cls.name}</h1>
          </div>
          <section aria-labelledby="code" className="grid gap-2 rounded-[2rem] bg-tint p-5">
            <h2 id="code" className="text-sm font-medium text-muted">
              Mã lớp
            </h2>
            <CopyCode code={cls.join_code} size="lg" />
            <p className="max-w-sm text-sm text-muted">
              {archived
                ? "Lớp đã lưu trữ nên học sinh không vào bằng mã này được. Mở lại lớp để dùng lại mã."
                : "Đọc hoặc gửi mã này cho học sinh. Mã chỉ để vào lớp, không thay mật khẩu đăng nhập."}
            </p>
          </section>
        </div>

        {/* Tổng quan lớp: số liệu thật, không xếp hạng học sinh. */}
        <section aria-labelledby="overview" className="grid gap-3">
          <h2 id="overview" className="sr-only">
            Tổng quan lớp
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Học sinh" value={String(rows.length)} />
            <Stat label="Có học trong 7 ngày" value={rows.length ? `${activeWeek.size}/${rows.length}` : null} />
            <Stat label="Số ngày module đã học (trung bình)" value={avgDays === null ? null : `${String(avgDays).replace(".", ",")}/14`} note={avgDays === null ? undefined : `Tính trên ${moduleOf.size} bạn đã bắt đầu module`} />
          </div>
        </section>

        <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
          <section aria-labelledby="students" className="grid content-start gap-4">
            <SectionHead id="students" title={`Học sinh (${rows.length})`} />
            {rows.length === 0 ? (
              <p className="max-w-prose rounded-3xl bg-tint px-5 py-4 text-muted">Chưa có học sinh nào trong lớp. Khi học sinh nhập mã lớp, tên các bạn sẽ hiện ở đây.</p>
            ) : (
              <ul className="grid gap-2">
                {rows.map((r) => {
                  const p = practice.get(r.id);
                  const mod = moduleOf.get(r.id);
                  return (
                    <li key={r.id} className="grid gap-3 rounded-3xl border border-line p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft font-medium text-brand-strong">
                            {(r.name.trim()[0] ?? "?").toUpperCase()}
                          </span>
                          <div className="grid">
                            <Link href={`/teacher/students/${r.id}?class=${cls.id}`} className="w-fit text-lg font-medium hover:underline">
                              {r.name}
                            </Link>
                            <span className="text-sm text-muted">
                              {r.grade ? `Lớp ${r.grade}, ` : ""}vào lớp ngày {dateFmt.format(new Date(r.joinedAt))}
                            </span>
                          </div>
                        </div>
                        <RemoveMemberForm classId={cls.id} studentId={r.id} name={r.name} />
                      </div>
                      {mod ? (
                        <div className="grid gap-1.5">
                          <p className="flex justify-between gap-3 text-sm">
                            <span>
                              Module Unit {mod.unitNo}: <span lang="en">{mod.title}</span>
                            </span>
                            <span className="shrink-0 font-medium tabular-nums">{mod.done}/14 ngày</span>
                          </p>
                          <Progress value={mod.done} max={14} label={`${r.name}: ${mod.done} trên 14 ngày`} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted">Chưa bắt đầu module nào.</p>
                      )}
                      <p className="text-sm font-medium">
                        {p?.last ? `${p.completed} buổi hoàn thành, luyện gần nhất ngày ${dateFmt.format(new Date(p.last))}` : "Chưa luyện tự do"}
                      </p>
                      {p?.last && (
                        <p className="text-sm text-muted">
                          Tuần này: {weekly.get(r.id)?.doneThisWeek ?? 0} buổi hoàn thành.{" "}
                          {weekly.get(r.id)?.lastMedianMs != null
                            ? `Thời gian bắt đầu nói buổi gần nhất: ${secs(weekly.get(r.id)!.lastMedianMs!)} (ước lượng).`
                            : "Chưa đo được thời gian bắt đầu nói."}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <aside className="grid content-start gap-6">
            <section aria-labelledby="mistakes" className="grid content-start gap-3 rounded-3xl border border-line p-6">
              <h2 id="mistakes" className="flex items-center gap-2 text-xl font-semibold">
                <TriangleAlert className="size-5 text-gold-shadow" aria-hidden />
                Lỗi hay gặp của cả lớp
              </h2>
              {topErrors.length === 0 ? (
                <p className="text-muted">Chưa ghi nhận lỗi nào. Lỗi chỉ được ghi khi AI nhận xét câu trả lời trong module (lỗi phải trích đúng lời học sinh) hoặc khi học sinh chọn sai câu ngữ pháp.</p>
              ) : (
                <ul className="grid gap-2">
                  {topErrors.map(([tag, e]) => (
                    <li key={tag} className="grid gap-1 rounded-2xl bg-tint px-4 py-3">
                      <span className="font-medium">{ERROR_TAGS[tag]}</span>
                      <span className="text-sm text-muted">
                        {e.students.size}/{rows.length} học sinh mắc · {e.count} lần
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-sm text-muted">Gợi ý: ôn chung cả lớp những lỗi nhiều bạn mắc. Danh sách không nêu tên học sinh.</p>
            </section>

            <section aria-labelledby="activity" className="grid content-start gap-3 rounded-3xl border border-line p-6">
              <h2 id="activity" className="flex items-center gap-2 text-xl font-semibold">
                <Clock3 className="size-5 text-brand" aria-hidden />
                Hoạt động gần đây
              </h2>
              {activity.length === 0 ? (
                <p className="text-muted">Chưa có bài nào hoàn thành.</p>
              ) : (
                <ol className="grid gap-2">
                  {activity.map((a, i) => (
                    <li key={i} className="grid text-sm">
                      <span>
                        <span className="font-medium">{nameOf.get(a.who)}</span> {a.what}
                        {a.en && (
                          <>
                            {" "}
                            (<span lang="en">{a.en}</span>)
                          </>
                        )}
                      </span>
                      <span className="text-muted">{shortFmt.format(new Date(a.at))}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>

        {rows.length > 0 && (
          <section aria-labelledby="units" className="grid gap-4">
            <SectionHead id="units" title="Unit đã luyện tự do" />
            {(unitRows ?? []).length === 0 ? (
              <p className="max-w-prose text-muted">Chưa có học sinh nào hoàn thành buổi luyện tự do.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {(unitRows ?? []).map((u) => (
                  <li key={u.id} className="grid gap-2 rounded-2xl bg-tint px-4 py-3">
                    <span className="flex items-baseline justify-between gap-3">
                      <span>
                        <span className="text-muted">
                          {cls.grade ? "" : `Lớp ${u.grade}, `}Unit {u.unit_no}:{" "}
                        </span>
                        <span lang="en" className="font-medium">
                          {u.title}
                        </span>
                      </span>
                      <Chip tone={coverage.get(u.id) ? "green" : "grey"} icon={<Users className="size-4" aria-hidden />}>
                        {coverage.get(u.id) ?? 0}/{rows.length} bạn đã luyện
                      </Chip>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted">Chỉ tính buổi luyện tự do đã hoàn thành. Thời gian bắt đầu nói do trình duyệt của học sinh ước lượng (số ở giữa của các câu trong buổi).</p>
          </section>
        )}

        <section aria-labelledby="settings" className="grid gap-6">
          <SectionHead id="settings" title="Cài đặt lớp" />
          <RenameClassForm id={cls.id} name={cls.name} />
          <ClassStatusForm id={cls.id} archived={archived} />
        </section>
      </div>
    </AppShell>
  );
}
