"use server";

// Luyện tự do 5 câu đã bỏ (09/11): mọi việc học đi qua Hành trình. File này chỉ còn phần nhận xét AI cho câu trả lời đã lưu
// (trang tổng kết các buổi luyện cũ và kiểu dữ liệu FeedbackView mà chế độ nghiên cứu A/B dùng chung).

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
