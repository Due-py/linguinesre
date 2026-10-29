import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { testState, type Participant } from "@/lib/research/server";
import { modeContentSchema, type ModeUnit } from "@/lib/research/modeContent";
import { buildPlanA, buildPlanB, unitForSession, vnDay, vnWeekStart, type Mode, type Plan, type UnitData } from "@/lib/research/modes";
import grade8Modes from "../../../content/research/grade-8-modes.json";

/**
 * Hai chế độ luyện của nghiên cứu ở máy chủ: ai được luyện chế độ nào, mở buổi hôm nay, đọc buổi đang làm.
 * Bảng mode_* chỉ máy chủ ghi (khóa máy chủ), sau khi đã kiểm tra người đang đăng nhập.
 */

const MODE_CONTENT = new Map([[8, modeContentSchema.parse(grade8Modes)]]);
export const modeUnit = (grade: number, unitNo: number): ModeUnit | null =>
  MODE_CONTENT.get(grade)?.units.find((u) => u.unit === unitNo) ?? null;

export type ResearchSettings = { practiceOpen: boolean; practiceUnits: number[]; studyOver: boolean; postTestOpen: boolean };

export async function researchSettings(): Promise<ResearchSettings> {
  const { data } = await createAdminClient().from("research_settings").select("key, value");
  const v = new Map((data ?? []).map((r) => [r.key, r.value]));
  const units = v.get("practice_units");
  return {
    practiceOpen: v.get("practice_open") === true,
    practiceUnits: Array.isArray(units) ? units.filter((x): x is number => Number.isInteger(x)) : [1, 2, 3],
    studyOver: v.get("study_over") === true,
    postTestOpen: v.get("post_test_open") === true,
  };
}

export type ModeAccess =
  | { ok: true; mode: Mode }
  | { ok: false; reason: "test_due" | "no_arm" | "not_open" | "no_content" };

/**
 * Chế độ luyện của người tham gia lúc này. Bài kiểm tra đến hạn luôn làm trước; chưa chia nhóm thì chưa luyện;
 * hai chế độ chỉ mở khi nhóm bật practice_open (người thử đề luôn mở); sau study_over mọi người dùng chế độ A.
 */
export async function modeAccess(userId: string, p: Participant, s?: ResearchSettings): Promise<ModeAccess> {
  const settings = s ?? (await researchSettings());
  if ((await testState(userId, p)).due) return { ok: false, reason: "test_due" };
  if (!p.arm) return { ok: false, reason: "no_arm" };
  if (!settings.practiceOpen && !p.pilot && !settings.studyOver) return { ok: false, reason: "not_open" };
  const mode: Mode = settings.studyOver ? "A" : p.arm;
  if (!MODE_CONTENT.has(p.grade)) return { ok: false, reason: "no_content" };
  return { ok: true, mode };
}

export type ModeSessionRow = {
  id: string;
  mode: Mode;
  session_no: number;
  unit_no: number;
  day: string;
  status: "in_progress" | "completed";
  active_ms: number;
  started_at: string;
  completed_at: string | null;
};

export async function listModeSessions(userId: string): Promise<ModeSessionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mode_sessions")
    .select("id, mode, session_no, unit_no, day, status, active_ms, started_at, completed_at")
    .eq("student_id", userId)
    .order("session_no");
  return (data ?? []) as ModeSessionRow[];
}

export const thisWeek = () => vnWeekStart(new Date());
export const today = () => vnDay(new Date());

export async function hasCheckin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("weekly_checkins").select("week_start").eq("student_id", userId).eq("week_start", thisWeek()).maybeSingle();
  return !!data;
}

async function loadUnitData(grade: number, unitNo: number): Promise<UnitData | null> {
  const admin = createAdminClient();
  const { data: u } = await admin.from("units").select("id, unit_no, title").eq("grade", grade).eq("unit_no", unitNo).eq("status", "approved").maybeSingle();
  if (!u) return null;
  const [{ data: vocab }, { data: frames }, { data: qs }] = await Promise.all([
    admin.from("vocab").select("key, en, vi, example").eq("unit_id", u.id).order("key"),
    admin.from("frames").select("key, text, vi, examples").eq("unit_id", u.id).order("key"),
    admin
      .from("questions")
      .select("id, key, text, difficulty, kind, keywords, frame_key, hint_direction_vi, example_answer, expects_reason")
      .eq("unit_id", u.id)
      .eq("active", true)
      .order("key"),
  ]);
  return {
    unitNo: u.unit_no,
    title: u.title,
    vocab: vocab ?? [],
    frames: frames ?? [],
    questions: (qs ?? []).map((q) => ({
      id: q.id,
      key: q.key,
      text: q.text,
      difficulty: q.difficulty,
      kind: q.kind,
      keywords: q.keywords,
      frameKey: q.frame_key,
      hintDirectionVi: q.hint_direction_vi,
      exampleAnswer: q.example_answer,
      expectsReason: q.expects_reason,
    })),
  };
}

