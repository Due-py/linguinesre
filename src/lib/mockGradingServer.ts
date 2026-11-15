import "server-only";
import { createClient } from "@/lib/supabase/server";
import { studentMock, type StudentMock } from "./mockGrading";

/**
 * Đọc bài thi thử và điểm chấm của các học sinh trong lớp. Dùng client của GIÁO VIÊN: RLS (0018) chỉ trả về học sinh
 * trong lớp người này dạy. Chưa chạy 0018 thì các bảng chấm báo lỗi → trả { missing: true } để giao diện nhắc chạy.
 */
export async function loadClassMock(ids: string[]): Promise<{ missing: boolean; byStudent: Map<string, StudentMock>; reviews: Map<string, { note: string | null; done: boolean }> }> {
  const byStudent = new Map<string, StudentMock>();
  const reviews = new Map<string, { note: string | null; done: boolean }>();
  if (!ids.length) return { missing: false, byStudent, reviews };
  const supabase = await createClient();
  const [inv, ans, grades, rev, ai] = await Promise.all([
    supabase.from("mock_test_invites").select("student_id, completed_at").in("student_id", ids),
    supabase.from("mock_test_answers").select("student_id, question_id").in("student_id", ids),
    supabase.from("mock_test_grades").select("student_id, question_id, score").in("student_id", ids),
    supabase.from("mock_test_reviews").select("student_id, note, done_at").in("student_id", ids),
    supabase.from("mock_test_ai_grades").select("student_id, question_id, score").in("student_id", ids),
  ]);
  if (inv.error || ans.error || grades.error || rev.error) return { missing: true, byStudent, reviews };
  const invited = new Map((inv.data ?? []).map((r) => [r.student_id as string, r.completed_at as string | null]));
  for (const r of rev.data ?? []) reviews.set(r.student_id, { note: r.note, done: !!r.done_at });
  for (const id of ids)
    byStudent.set(
      id,
      studentMock({
        invited: invited.has(id),
        completedAt: invited.get(id) ?? null,
        answeredQids: (ans.data ?? []).filter((a) => a.student_id === id).map((a) => a.question_id),
        grades: (grades.data ?? []).filter((g) => g.student_id === id),
        // Chưa chạy 0019 thì chưa có điểm AI: vẫn chấm tay bình thường.
        aiGrades: ai.error ? [] : (ai.data ?? []).filter((g) => g.student_id === id),
        reviewDone: reviews.get(id)?.done ?? false,
      }),
    );
  return { missing: false, byStudent, reviews };
}
