import "server-only";
import { createClient } from "@/lib/supabase/server";
import { buildHints, type Hint } from "@/lib/speaking/hints";

export type UnitSummary = { id: string; unitNo: number; title: string; titleVi: string; topic: string };
export type TodayTask =
  | { kind: "continue"; href: string; unitTitle: string; answered: number; total: number }
  | { kind: "start"; href: string; unitTitle: string }
  | { kind: "none" };

/** Các Unit đã duyệt của khối (RLS chỉ trả Unit approved cho học sinh). */
export async function listUnitsForGrade(grade: number): Promise<UnitSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("units").select("id, unit_no, title, title_vi, topic").eq("grade", grade).order("unit_no");
  return (data ?? []).map((u) => ({ id: u.id, unitNo: u.unit_no, title: u.title, titleVi: u.title_vi, topic: u.topic }));
}

/**
 * Việc hôm nay, từ dữ liệu thật: tiếp tục buổi dở gần nhất; nếu không có thì Unit đầu tiên chưa hoàn thành buổi nào;
 * học hết rồi thì gợi ý Unit có buổi hoàn thành lâu nhất. Chưa có Unit nào được duyệt thì "none".
 */
export async function todayTask(studentId: string, grade: number): Promise<TodayTask> {
  const supabase = await createClient();
  const units = await listUnitsForGrade(grade);
  if (units.length === 0) return { kind: "none" };

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("id, unit_id, status, question_ids, started_at, completed_at, session_answers(question_id)")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false });

  const open = (sessions ?? []).find((s) => s.status === "in_progress" && units.some((u) => u.id === s.unit_id));
  if (open) {
    const answered = new Set((open.session_answers as { question_id: string }[]).map((a) => a.question_id)).size;
    return {
      kind: "continue",
      href: `/student/practice/session/${open.id}`,
      unitTitle: units.find((u) => u.id === open.unit_id)!.title,
      answered,
      total: (open.question_ids as string[]).length,
    };
  }
  const done = new Map<string, string>();
  for (const s of sessions ?? []) if (s.status === "completed" && !done.has(s.unit_id)) done.set(s.unit_id, s.completed_at ?? s.started_at);
  const next = units.find((u) => !done.has(u.id)) ?? [...units].sort((a, b) => (done.get(a.id)! < done.get(b.id)! ? -1 : 1))[0];
  return { kind: "start", href: `/student/practice/${next.id}`, unitTitle: next.title };
}

export type RunnerQuestion = { id: string; text: string; hints: Hint[]; answered: boolean };

/** Dữ liệu cho màn hình luyện: các câu của buổi theo đúng thứ tự, kèm gợi ý và câu nào đã trả lời. */
export async function loadSession(sessionId: string, studentId: string) {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("practice_sessions")
    .select("id, unit_id, status, question_ids, units(title, title_vi)")
    .eq("id", sessionId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!s) return null;

  const ids = s.question_ids as string[];
  const [{ data: qs }, { data: frames }, { data: answers }] = await Promise.all([
    supabase.from("questions").select("id, text, keywords, frame_key, hint_direction_vi, example_answer").in("id", ids),
    supabase.from("frames").select("key, text, vi").eq("unit_id", s.unit_id),
    supabase.from("session_answers").select("question_id").eq("session_id", s.id),
  ]);
  const frameByKey = new Map((frames ?? []).map((f) => [f.key, { text: f.text, vi: f.vi }]));
  const byId = new Map((qs ?? []).map((q) => [q.id, q]));
  const answered = new Set((answers ?? []).map((a) => a.question_id));
  const questions: RunnerQuestion[] = ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => ({
      id: q.id,
      text: q.text,
      answered: answered.has(q.id),
      hints: buildHints({
        hintDirectionVi: q.hint_direction_vi,
        keywords: q.keywords,
        frame: frameByKey.get(q.frame_key) ?? null,
        exampleAnswer: q.example_answer,
      }),
    }));
  const unit = s.units as unknown as { title: string; title_vi: string } | null;
  return { id: s.id, unitId: s.unit_id, status: s.status as "in_progress" | "completed", unitTitle: unit?.title ?? "", questions };
}
