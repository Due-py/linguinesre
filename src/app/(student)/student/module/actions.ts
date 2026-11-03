"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPractice } from "@/lib/research/server";
import { mockAi, takeQuota } from "@/lib/usage";
import { getModule, moduleAttempts, openLesson, ownLesson, attemptCount, toReport } from "@/lib/module/server";
import { moduleReport, type ModuleReport } from "@/lib/module/report";
import { assessAnswer, unitScope } from "@/lib/module/ai";
import { errorTagsOf, type VerifiedAssessment } from "@/lib/module/assessCore";
import type { PlannedStep } from "@/lib/module/plan";
import { firstOpenStep, SKIP_TURN } from "@/lib/module/progress";

const UUID = z.uuid();

async function student() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role, grade, onboarded_at").eq("id", user.id).maybeSingle();
  if (me?.role !== "student" || !me.onboarded_at) return null;
  if (!(await canPractice(user.id))) return null;
  return { supabase, userId: user.id, grade: me.grade as number | null };
}

/** Mở bài của một ngày (lập bài nếu chưa có) rồi vào màn hình học. */
export async function startLesson(formData: FormData) {
  const moduleId = UUID.safeParse(formData.get("moduleId"));
  const day = z.coerce.number().int().min(1).max(14).safeParse(formData.get("day"));
  if (!moduleId.success || !day.success) redirect("/student/practice");
  const me = await student();
  if (!me) redirect("/student");
  const id = await openLesson(me.userId, me.grade, moduleId.data, day.data);
  if (!id) redirect(`/student/module/${moduleId.data}?error=open`);
  redirect(`/student/module/${moduleId.data}/bai/${id}`);
}

type Base = { lessonId: string; step: number };
async function stepOf(input: Base, userId: string) {
  const lesson = await ownLesson(input.lessonId, userId);
  if (!lesson || lesson.status !== "in_progress") return null;
  const st = lesson.plan.steps.find((s) => s.n === input.step) as PlannedStep | undefined;
  return st ? { lesson, st } : null;
}

async function insertAttempt(row: Record<string, unknown>) {
  const { data, error } = await createAdminClient().from("module_attempts").insert(row).select("id").single();
  return error ? null : data.id;
}

export type QuizResult = { ok: true; correct: boolean; answer: number; explainVi: string } | { ok: false; error: string };

/** Chấm câu trắc nghiệm ở MÁY CHỦ theo bài đã lập (trình duyệt không tự báo đúng/sai). Mỗi câu trả lời một lần. */
export async function answerQuiz(input: Base & { choice: number }): Promise<QuizResult> {
  const me = await student();
  if (!me) return { ok: false, error: "Bạn cần đăng nhập lại." };
  const found = await stepOf(input, me.userId);
  if (!found || found.st.t !== "quiz") return { ok: false, error: "Không tìm thấy câu hỏi này." };
  const { lesson, st } = found;
  if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice >= st.q.options.length) return { ok: false, error: "Lựa chọn không hợp lệ." };
  const correct = input.choice === st.q.answer;
  if ((await attemptCount(lesson.id, st.n, 0)) === 0) {
    const id = await insertAttempt({
      lesson_id: lesson.id,
      student_id: me.userId,
      module_id: lesson.moduleId,
      day: lesson.day,
      step: st.n,
      kind: "quiz",
      item_ref: st.ref,
      quiz_set: st.set,
      area: st.q.area,
      answer: st.q.options[input.choice],
      correct,
      // Câu ngữ pháp sai được ghi vào Error Memory theo nhãn lỗi của cấu trúc đó.
      error_tags: !correct && st.q.errorTag ? [st.q.errorTag] : [],
      check_result: { test: st.set === "entry" || st.set === "final" || st.set === "check1" || st.set === "check2" },
    });
    if (!id) return { ok: false, error: "Chưa lưu được câu trả lời. Hãy thử lại." };
  }
  return { ok: true, correct, answer: st.q.answer, explainVi: st.q.explainVi };
}

