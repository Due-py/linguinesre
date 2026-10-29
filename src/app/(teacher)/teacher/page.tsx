import type { Metadata } from "next";
import AppShell from "@/components/AppShell";
import TeacherHome, { type ClassRow } from "@/components/TeacherHome";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lớp của bạn" };
export const dynamic = "force-dynamic";

export default async function TeacherPage() {
  const profile = await requireRole("teacher");

  // RLS: giáo viên chỉ đọc được lớp của chính mình.
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

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher">
      <TeacherHome name={profile.displayName ?? ""} classes={classes} />
    </AppShell>
  );
}
