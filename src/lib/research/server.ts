import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formFor } from "@/lib/research/testForm";

/**
 * Phần nghiên cứu ở máy chủ: người tham gia, trạng thái bài kiểm tra, câu tiếp theo.
 * Đọc dòng tham gia bằng client thường (RLS: chỉ dòng của mình). Bảng đề và bài làm chỉ đọc/ghi bằng khóa máy chủ,
 * SAU khi đã kiểm tra lượt làm thuộc về người đang đăng nhập.
 */

export type Participant = { code: string; grade: number; formOrder: "AB" | "BA"; arm: "A" | "B" | null; pilot: boolean };
export type Phase = "pre" | "post";
export type Attempt = { id: string; phase: Phase; form: "A" | "B"; status: "in_progress" | "completed" };

export async function getParticipant(userId: string): Promise<Participant | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("research_participants")
    .select("code, grade, form_order, arm, pilot")
    .eq("student_id", userId)
    .maybeSingle();
  if (!data) return null;
  return { code: data.code, grade: data.grade, formOrder: data.form_order, arm: data.arm, pilot: data.pilot };
}

export async function postTestOpen(): Promise<boolean> {
  const { data } = await createAdminClient().from("research_settings").select("value").eq("key", "post_test_open").maybeSingle();
  return data?.value === true;
}

export type TestState = {
  pre: Attempt | null;
  post: Attempt | null;
  /** Lần kiểm tra học sinh cần làm bây giờ (null = không có bài nào đang mở). */
  due: Phase | null;
};

/** Bài đầu vào luôn mở cho tới khi xong. Bài đầu ra mở khi nhóm bật post_test_open (người thử đề: mở ngay sau bài đầu). */
export async function testState(userId: string, p: Participant): Promise<TestState> {
  const supabase = await createClient();
  const { data } = await supabase.from("test_attempts").select("id, phase, form, status").eq("student_id", userId);
  const pre = (data?.find((a) => a.phase === "pre") as Attempt | undefined) ?? null;
  const post = (data?.find((a) => a.phase === "post") as Attempt | undefined) ?? null;
  let due: Phase | null = null;
  if (pre?.status !== "completed") due = "pre";
  else if (post?.status !== "completed" && (p.pilot || (await postTestOpen()))) due = "post";
  return { pre, post, due };
}

/** Mở (hoặc lấy lại) lượt làm của lần kiểm tra đang đến hạn. Đề do thứ tự đề đã bốc thăm quyết định. */
export async function openAttempt(userId: string, p: Participant, phase: Phase, userAgent: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("test_attempts").select("id").eq("student_id", userId).eq("phase", phase).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await admin
    .from("test_attempts")
    .insert({ student_id: userId, phase, form: formFor(p.formOrder, phase), user_agent: userAgent.slice(0, 300) })
    .select("id")
    .single();
  return error ? null : data.id;
}

/**
 * Ai được vào chế độ luyện nói (LINGUA-REFLEX): học sinh không tham gia nghiên cứu, hoặc người tham gia thuộc chế độ A
 * và không có bài kiểm tra đang đến hạn. Chưa chia nhóm thì chưa luyện (luyện trước bài đầu vào làm sai số đo).
 */
export async function canPractice(userId: string): Promise<boolean> {
  const p = await getParticipant(userId);
  if (!p) return true;
  if (p.arm !== "A") return false;
  return (await testState(userId, p)).due === null;
}

export type TestItem ={ id: string; text: string; warmup: boolean; number: number; total: number; warmupCount: number };

/** Lượt làm thuộc về học sinh này và còn đang làm. */
export async function ownAttempt(attemptId: string, userId: string) {
  const { data } = await createAdminClient()
    .from("test_attempts")
    .select("id, student_id, form, status, phase")
    .eq("id", attemptId)
    .maybeSingle();
  return data && data.student_id === userId && data.status === "in_progress" ? data : null;
}

/** Thứ tự: 2 câu làm mẫu (W) rồi 15 câu của đề. Trả câu đầu tiên chưa ghi âm; null nếu đã làm hết. */
export async function nextItem(attemptId: string, grade: number, form: "A" | "B"): Promise<TestItem | null> {
  const admin = createAdminClient();
  const [{ data: items }, { data: done }] = await Promise.all([
    admin.from("test_items").select("id, form, position, text").eq("grade", grade).in("form", ["W", form]),
    admin.from("test_responses").select("item_id").eq("attempt_id", attemptId),
  ]);
  const order = (items ?? []).sort((a, b) => (a.form === b.form ? a.position - b.position : a.form === "W" ? -1 : 1));
  const answered = new Set((done ?? []).map((d) => d.item_id));
  const warmupCount = order.filter((i) => i.form === "W").length;
  const idx = order.findIndex((i) => !answered.has(i.id));
  if (idx === -1) return null;
  const it = order[idx];
  return { id: it.id, text: it.text, warmup: it.form === "W", number: idx + 1, total: order.length, warmupCount };
}

/** Trang luyện nói: người không được luyện lúc này thì về trang chính (trang chính giải thích vì sao). */
export async function requirePracticeAccess(userId: string): Promise<void> {
  if (!(await canPractice(userId))) redirect("/student");
}
