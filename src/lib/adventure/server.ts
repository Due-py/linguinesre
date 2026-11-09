import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHASES } from "@/lib/module/plan";
import { vnDay } from "@/lib/research/modes";
import { listModules, type ModuleSummary } from "@/lib/module/server";
import {
  ACHIEVEMENTS,
  dailySource,
  earnedAchievements,
  earnedEvents,
  equipped,
  levelOf,
  XP,
  type AchievementKey,
  type CompletedLesson,
  type CosmeticSlot,
  type FinishedRound,
  type XpEvent,
} from "./game";
import { dailyChallenge, recommend, skillResults, type DailyChallenge, type Recommendation, type SkillAttempt, type SkillResult } from "./skills";
import { GAME_AFTER, GAMES, type GameKey } from "./world";

/**
 * Phần máy chủ của bản đồ phiêu lưu. Đọc bằng client thường (RLS: học sinh chỉ thấy của mình). Ghi XP và thành tích bằng
 * khóa máy chủ, chỉ từ dữ liệu thật (bài đã xong, lượt chơi đã xong); khóa nguồn unique nên chạy lại bao nhiêu lần cũng
 * không cộng trùng. Không đọc hay ghi gì vào bảng nghiên cứu, và kỹ năng không đọc XP.
 */

type LessonDb = { id: string; module_id: string; day: number; status: string; started_at: string; completed_at: string | null };
type AttemptDb = {
  module_id: string;
  day: number;
  kind: string;
  turn: number;
  attempt_no: number;
  area: string | null;
  correct: boolean | null;
  hint_level: number;
  think_ms: number | null;
  measures: SkillAttempt["measures"];
  check_result: SkillAttempt["check"];
  error_tags: string[] | null;
  created_at: string;
};
type RoundDb = { id: string; module_id: string; game: GameKey; total: number; answers: unknown[]; started_at: string; finished_at: string | null };

export const toSkillAttempt = (a: AttemptDb): SkillAttempt => ({
  moduleId: a.module_id,
  day: a.day,
  kind: a.kind,
  turn: a.turn,
  attemptNo: a.attempt_no,
  area: a.area,
  correct: a.correct,
  hintLevel: a.hint_level,
  thinkMs: a.think_ms,
  measures: a.measures,
  check: a.check_result,
  errorTags: a.error_tags ?? [],
  at: a.created_at,
});

const ATTEMPT_COLS = "module_id, day, kind, turn, attempt_no, area, correct, hint_level, think_ms, measures, check_result, error_tags, created_at";

/** Mọi dữ liệu học thật của một học sinh (mọi module). RLS quyết định ai đọc được. */
export async function learningData(studentId: string) {
  const supabase = await createClient();
  const [{ data: lessons }, { data: attempts }] = await Promise.all([
    supabase.from("module_lessons").select("id, module_id, day, status, started_at, completed_at").eq("student_id", studentId).order("started_at"),
    supabase.from("module_attempts").select(ATTEMPT_COLS).eq("student_id", studentId).order("created_at"),
  ]);
  return { lessons: (lessons ?? []) as LessonDb[], attempts: ((attempts ?? []) as AttemptDb[]).map(toSkillAttempt) };
}

export type GameData = { available: boolean; rounds: RoundDb[]; events: XpEvent[]; achievements: { key: AchievementKey; earnedAt: string; evidence: string | null }[]; cosmetics: Partial<Record<CosmeticSlot, string>> | null };

