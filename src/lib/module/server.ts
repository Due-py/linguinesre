import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildHints } from "@/lib/speaking/hints";
import { moduleSchema, type ModuleContent } from "./schema";
import { buildLesson, nextOpenDay, type HistoryAttempt, type Lesson, type QuizArea, type QuizSet, type Step, type UnitQuestion } from "./plan";
import { moduleReport, type ModuleReport, type ReportAttempt } from "./report";
import type { VerifiedAssessment } from "./assessCore";

/**
 * Phần máy chủ của Learning Module. Đọc bằng client thường (RLS: học sinh chỉ thấy của mình, giáo viên thấy học sinh trong
 * lớp mình). Ghi bằng khóa máy chủ SAU khi đã kiểm tra bài học thuộc về người đang đăng nhập.
 */

export type ModuleStatus = "draft" | "team_checked" | "teacher_approved";
export type ModuleRow = {
  id: string;
  unitId: string;
  grade: number;
  unitNo: number;
  title: string;
  status: ModuleStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  content: ModuleContent;
};

type Row = {
  id: string;
  unit_id: string;
  grade: number;
  unit_no: number;
  title: string;
  status: ModuleStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  content: unknown;
};
function toModule(r: Row): ModuleRow | null {
  const parsed = moduleSchema.safeParse(r.content);
  if (!parsed.success) return null;
  return { id: r.id, unitId: r.unit_id, grade: r.grade, unitNo: r.unit_no, title: r.title, status: r.status, reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at, content: parsed.data };
}

export type ModuleSummary = { id: string; unitId: string; unitNo: number; title: string; titleVi: string; status: ModuleStatus };

/** Module mà người đang đăng nhập được thấy, theo khối (RLS: học sinh không thấy bản nháp). */
export async function listModules(grade?: number): Promise<ModuleSummary[]> {
  const supabase = await createClient();
  let q = supabase.from("modules").select("id, unit_id, unit_no, title, status, content->>titleVi").order("grade").order("unit_no");
  if (grade) q = q.eq("grade", grade);
  const { data } = await q;
  return (data ?? []).map((r) => ({
    id: r.id,
    unitId: r.unit_id,
    unitNo: r.unit_no,
    title: r.title,
    titleVi: (r as unknown as { titleVi: string }).titleVi ?? "",
    status: r.status as ModuleStatus,
  }));
}

export async function getModule(id: string): Promise<ModuleRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("modules").select("id, unit_id, grade, unit_no, title, status, reviewed_by, reviewed_at, content").eq("id", id).maybeSingle();
  return data ? toModule(data as Row) : null;
}

/** Câu hỏi luyện nói của Unit (đã duyệt), kèm 4 mức gợi ý như trang luyện tự do. */
export async function unitQuestions(unitId: string): Promise<UnitQuestion[]> {
  const supabase = await createClient();
  const [{ data: qs }, { data: frames }] = await Promise.all([
    supabase.from("questions").select("id, key, text, difficulty, keywords, expects_reason, frame_key, hint_direction_vi, example_answer").eq("unit_id", unitId).eq("active", true).order("key"),
    supabase.from("frames").select("key, text, vi").eq("unit_id", unitId),
  ]);
  const frameByKey = new Map((frames ?? []).map((f) => [f.key, { text: f.text, vi: f.vi }]));
  return (qs ?? []).map((q) => ({
    id: q.id,
    key: q.key,
    text: q.text,
    difficulty: q.difficulty,
    keywords: q.keywords,
    expectsReason: q.expects_reason,
    hints: buildHints({ hintDirectionVi: q.hint_direction_vi, keywords: q.keywords, frame: frameByKey.get(q.frame_key) ?? null, exampleAnswer: q.example_answer }),
  }));
}