export type ArrangeResult = { ok: true; correct: boolean; sentence: string } | { ok: false; error: string };

/** Sentence Building: so thứ tự học sinh xếp với thứ tự đúng trong nội dung. */
export async function submitArrange(input: Base & { order: string[] }): Promise<ArrangeResult> {
  const me = await student();
  if (!me) return { ok: false, error: "Bạn cần đăng nhập lại." };
  const found = await stepOf(input, me.userId);
  if (!found || found.st.t !== "arrange") return { ok: false, error: "Không tìm thấy bài xếp câu này." };
  const { lesson, st } = found;
  const m = await getModule(lesson.moduleId);
  const b = m?.content.build.find((x) => x.id === st.ref);
  if (!b || !Array.isArray(input.order) || input.order.length !== b.chunks.length) return { ok: false, error: "Hãy xếp đủ các mảnh." };
  const correct = input.order.every((c, i) => c === b.chunks[i]);
  const n = await attemptCount(lesson.id, st.n, 0);
  if (n < 3) {
    await insertAttempt({
      lesson_id: lesson.id,
      student_id: me.userId,
      module_id: lesson.moduleId,
      day: lesson.day,
      step: st.n,
      turn: 0,
      attempt_no: n + 1,
      kind: "arrange",
      item_ref: st.ref,
      answer: input.order.join(" | ").slice(0, 4000),
      correct,
      error_tags: !correct && b.grammarId ? [m!.content.grammar.find((g) => g.id === b.grammarId)?.errorTag ?? "word_order"] : [],
    });
  }
  return { ok: true, correct, sentence: b.chunks.join(" ") };
}

/** Bước chỉ đọc (thẻ kiến thức, báo cáo) hoặc học sinh bỏ qua phần nói: ghi nhận đã qua để bài hoàn thành được. */
export async function markStep(input: Base & { skipped: boolean }): Promise<{ ok: boolean }> {
  const me = await student();
  if (!me) return { ok: false };
  const found = await stepOf(input, me.userId);
  if (!found) return { ok: false };
  const { lesson, st } = found;
  const turn = input.skipped ? SKIP_TURN : 0;
  if ((await attemptCount(lesson.id, st.n, turn)) > 0) return { ok: true };
  const id = await insertAttempt({
    lesson_id: lesson.id,
    student_id: me.userId,
    module_id: lesson.moduleId,
    day: lesson.day,
    step: st.n,
    turn,
    kind: st.t,
    item_ref: st.ref,
    check_result: input.skipped ? { skipped: true, test: "test" in st && st.test === true } : null,
  });
  return { ok: !!id };
}

export type AssessView = { ok: true; assessment: VerifiedAssessment; mock: boolean } | { ok: false; error: string };

/**
 * AI nhận xét theo tiêu chí cho một lượt nói (câu hỏi) hoặc cả cuộc roleplay (lượt cuối). Đã có thì trả lại, không gọi AI lần
 * nữa. Lỗi ngữ pháp đã kiểm chứng được ghi nhãn vào Error Memory.
 */
