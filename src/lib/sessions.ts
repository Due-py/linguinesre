import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeMeasures } from "@/lib/feedback/measures";
import type { FeedbackPayload } from "@/lib/feedback/generate";
import { FOCUS_MIN_SESSIONS, latestAttempt, pickGoal, type Goal, type ReportQuestion } from "@/lib/summary";

/**
 * Đọc buổi luyện để xem lại / tổng kết. Dùng client thường nên RLS quyết định ai thấy gì:
 * học sinh thấy buổi của mình, giáo viên thấy buổi của học sinh trong lớp mình, người khác không thấy gì.
 */

export type SessionRow = {
  id: string;
  studentId: string;
  unitId: string;
  unitTitle: string;
  unitNo: number | null;
  status: "in_progress" | "completed";
  answered: number;
  total: number;
  startedAt: string;
  completedAt: string | null;
};

type FeedbackRow = { status: "ok" | "failed"; payload: FeedbackPayload | null };
const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

export async function listSessions(studentId: string, limit = 50): Promise<SessionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("practice_sessions")
    .select("id, student_id, unit_id, status, question_ids, started_at, completed_at, units(title, unit_no), session_answers(question_id)")
    .eq("student_id", studentId)
    .order("started_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((s) => {
    const unit = one(s.units as unknown as { title: string; unit_no: number } | null);
    return {
      id: s.id,
      studentId: s.student_id,
      unitId: s.unit_id,
      unitTitle: unit?.title ?? "Unit",
      unitNo: unit?.unit_no ?? null,
      status: s.status as SessionRow["status"],
      answered: new Set((s.session_answers as { question_id: string }[]).map((a) => a.question_id)).size,
      total: (s.question_ids as string[]).length,
      startedAt: s.started_at,
      completedAt: s.completed_at,
    };
  });
}

export type SessionReport = SessionRow & { questions: ReportQuestion[] };

/** Đầy đủ một buổi: các câu theo thứ tự, mọi lần trả lời, số đo, nhận xét đã lưu, đường nghe lại bản ghi (1 giờ). */
export async function loadReport(sessionId: string): Promise<SessionReport | null> {
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("practice_sessions")
    .select("id, student_id, unit_id, status, question_ids, started_at, completed_at, units(title, unit_no)")
    .eq("id", sessionId)
    .maybeSingle();
  if (!s) return null;

  const ids = s.question_ids as string[];
  const [{ data: qs }, { data: answers }] = await Promise.all([
    supabase.from("questions").select("id, text, keywords, expects_reason").in("id", ids),
    supabase
      .from("session_answers")
      .select("id, question_id, attempt_no, transcript_final, think_ms, speak_ms, hint_level, audio_path, answer_feedback(status, payload)")
      .eq("session_id", s.id)
      .order("attempt_no"),
  ]);

  const paths = (answers ?? []).map((a) => a.audio_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("recordings").createSignedUrls(paths, 3600);
    for (const x of signed ?? []) if (x.path && x.signedUrl && !x.error) urls.set(x.path, x.signedUrl);
  }

  const byId = new Map((qs ?? []).map((q) => [q.id, q]));
  const questions: ReportQuestion[] = ids
    .map((id) => byId.get(id))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => ({
      id: q.id,
      text: q.text,
      attempts: (answers ?? [])
        .filter((a) => a.question_id === q.id)
        .map((a) => {
          const fb = one(a.answer_feedback as unknown as FeedbackRow | FeedbackRow[] | null);
          const payload = fb?.status === "ok" && fb.payload?.version === 1 ? fb.payload : null;
          return {
            answerId: a.id,
            attemptNo: a.attempt_no,
            transcript: a.transcript_final,
            hintLevel: a.hint_level,
            audioUrl: a.audio_path ? (urls.get(a.audio_path) ?? null) : null,
            view: {
              attemptNo: a.attempt_no,
              measures: computeMeasures({
                thinkMs: a.think_ms,
                speakMs: a.speak_ms,
                transcript: a.transcript_final,
                keywords: q.keywords,
                expectsReason: q.expects_reason,
              }),
              status: payload ? "ok" : "failed",
              mock: payload?.mock ?? false,
              ai: payload?.feedback ?? null,
            },
          };
        }),
    }));

  const unit = one(s.units as unknown as { title: string; unit_no: number } | null);
  return {
    id: s.id,
    studentId: s.student_id,
    unitId: s.unit_id,
    unitTitle: unit?.title ?? "Unit",
    unitNo: unit?.unit_no ?? null,
    status: s.status as SessionRow["status"],
    answered: questions.filter((q) => q.attempts.length > 0).length,
    total: ids.length,
    startedAt: s.started_at,
    completedAt: s.completed_at,
    questions,
  };
}

export type Focus = { completed: number; goal: Goal | null };

/**
 * "Điểm cần cải thiện" trên dashboard: chỉ kết luận khi đã có đủ FOCUS_MIN_SESSIONS buổi hoàn thành,
 * dựa trên câu trả lời cuối của mỗi câu trong các buổi hoàn thành gần nhất. Chưa đủ thì goal = null.
 */
export async function improvementFocus(studentId: string): Promise<Focus> {
  const supabase = await createClient();
  const { data: done } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(FOCUS_MIN_SESSIONS);
  const count = done?.length ?? 0;
  if (count < FOCUS_MIN_SESSIONS) return { completed: count, goal: null };

  const { data: answers } = await supabase
    .from("session_answers")
    .select("session_id, question_id, attempt_no, transcript_final, think_ms, speak_ms, questions(keywords, expects_reason)")
    .in(
      "session_id",
      done!.map((d) => d.id),
    );
  const groups = new Map<string, ReportQuestion>();
  for (const a of answers ?? []) {
    const q = one(a.questions as unknown as { keywords: string[]; expects_reason: boolean } | null);
    if (!q) continue;
    const key = `${a.session_id}:${a.question_id}`;
    const g = groups.get(key) ?? { id: key, text: "", attempts: [] };
    g.attempts.push({
      answerId: key,
      attemptNo: a.attempt_no,
      transcript: a.transcript_final,
      hintLevel: 0,
      audioUrl: null,
      view: {
        attemptNo: a.attempt_no,
        measures: computeMeasures({ thinkMs: a.think_ms, speakMs: a.speak_ms, transcript: a.transcript_final, keywords: q.keywords, expectsReason: q.expects_reason }),
        status: "failed",
        mock: false,
        ai: null,
      },
    });
    groups.set(key, g);
  }
  const measures = [...groups.values()].map((g) => latestAttempt(g)!.view.measures);
  return { completed: count, goal: pickGoal(measures) };
}