export type StartResult = { ok: true; id: string } | { ok: false; reason: "done_today" | "no_unit" | "error" };

/**
 * Mở buổi hôm nay (hoặc trả buổi đang làm của hôm nay). Mỗi ngày một buổi để hai chế độ có cùng "liều" luyện
 * (5 buổi/tuần, mục 2.4); người thử đề được mở nhiều buổi.
 */
export async function openModeSession(userId: string, p: Participant, mode: Mode, settings: ResearchSettings, userAgent: string): Promise<StartResult> {
  const admin = createAdminClient();
  const day = today();
  const { data: mine } = await admin.from("mode_sessions").select("id, session_no, day, status").eq("student_id", userId).order("session_no");
  const todays = (mine ?? []).filter((s) => s.day === day);
  const open = todays.find((s) => s.status === "in_progress");
  if (open) return { ok: true, id: open.id };
  if (todays.length > 0 && !p.pilot) return { ok: false, reason: "done_today" };

  const sessionNo = (mine?.at(-1)?.session_no ?? 0) + 1;
  const unitNo = unitForSession(sessionNo, settings.practiceUnits);
  const extras = modeUnit(p.grade, unitNo);
  const unit = await loadUnitData(p.grade, unitNo);
  if (!extras || !unit) return { ok: false, reason: "no_unit" };
  const plan: Plan = mode === "A" ? buildPlanA(sessionNo, unit, extras) : buildPlanB(sessionNo, unitNo, unit.title, extras);

  const { data, error } = await admin
    .from("mode_sessions")
    .insert({ student_id: userId, mode, session_no: sessionNo, grade: p.grade, unit_no: unitNo, day, plan, user_agent: userAgent.slice(0, 300) })
    .select("id")
    .single();
  return error || !data ? { ok: false, reason: "error" } : { ok: true, id: data.id };
}

export type OwnedModeSession = { id: string; mode: Mode; session_no: number; unit_no: number; status: string; plan: Plan; started_at: string };

/** Buổi thuộc về học sinh này (đọc bằng khóa máy chủ, đã lọc theo id người dùng). */
export async function ownModeSession(sessionId: string, userId: string): Promise<OwnedModeSession | null> {
  const { data } = await createAdminClient()
    .from("mode_sessions")
    .select("id, student_id, mode, session_no, unit_no, status, plan, started_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!data || data.student_id !== userId) return null;
  return { id: data.id, mode: data.mode, session_no: data.session_no, unit_no: data.unit_no, status: data.status, plan: data.plan as Plan, started_at: data.started_at };
}

export type SavedTurn = { step: number; attempt_no: number; in_limit: boolean | null; time_limit_ms: number | null; rl_ms: number | null; rl_status: string; hint_level: number };

export async function sessionTurns(sessionId: string): Promise<SavedTurn[]> {
  const { data } = await createAdminClient()
    .from("mode_turns")
    .select("step, attempt_no, in_limit, time_limit_ms, rl_ms, rl_status, hint_level")
    .eq("session_id", sessionId)
    .order("created_at");
  return (data ?? []) as SavedTurn[];
}

/** Toàn bộ lượt Speed Q&A có giới hạn của học sinh (theo thời gian), để tính mức giới hạn hiện tại. */
export async function speedHistory(userId: string): Promise<{ limitMs: number; inLimit: boolean | null }[]> {
  const { data } = await createAdminClient()
    .from("mode_turns")
    .select("time_limit_ms, in_limit")
    .eq("student_id", userId)
    .eq("activity", "speed")
    .not("time_limit_ms", "is", null)
    .order("created_at");
  return (data ?? []).map((t) => ({ limitMs: t.time_limit_ms as number, inLimit: t.in_limit }));
}