export async function requestAssess(attemptId: string): Promise<AssessView> {
  const id = UUID.safeParse(attemptId);
  if (!id.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const me = await student();
  if (!me) return { ok: false, error: "Bạn cần đăng nhập lại." };
  // RLS: chỉ đọc được lượt của chính mình.
  const { data: a } = await me.supabase
    .from("module_attempts")
    .select("id, lesson_id, step, turn, kind, item_ref, answer, ai, ai_status")
    .eq("id", id.data)
    .eq("student_id", me.userId)
    .maybeSingle();
  if (!a || (a.kind !== "speak" && a.kind !== "roleplay") || !a.answer) return { ok: false, error: "Không tìm thấy lượt nói này." };
  if (a.ai_status === "ok" && a.ai) return { ok: true, assessment: a.ai as VerifiedAssessment, mock: mockAi() };

  const lesson = await ownLesson(a.lesson_id, me.userId);
  const st = lesson?.plan.steps.find((s) => s.n === a.step);
  const m = lesson ? await getModule(lesson.moduleId) : null;
  if (!lesson || !st || !m) return { ok: false, error: "Không tìm thấy bài học." };

  let question = "";
  let expectsReason = false;
  let reference: string | null = null;
  let transcript = a.answer;
  if (st.t === "speak") {
    question = a.turn === 1 && st.retry ? st.retry.text : st.text;
    expectsReason = st.expectsReason;
    reference = st.hints.find((h) => h.level === 4)?.body ?? null;
  } else if (st.t === "roleplay") {
    const r = m.content.roleplays.find((x) => x.id === st.ref);
    if (!r) return { ok: false, error: "Không tìm thấy tình huống." };
    const { data: turns } = await me.supabase.from("module_attempts").select("turn, answer").eq("lesson_id", lesson.id).eq("step", st.n).order("turn");
    transcript = (turns ?? []).map((x) => (x.answer ?? "").trim().replace(/[.!?]*$/, ".")).join(" ");
    question = `Role-play task: ${r.goal}`;
    expectsReason = r.requirements.some((q) => q.kind === "reason");
  } else return { ok: false, error: "Bước này không có nhận xét." };

  if (!mockAi() && !(await takeQuota(me.userId, "feedback"))) return { ok: false, error: "Bạn vừa xin nhận xét nhiều lần liên tục. Hãy nghỉ một phút rồi thử lại." };
  const r = await assessAnswer({ grade: m.grade, question, expectsReason, reference, ...unitScope(m.content) }, transcript);
  if (!r.ok) console.error("module assess failed", { attemptId: a.id, model: r.model, reason: r.reason });
  await createAdminClient()
    .from("module_attempts")
    .update(r.ok ? { ai: r.assessment, ai_status: "ok", error_tags: errorTagsOf(r.assessment) } : { ai_status: "failed" })
    .eq("id", a.id);
  return r.ok ? { ok: true, assessment: r.assessment, mock: r.mock } : { ok: false, error: "Chưa lấy được nhận xét của AI. Em vẫn đi tiếp được." };
}

/** Báo cáo module mới nhất (cho bước "Kết quả" giữa bài): tính từ các lượt làm thật. */
export async function loadReport(lessonId: string): Promise<ModuleReport | null> {
  const me = await student();
  if (!me) return null;
  const lesson = await ownLesson(lessonId, me.userId);
  const m = lesson ? await getModule(lesson.moduleId) : null;
  if (!lesson || !m) return null;
  return moduleReport(m.content, toReport(await moduleAttempts(me.userId, m.id)));
}

/** Kết thúc bài: chỉ khi bước nào cũng đã làm (hoặc đã bỏ qua). */
export async function completeLesson(formData: FormData) {
  const id = UUID.safeParse(formData.get("lessonId"));
  if (!id.success) redirect("/student/practice");
  const me = await student();
  if (!me) redirect("/student");
  const lesson = await ownLesson(id.data, me.userId);
  if (!lesson) redirect("/student/practice");
  if (lesson.status === "in_progress") {
    const admin = createAdminClient();
    const [{ data: rows }, m] = await Promise.all([admin.from("module_attempts").select("step, turn").eq("lesson_id", lesson.id), getModule(lesson.moduleId)]);
    if (!m || firstOpenStep(lesson.plan.steps, rows ?? [], m.content) !== null) redirect(`/student/module/${lesson.moduleId}/bai/${lesson.id}`);
    await admin.from("module_lessons").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", lesson.id).eq("status", "in_progress");
  }
  redirect(`/student/module/${lesson.moduleId}?xong=${lesson.day}`);
}