export type AttemptRow = {
  id: string;
  lesson_id: string;
  day: number;
  step: number;
  turn: number;
  attempt_no: number;
  kind: Step["t"];
  item_ref: string;
  quiz_set: QuizSet | null;
  area: QuizArea | null;
  answer: string | null;
  correct: boolean | null;
  hint_level: number;
  think_ms: number | null;
  time_target_ms: number | null;
  in_target: boolean | null;
  measures: ReportAttempt["measures"];
  check_result: (ReportAttempt["check"] & { test?: boolean }) | null;
  ai: VerifiedAssessment | null;
  ai_status: "none" | "ok" | "failed";
  error_tags: string[];
  reply: string | null;
  created_at: string;
};
const ATTEMPT_COLS =
  "id, lesson_id, day, step, turn, attempt_no, kind, item_ref, quiz_set, area, answer, correct, hint_level, think_ms, time_target_ms, in_target, measures, check_result, ai, ai_status, error_tags, reply, created_at";

/** Mọi lượt làm của một học sinh trong một module (RLS quyết định ai đọc được). */
export async function moduleAttempts(studentId: string, moduleId: string): Promise<AttemptRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_attempts")
    .select(ATTEMPT_COLS)
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .order("created_at");
  return (data ?? []) as AttemptRow[];
}

export const toHistory = (rows: AttemptRow[]): HistoryAttempt[] =>
  rows.map((r) => ({
    day: r.day,
    t: r.kind,
    ref: r.item_ref,
    set: r.quiz_set,
    area: r.area,
    attemptNo: r.attempt_no,
    correct: r.correct,
    thinkMs: r.think_ms,
    hintLevel: r.hint_level,
    inTarget: r.in_target,
    targetMs: r.time_target_ms,
    errorTags: r.error_tags ?? [],
    at: r.created_at,
  }));

export const toReport = (rows: AttemptRow[]): ReportAttempt[] =>
  rows
    .filter((r) => r.turn === 0 || r.kind === "roleplay")
    .map((r) => ({
      day: r.day,
      t: r.kind,
      ref: r.item_ref,
      attemptNo: r.attempt_no,
      set: r.quiz_set,
      area: r.area,
      correct: r.correct,
      test: r.check_result?.test === true,
      measures: r.measures,
      check: r.check_result,
      ai: r.ai_status === "ok" ? r.ai : null,
    }));

export type LessonRow = { id: string; day: number; status: "in_progress" | "completed"; startedAt: string; completedAt: string | null };

export async function moduleLessons(studentId: string, moduleId: string): Promise<LessonRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_lessons")
    .select("id, day, status, started_at, completed_at")
    .eq("student_id", studentId)
    .eq("module_id", moduleId)
    .order("day");
  return (data ?? []).map((l) => ({ id: l.id, day: l.day, status: l.status, startedAt: l.started_at, completedAt: l.completed_at }));
}

/**
 * Mở bài của một ngày: đã có thì dùng lại (bài cố định khi đã lập); chưa có thì chỉ lập cho ngày đang mở tiếp theo.
 * Bài được lập từ nội dung module và lịch sử học thật của học sinh (buildLesson).
 */
export async function openLesson(userId: string, grade: number | null, moduleId: string, day: number): Promise<string | null> {
  const m = await getModule(moduleId);
  if (!m || m.grade !== grade || m.status === "draft") return null;
  const lessons = await moduleLessons(userId, moduleId);
  const existing = lessons.find((l) => l.day === day);
  if (existing) return existing.id;
  if (nextOpenDay(lessons.filter((l) => l.status === "completed").map((l) => l.day)) !== day) return null;
  if (lessons.some((l) => l.status === "in_progress")) return null; // làm xong bài đang dở trước

  const [questions, attempts] = await Promise.all([unitQuestions(m.unitId), moduleAttempts(userId, moduleId)]);
  const plan = buildLesson({ day, module: m.content, unitQuestions: questions, history: toHistory(attempts), seed: `${userId}|${moduleId}`, now: Date.now() });
  const { data, error } = await createAdminClient()
    .from("module_lessons")
    .insert({ student_id: userId, module_id: moduleId, day, plan })
    .select("id")
    .single();
  if (error) {
    // Hai thẻ cùng bấm một lúc: lấy bài vừa được tạo.
    const again = (await moduleLessons(userId, moduleId)).find((l) => l.day === day);
    return again?.id ?? null;
  }
  return data.id;
}

