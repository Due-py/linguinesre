"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { MOCK_QIDS } from "@/lib/mockGrading";

const UUID = /^[0-9a-f-]{36}$/;

/** Giáo viên đã onboarding. Quyền ghi thật do RLS (0018: teaches_student) quyết định; đây là kiểm tra thêm ở máy chủ. */
async function teacher() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role, onboarded_at").eq("id", user.id).maybeSingle();
  return me?.role === "teacher" && me.onboarded_at ? { supabase, userId: user.id } : null;
}

function refresh(classId: string, studentId: string) {
  revalidatePath(`/teacher/classes/${classId}/thi-thu/${studentId}`);
  revalidatePath(`/teacher/classes/${classId}`);
}

/** Chấm một câu: score = "0" | "1" | "2", hoặc "clear" để bỏ điểm. */
export async function setMockScore(formData: FormData) {
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const qid = String(formData.get("qid") ?? "");
  const raw = String(formData.get("score") ?? "");
  if (!UUID.test(classId) || !UUID.test(studentId) || !MOCK_QIDS.includes(qid) || !["0", "1", "2", "clear"].includes(raw)) return;
  const ctx = await teacher();
  if (!ctx) return;
  if (raw === "clear") await ctx.supabase.from("mock_test_grades").delete().eq("student_id", studentId).eq("question_id", qid);
  else
    await ctx.supabase
      .from("mock_test_grades")
      .upsert({ student_id: studentId, question_id: qid, score: Number(raw), graded_by: ctx.userId, graded_at: new Date().toISOString() }, { onConflict: "student_id,question_id" });
  refresh(classId, studentId);
}

/** Lưu nhận xét; done = "1" đánh dấu chấm xong, "0" mở lại để chấm tiếp. */
export async function saveMockReview(formData: FormData) {
  const classId = String(formData.get("classId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const done = String(formData.get("done") ?? "0") === "1";
  if (!UUID.test(classId) || !UUID.test(studentId)) return;
  const ctx = await teacher();
  if (!ctx) return;
  const now = new Date().toISOString();
  await ctx.supabase
    .from("mock_test_reviews")
    .upsert({ student_id: studentId, note: note || null, done_at: done ? now : null, reviewed_by: ctx.userId, updated_at: now }, { onConflict: "student_id" });
  refresh(classId, studentId);
}
