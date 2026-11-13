"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/** Nộp bài thi thử: chỉ khi được giao bài, chưa nộp và đã trả lời ít nhất một câu. Sau khi nộp không sửa được nữa. */
export async function submitMockTest() {
  const profile = await requireRole("student");
  const admin = createAdminClient();
  const { data: invite } = await admin.from("mock_test_invites").select("completed_at").eq("student_id", profile.id).maybeSingle();
  if (!invite || invite.completed_at) redirect("/student/thi-thu");
  const { count } = await admin.from("mock_test_answers").select("id", { count: "exact", head: true }).eq("student_id", profile.id);
  if (!count) redirect("/student/thi-thu?error=empty");
  await admin.from("mock_test_invites").update({ completed_at: new Date().toISOString() }).eq("student_id", profile.id).is("completed_at", null);
  revalidatePath("/student");
  redirect("/student/thi-thu");
}