export type OwnLesson = { id: string; moduleId: string; day: number; status: "in_progress" | "completed"; plan: Lesson };

/** Bài học thuộc về người này (đọc bằng khóa máy chủ sau khi so id học sinh). */
export async function ownLesson(lessonId: string, userId: string): Promise<OwnLesson | null> {
  if (!/^[0-9a-f-]{36}$/.test(lessonId)) return null;
  const { data } = await createAdminClient().from("module_lessons").select("id, student_id, module_id, day, status, plan").eq("id", lessonId).maybeSingle();
  if (!data || data.student_id !== userId) return null;
  return { id: data.id, moduleId: data.module_id, day: data.day, status: data.status, plan: data.plan as Lesson };
}

/** Số lượt đã lưu của một bước (và lượt con) trong bài, để biết lượt làm tiếp theo là lần thứ mấy. */
export async function attemptCount(lessonId: string, step: number, turn: number): Promise<number> {
  const { count } = await createAdminClient()
    .from("module_attempts")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId)
    .eq("step", step)
    .eq("turn", turn);
  return count ?? 0;
}

export type StudentModuleProgress = { module: ModuleSummary; daysDone: number; report: ModuleReport };

/** Tiến độ các module một học sinh đã bắt đầu (giáo viên xem; RLS chỉ cho học sinh trong lớp mình). */
export async function studentModules(studentId: string): Promise<StudentModuleProgress[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("module_lessons").select("module_id, status").eq("student_id", studentId);
  const ids = [...new Set((data ?? []).map((l) => l.module_id))];
  const out: StudentModuleProgress[] = [];
  for (const id of ids) {
    const m = await getModule(id);
    if (!m) continue;
    const attempts = await moduleAttempts(studentId, id);
    out.push({
      module: { id: m.id, unitId: m.unitId, unitNo: m.unitNo, title: m.title, titleVi: m.content.titleVi, status: m.status },
      daysDone: (data ?? []).filter((l) => l.module_id === id && l.status === "completed").length,
      report: moduleReport(m.content, toReport(attempts)),
    });
  }
  return out;
}

export type ModuleToday = { id: string; unitNo: number; title: string; nextDay: number | null; started: boolean; inProgress: boolean };

/**
 * Module nên học tiếp trên trang tổng quan: module có bài đang dở; không có thì module đã bắt đầu gần nhất chưa xong;
 * chưa bắt đầu module nào thì module đầu tiên của khối. Không có module nào thì null.
 */
export async function moduleToday(studentId: string, grade: number): Promise<ModuleToday | null> {
  const mods = await listModules(grade);
  if (mods.length === 0) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("module_lessons").select("module_id, day, status, started_at").eq("student_id", studentId).order("started_at", { ascending: false });
  const rows = data ?? [];
  const unfinished = (id: string) => rows.filter((l) => l.module_id === id && l.status === "completed").length < 14;
  const pick =
    mods.find((m) => rows.some((l) => l.module_id === m.id && l.status === "in_progress")) ??
    mods.find((m) => m.id === rows.find((l) => unfinished(l.module_id))?.module_id) ??
    mods.find((m) => !rows.some((l) => l.module_id === m.id)) ??
    null;
  if (!pick) return null;
  const mine = rows.filter((l) => l.module_id === pick.id);
  const open = mine.find((l) => l.status === "in_progress");
  return {
    id: pick.id,
    unitNo: pick.unitNo,
    title: pick.title,
    nextDay: open?.day ?? nextOpenDay(mine.filter((l) => l.status === "completed").map((l) => l.day)),
    started: mine.length > 0,
    inProgress: !!open,
  };
}