async function gameData(studentId: string): Promise<GameData> {
  const supabase = await createClient();
  const [r, e, a, p] = await Promise.all([
    supabase.from("game_rounds").select("id, module_id, game, total, answers, started_at, finished_at").eq("student_id", studentId).order("started_at"),
    supabase.from("xp_events").select("source, kind, xp, created_at").eq("student_id", studentId).order("created_at"),
    supabase.from("achievements").select("key, earned_at, evidence").eq("student_id", studentId),
    supabase.from("adventure_profiles").select("cosmetics").eq("student_id", studentId).maybeSingle(),
  ]);
  if (r.error || e.error || a.error || p.error) return { available: false, rounds: [], events: [], achievements: [], cosmetics: null };
  return {
    available: true,
    rounds: (r.data ?? []) as RoundDb[],
    events: (e.data ?? []).map((x) => ({ source: x.source, kind: x.kind, xp: x.xp, at: x.created_at })),
    achievements: (a.data ?? []).map((x) => ({ key: x.key as AchievementKey, earnedAt: x.earned_at, evidence: x.evidence })),
    cosmetics: (p.data?.cosmetics as Partial<Record<CosmeticSlot, string>> | undefined) ?? null,
  };
}

const finishedRounds = (rounds: RoundDb[]): FinishedRound[] =>
  rounds.filter((r) => r.finished_at).map((r) => ({ moduleId: r.module_id, game: r.game, finishedAt: r.finished_at!, answered: Array.isArray(r.answers) ? r.answers.length : 0, total: r.total }));

const completedLessons = (lessons: LessonDb[]): CompletedLesson[] =>
  lessons.filter((l) => l.status === "completed" && l.completed_at).map((l) => ({ id: l.id, moduleId: l.module_id, day: l.day, completedAt: l.completed_at! }));

/** Mini-game đã mở trong một module: nhiệm vụ đứng trước nó đã xong (cùng quy tắc với bản đồ). */
export function gamesOpenIn(moduleId: string | null, lessons: LessonDb[]): GameKey[] {
  if (!moduleId) return [];
  const done = new Set(lessons.filter((l) => l.module_id === moduleId && l.status === "completed").map((l) => l.day));
  return GAMES.filter((g) => done.has(GAME_AFTER[g]));
}

const startOfVnDay = (date: string) => `${date}T00:00:00+07:00`;

export type DailyState = DailyChallenge & { done: boolean; xp: number };

function dailyState(date: string, moduleId: string | null, lessons: LessonDb[], attempts: SkillAttempt[], rounds: RoundDb[]): DailyState {
  const before = attempts.filter((a) => a.at < new Date(startOfVnDay(date)).toISOString());
  const c = dailyChallenge(date, before, gamesOpenIn(moduleId, lessons));
  const today = (iso: string | null) => !!iso && vnDay(new Date(iso)) === date;
  const done =
    c.action.kind === "game"
      ? rounds.some((r) => r.game === (c.action as { game: GameKey }).game && today(r.finished_at) && (Array.isArray(r.answers) ? r.answers.length : 0) >= r.total)
      : lessons.some((l) => l.status === "completed" && today(l.completed_at));
  return { ...c, done, xp: XP.daily };
}

/**
 * Ghi các phần thưởng còn thiếu (XP, thành tích) từ dữ liệu thật. Idempotent: chỉ chèn khóa chưa có (unique).
 * Trả về các sự kiện XP mới được ghi lần này (để màn hình hoàn thành hiện đúng số vừa nhận).
 */
