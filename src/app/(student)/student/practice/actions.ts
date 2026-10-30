"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickQuestions, type Candidate } from "@/lib/speaking/select";
import { computeMeasures, type Measures } from "@/lib/feedback/measures";
import type { VerifiedFeedback } from "@/lib/feedback/core";
import { generateFeedback, type FeedbackPayload } from "@/lib/feedback/generate";
import { mockAi, takeQuota } from "@/lib/usage";
import { canPractice } from "@/lib/research/server";

const UUID = z.uuid();

/** Người tham gia nghiên cứu chỉ luyện qua chế độ A/B cho tới khi nghiên cứu kết thúc (canPractice; RLS 0009 cũng chặn). */
const LOCKED = "Trong thời gian nghiên cứu, bạn luyện ở trang chính (Chế độ A hoặc B).";

async function studentContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role, grade, onboarded_at").eq("id", user.id).maybeSingle();
  return me?.role === "student" && me.onboarded_at ? { supabase, userId: user.id, grade: me.grade as number | null } : null;
}

/** Mở buổi luyện cho một Unit. Đang có buổi dở của Unit này thì đi tiếp buổi đó, không tạo buổi mới. */
export async function startSession(formData: FormData) {
  const unitId = UUID.safeParse(formData.get("unitId"));
  if (!unitId.success) redirect("/student/practice");
  const ctx = await studentContext();
  if (!ctx) redirect("/login");
  const { supabase, userId } = ctx;
  if (!(await canPractice(userId))) redirect("/student");

  const { data: open } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("student_id", userId)
    .eq("unit_id", unitId.data)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) redirect(`/student/practice/session/${open.id}`);

  // RLS: chỉ câu hỏi của Unit đã duyệt mới đọc được.
  const { data: questions } = await supabase.from("questions").select("id, difficulty").eq("unit_id", unitId.data).eq("active", true);
  if (!questions?.length) redirect("/student/practice");

  const { data: past } = await supabase
    .from("session_answers")
    .select("question_id")
    .eq("student_id", userId)
    .in("question_id", questions.map((q) => q.id));
  const times = new Map<string, number>();
  for (const a of past ?? []) times.set(a.question_id, (times.get(a.question_id) ?? 0) + 1);

  const chosen = pickQuestions(questions as Candidate[], times, Date.now() % 2 ** 31);
  const { data: session, error } = await supabase
    .from("practice_sessions")
    .insert({ student_id: userId, unit_id: unitId.data, question_ids: chosen.map((q) => q.id) })
    .select("id")
    .single();
  if (error || !session) redirect(`/student/practice/${unitId.data}?error=start`);
  redirect(`/student/practice/session/${session.id}`);
}

const answerSchema = z.object({
  sessionId: UUID,
  questionId: UUID,
  shownAt: z.iso.datetime(),
  promptEndedAt: z.iso.datetime(),
  thinkMs: z.number().int().min(0).max(120_000).nullable(),
  speakMs: z.number().int().min(0).max(120_000).nullable(),
  transcriptRaw: z.string().max(2000),
  transcriptFinal: z.string().trim().min(1, "Câu trả lời đang trống.").max(2000),
  transcriptConfidence: z.number().min(0).max(1).nullable(),
  hintLevel: z.number().int().min(0).max(4),
  audioPath: z.string().max(300).nullable(),
});
export type AnswerInput = z.infer<typeof answerSchema>;
export type SaveAnswerResult = { ok: true; answerId: string; attemptNo: number } | { ok: false; error: string };

