import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ModeRunner from "@/components/ModeRunner";
import ReadRunner from "@/components/ReadRunner";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getParticipant } from "@/lib/research/server";
import { modeAccess, ownModeSession, sessionTurns, speedHistory } from "@/lib/research/modeServer";
import { speedLevel } from "@/lib/research/modes";

export const metadata: Metadata = { title: "Buổi luyện" };
export const dynamic = "force-dynamic";

export default async function ModeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const profile = await requireRole("student");
  const p = await getParticipant(profile.id);
  if (!p) redirect("/student");
  const s = await ownModeSession(id, profile.id);
  if (!s) notFound();
  if (s.status === "completed") redirect("/student");
  // Bài kiểm tra đến hạn hoặc chế độ chưa mở thì không luyện tiếp (ví dụ: nhóm vừa mở bài kiểm tra lần 2).
  if (!(await modeAccess(profile.id, p)).ok) redirect("/student");

  const [turns, history, { data: row }] = await Promise.all([
    sessionTurns(s.id),
    speedHistory(profile.id),
    createAdminClient().from("mode_sessions").select("active_ms").eq("id", s.id).single(),
  ]);
  const savedSteps = [...new Set(turns.map((t) => t.step))];
  const common = {
    sessionId: s.id,
    sessionNo: s.session_no,
    unitNo: s.unit_no,
    unitTitle: s.plan.unitTitle,
    steps: s.plan.steps,
    savedSteps,
    activeMs: row?.active_ms ?? 0,
  };
  return s.mode === "A" ? <ModeRunner {...common} startLimitMs={speedLevel(history)} /> : <ReadRunner {...common} />;
}
