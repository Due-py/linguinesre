"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/research/server";
import { hasCheckin, modeAccess, openModeSession, ownModeSession, researchSettings, sessionTurns, thisWeek } from "@/lib/research/modeServer";
import { planDone } from "@/lib/research/modes";

async function participantContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const p = await getParticipant(user.id);
  return p ? { userId: user.id, p } : null;
}

/** Mở buổi luyện hôm nay (chế độ do nhóm nghiên cứu gán, học sinh không chọn). Cần trả lời câu hỏi tuần trước. */
export async function startModeSession() {
  const ctx = await participantContext();
  if (!ctx) redirect("/student");
  const settings = await researchSettings();
  const access = await modeAccess(ctx.userId, ctx.p, settings);
  if (!access.ok) redirect("/student");
  if (!(await hasCheckin(ctx.userId))) redirect("/student?luyen=checkin");
  const r = await openModeSession(ctx.userId, ctx.p, access.mode, settings, (await headers()).get("user-agent") ?? "");
  if (!r.ok) redirect(`/student?luyen=${r.reason}`);
  redirect(`/student/luyen/${r.id}`);
}

const checkinSchema = z.object({
  practised: z.enum(["yes", "no"]),
  detail: z.string().trim().max(300).optional(),
});

/** Câu hỏi hằng tuần (mục 2.4): ghi một lần mỗi tuần, ghi bằng khóa máy chủ sau khi xác định đúng học sinh. */
export async function submitCheckin(formData: FormData) {
  const ctx = await participantContext();
  if (!ctx) redirect("/student");
  const parsed = checkinSchema.safeParse({ practised: formData.get("practised"), detail: formData.get("detail") ?? undefined });
  if (!parsed.success) redirect("/student?luyen=checkin");
  await createAdminClient()
    .from("weekly_checkins")
    .upsert(
      {
        student_id: ctx.userId,
        week_start: thisWeek(),
        practised_elsewhere: parsed.data.practised === "yes",
        detail: parsed.data.practised === "yes" ? parsed.data.detail || null : null,
      },
      { onConflict: "student_id,week_start", ignoreDuplicates: true },
    );
  redirect("/student");
}

/** Kết thúc buổi khi mọi bước đã có ít nhất một lượt được lưu. */
export async function finishModeSession(sessionId: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(sessionId).success) return { ok: false };
  const ctx = await participantContext();
  if (!ctx) return { ok: false };
  const s = await ownModeSession(sessionId, ctx.userId);
  if (!s) return { ok: false };
  if (s.status === "completed") return { ok: true };
  const saved = new Set((await sessionTurns(s.id)).map((t) => t.step));
  if (!planDone(s.plan, saved)) return { ok: false };
  const { error } = await createAdminClient()
    .from("mode_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", s.id)
    .eq("status", "in_progress");
  return { ok: !error };
}