/** Lưu một câu trả lời (sau khi học sinh đã xem/sửa chữ ghi lời). Quyền ghi do RLS bảo đảm. */
export async function saveAnswer(input: AnswerInput): Promise<SaveAnswerResult> {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const ctx = await studentContext();
  if (!ctx) return { ok: false, error: "Bạn cần đăng nhập lại." };
  if (!(await canPractice(ctx.userId))) return { ok: false, error: LOCKED };
  const v = parsed.data;
  if (v.audioPath && !v.audioPath.startsWith(`${ctx.userId}/${v.sessionId}/`)) return { ok: false, error: "Bản ghi không hợp lệ." };

  const { count } = await ctx.supabase
    .from("session_answers")
    .select("id", { count: "exact", head: true })
    .eq("session_id", v.sessionId)
    .eq("question_id", v.questionId);
  const attemptNo = (count ?? 0) + 1;
  if (attemptNo > 3) return { ok: false, error: "Mỗi câu được trả lời tối đa 3 lần." };

  const { data, error } = await ctx.supabase
    .from("session_answers")
    .insert({
      session_id: v.sessionId,
      student_id: ctx.userId,
      question_id: v.questionId,
      attempt_no: attemptNo,
      shown_at: v.shownAt,
      prompt_ended_at: v.promptEndedAt,
      think_ms: v.thinkMs,
      speak_ms: v.speakMs,
      transcript_raw: v.transcriptRaw,
      transcript_final: v.transcriptFinal,
      transcript_edited: v.transcriptFinal !== v.transcriptRaw.trim(),
      transcript_confidence: v.transcriptConfidence,
      hint_level: v.hintLevel,
      audio_path: v.audioPath,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Chưa lưu được câu trả lời. Hãy thử lại." };
  return { ok: true, answerId: data.id, attemptNo };
}

export type FeedbackView = {
  attemptNo: number;
  /** Đo trực tiếp bằng quy tắc, không qua AI. */
  measures: Measures;
  /** "failed": AI lỗi hoặc trả sai lược đồ; giao diện nói "Chưa có nhận xét" và vẫn cho đi tiếp. */
  status: "ok" | "failed";
  mock: boolean;
  ai: VerifiedFeedback | null;
};
export type FeedbackResult = { ok: true; view: FeedbackView } | { ok: false; error: string };

/**
 * Phản hồi cho MỘT câu trả lời đã lưu. Đã có phản hồi tốt thì trả lại, không gọi AI lần nữa; lần trước lỗi thì thử lại.
 * Chỉ máy chủ ghi answer_feedback (khóa service role) sau khi đã kiểm tra câu trả lời thuộc về học sinh này.
 */
export async function requestFeedback(answerId: string): Promise<FeedbackResult> {
  const id = UUID.safeParse(answerId);
  if (!id.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const ctx = await studentContext();
  if (!ctx) return { ok: false, error: "Bạn cần đăng nhập lại." };
  if (!(await canPractice(ctx.userId))) return { ok: false, error: LOCKED };

  // RLS: học sinh chỉ đọc được câu trả lời của chính mình.
  const { data: a } = await ctx.supabase
    .from("session_answers")
    .select("id, attempt_no, think_ms, speak_ms, transcript_final, questions(text, kind, keywords, expects_reason)")
    .eq("id", id.data)
    .eq("student_id", ctx.userId)
    .maybeSingle();
  const q = a?.questions as unknown as { text: string; kind: string; keywords: string[]; expects_reason: boolean } | null;
  if (!a || !q) return { ok: false, error: "Không tìm thấy câu trả lời này." };

  const measures = computeMeasures({
    thinkMs: a.think_ms,
    speakMs: a.speak_ms,
    transcript: a.transcript_final,
    keywords: q.keywords,
    expectsReason: q.expects_reason,
  });
  const view = (payload: FeedbackPayload | null): FeedbackResult => ({
    ok: true,
    view: { attemptNo: a.attempt_no, measures, status: payload ? "ok" : "failed", mock: payload?.mock ?? false, ai: payload?.feedback ?? null },
  });

  const { data: existing } = await ctx.supabase.from("answer_feedback").select("status, payload").eq("answer_id", a.id).maybeSingle();
  if (existing?.status === "ok" && (existing.payload as FeedbackPayload | null)?.version === 1) return view(existing.payload as FeedbackPayload);

  const mock = mockAi();
  if (!mock && !(await takeQuota(ctx.userId, "feedback")))
    return { ok: false, error: "Bạn vừa xin nhận xét nhiều lần liên tục. Hãy nghỉ một phút rồi thử lại." };

  const r = await generateFeedback({ text: q.text, kind: q.kind, expectsReason: q.expects_reason, keywords: q.keywords, grade: ctx.grade ?? undefined }, a.transcript_final, mock);
  // Ghi nhật ký lý do lỗi, không ghi chữ ghi lời của học sinh.
  if (!r.ok) console.error("feedback failed", { answerId: a.id, model: r.model, reason: r.reason });

  const { error } = await createAdminClient()
    .from("answer_feedback")
    .upsert(
      { answer_id: a.id, student_id: ctx.userId, status: r.ok ? "ok" : "failed", model: r.model, payload: r.ok ? r.payload : null, created_at: new Date().toISOString() },
      { onConflict: "answer_id" },
    );
  if (error) console.error("feedback save failed", { answerId: a.id, error: error.message });
  return view(r.ok ? r.payload : null);
}

/**
 * Kết thúc buổi rồi mở trang tổng kết. complete_session (0005) chỉ đánh dấu hoàn thành khi mọi câu đã có câu trả lời;
 * chưa đủ thì trang tổng kết tự báo "chưa xong" và mời làm tiếp.
 */
export async function finishSession(formData: FormData) {
  const id = UUID.safeParse(formData.get("sessionId"));
  if (!id.success) redirect("/student");
  const ctx = await studentContext();
  if (!ctx) redirect("/login");
  if (!(await canPractice(ctx.userId))) redirect("/student");
  await ctx.supabase.rpc("complete_session", { sid: id.data });
  redirect(`/student/sessions/${id.data}`);
}

/** Học sinh bấm "Nói lại" trước khi lưu: xóa bản ghi vừa gửi để không giữ file không cần thiết. */
export async function discardRecording(path: string): Promise<void> {
  const ctx = await studentContext();
  if (!ctx || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(webm|m4a|ogg)$/.test(path) || !path.startsWith(`${ctx.userId}/`)) return;
  await ctx.supabase.storage.from("recordings").remove([path]);
}
