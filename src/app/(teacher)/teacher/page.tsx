import type { Metadata } from "next";
import AppShell, { TEACHER_NAV } from "@/components/AppShell";
import TeacherHome, { type ClassRow, type TeacherWeek } from "@/components/TeacherHome";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { daysAgo } from "@/lib/classStats";

export const metadata: Metadata = { title: "Lớp của bạn" };
export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const profile = await requireRole("teacher");

  // RLS: giáo viên chỉ đọc được lớp của chính mình, và chỉ học sinh trong các lớp đó.
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("id, name, grade, join_code, status, class_members(count)")
    .order("created_at", { ascending: false });

  const classes: ClassRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    grade: c.grade,
    joinCode: c.join_code,
    status: c.status as ClassRow["status"],
    students: (c.class_members as unknown as { count: number }[])[0]?.count ?? 0,
  }));

  // Hoạt động 7 ngày gần nhất của học sinh trong các lớp đang dạy: ngày học module và buổi luyện tự do đã hoàn thành.
  const activeIds = classes.filter((c) => c.status === "active").map((c) => c.id);
  let week: TeacherWeek = null;
  if (activeIds.length) {
    const { data: members } = await supabase.from("class_members").select("student_id").in("class_id", activeIds);
    const ids = [...new Set((members ?? []).map((m) => m.student_id))];
    if (ids.length) {
      const since = new Date(daysAgo(7)).toISOString();
      const [{ data: lessons }, { data: sessions }] = await Promise.all([
        supabase.from("module_lessons").select("student_id").in("student_id", ids).eq("status", "completed").gte("completed_at", since),
        supabase.from("practice_sessions").select("student_id").in("student_id", ids).eq("status", "completed").gte("completed_at", since),
      ]);
      const active = new Set([...(lessons ?? []), ...(sessions ?? [])].map((r) => r.student_id));
      week = { activeStudents: active.size, lessonsDone: lessons?.length ?? 0, sessionsDone: sessions?.length ?? 0 };
    }
  }

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher" nav={TEACHER_NAV} current="/teacher">
      <TeacherHome name={profile.displayName ?? ""} classes={classes} week={week} />
    </AppShell>
  );
}
