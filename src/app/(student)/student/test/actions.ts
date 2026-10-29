"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant, nextItem, openAttempt, ownAttempt, testState } from "@/lib/research/server";

async function participantContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await getParticipant(user.id);
  return p ? { userId: user.id, p } : null;
}

/** Mở bài kiểm tra đang đến hạn (đầu vào hoặc đầu ra). Đề do thứ tự đề đã bốc thăm quyết định, học sinh không chọn. */
export async function startTest() {
  const ctx = await participantContext();
  if (!ctx) redirect("/student");
  const state = await testState(ctx.userId, ctx.p);
  if (!state.due) redirect("/student/test");
  await openAttempt(ctx.userId, ctx.p, state.due, (await headers()).get("user-agent") ?? "");
  redirect("/student/test");
}

/** Kết thúc lượt làm khi đã ghi âm đủ mọi câu (kể cả câu làm mẫu). */
export async function finishTest(attemptId: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(attemptId).success) return { ok: false };
  const ctx = await participantContext();
  if (!ctx) return { ok: false };
  const attempt = await ownAttempt(attemptId, ctx.userId);
  if (!attempt) return { ok: false };
  if (await nextItem(attempt.id, ctx.p.grade, attempt.form)) return { ok: false };
  const { error } = await createAdminClient()
    .from("test_attempts")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", attempt.id)
    .eq("status", "in_progress");
  return { ok: !error };
}