async function sync(studentId: string, lessons: LessonDb[], attempts: SkillAttempt[], g: GameData, daily: DailyState | null): Promise<{ events: XpEvent[]; achievements: AchievementKey[] }> {
  if (!g.available) return { events: [], achievements: [] };
  const have = new Set(g.events.map((e) => e.source));
  const want = earnedEvents(completedLessons(lessons), finishedRounds(g.rounds));
  if (daily?.done) want.push({ source: dailySource(daily.date), kind: "daily", xp: XP.daily, at: new Date().toISOString() });
  const missing = want.filter((e) => !have.has(e.source));
  const admin = createAdminClient();
  if (missing.length > 0)
    await admin.from("xp_events").upsert(
      missing.map((e) => ({ student_id: studentId, source: e.source, kind: e.kind, xp: e.xp, created_at: e.at })),
      { onConflict: "student_id,source", ignoreDuplicates: true },
    );

  const speaks = attempts
    .filter((a) => a.kind === "speak" && a.turn === 0 && a.attemptNo === 1 && !a.check?.skipped)
    .map((a) => ({
      day: a.day,
      moduleId: a.moduleId,
      hintLevel: a.hintLevel,
      thinkMs: a.thinkMs,
      words: a.measures?.words ?? null,
      unclear: a.measures?.unclear === true,
      keywordsUsed: a.check?.keywordsUsed ?? [],
      test: a.check?.test === true,
      at: a.at,
    }));
  const activeDates = [...attempts.map((a) => a.at), ...g.rounds.map((r) => r.started_at)].map((iso) => vnDay(new Date(iso)));
  const earned = earnedAchievements({
    lessons: completedLessons(lessons),
    speaks,
    roleplaysDone: lessons.filter((l) => l.status === "completed" && (l.day === 11 || l.day === 12 || l.day === 14)).length,
    activeDates,
    gamesFinished: finishedRounds(g.rounds).filter((r) => r.answered >= r.total).map((r) => ({ game: r.game, at: r.finishedAt })),
    phaseDays: PHASES.map((p) => p.days),
  });
  const haveA = new Set(g.achievements.map((a) => a.key));
  const newA = earned.filter((a) => !haveA.has(a.key));
  if (newA.length > 0)
    await admin
      .from("achievements")
      .upsert(newA.map((a) => ({ student_id: studentId, key: a.key, earned_at: a.at, evidence: a.evidence.slice(0, 200) })), { onConflict: "student_id,key", ignoreDuplicates: true });
  g.events.push(...missing);
  g.achievements.push(...newA.map((a) => ({ key: a.key, earnedAt: a.at, evidence: a.evidence })));
  return { events: missing, achievements: newA.map((a) => a.key) };
}

export type ModuleOnMap = ModuleSummary & { daysDone: number; inProgress: boolean; started: boolean };

export type AdventureState = {
  available: boolean;
  modules: ModuleOnMap[];
  lessons: LessonDb[];
  rounds: RoundDb[];
  xp: number;
  level: ReturnType<typeof levelOf>;
  newEvents: XpEvent[];
  newAchievements: AchievementKey[];
  events: XpEvent[];
  achievements: GameData["achievements"];
  cosmetics: Record<CosmeticSlot, string>;
  skills: SkillResult[];
  recommendations: Recommendation[];
  daily: DailyState | null;
  attempts: SkillAttempt[];
};

/** Toàn bộ trạng thái cho bản đồ: tiến độ học thật, phần thưởng (đã đồng bộ), kỹ năng và gợi ý. */
export async function adventureState(studentId: string, grade: number | null, moduleId: string | null): Promise<AdventureState> {
  const [mods, data, g] = await Promise.all([listModules(grade ?? undefined), learningData(studentId), gameData(studentId)]);
  const modules: ModuleOnMap[] = mods.map((m) => {
    const ls = data.lessons.filter((l) => l.module_id === m.id);
    return { ...m, daysDone: ls.filter((l) => l.status === "completed").length, inProgress: ls.some((l) => l.status === "in_progress"), started: ls.length > 0 };
  });
  const date = vnDay(new Date());
  const daily = g.available && moduleId ? dailyState(date, moduleId, data.lessons, data.attempts, g.rounds) : null;
  const synced = await sync(studentId, data.lessons, data.attempts, g, daily);
  const xp = g.events.reduce((s, e) => s + e.xp, 0);
  const level = levelOf(xp);
  const skills = skillResults(data.attempts);
  return {
    available: g.available,
    modules,
    lessons: data.lessons,
    rounds: g.rounds,
    xp,
    level,
    newEvents: synced.events,
    newAchievements: synced.achievements,
    events: g.events,
    achievements: g.achievements.filter((a) => a.key in ACHIEVEMENTS),
    cosmetics: equipped(g.cosmetics, level.level, g.achievements.map((a) => a.key)),
    skills,
    recommendations: recommend(skills, gamesOpenIn(moduleId, data.lessons)),
    daily,
    attempts: data.attempts,
  };
}
