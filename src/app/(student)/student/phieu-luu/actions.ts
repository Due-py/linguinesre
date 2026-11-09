"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPractice } from "@/lib/research/server";
import { getModule } from "@/lib/module/server";
import { buildItems, checkItem, type GameItem, type GameReveal } from "@/lib/adventure/minigames";
import { ACHIEVEMENTS, COSMETICS, gameSource, levelOf, unlocked, XP, type AchievementKey, type CosmeticSlot } from "@/lib/adventure/game";
import { GAME_AFTER, GAMES, type GameKey } from "@/lib/adventure/world";

/**
 * Mini-game và đồ trang trí. Máy chủ chọn câu, chấm từng câu theo nội dung gốc của Unit, và chỉ ghi XP cho lượt ĐẦU TIÊN
 * trả lời hết câu của mỗi trò trong mỗi Unit (khóa nguồn unique trong CSDL). Không đụng tới bảng học hay nghiên cứu.
 */

const UUID = z.uuid();
const GAME = z.enum(GAMES);

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

type Answer = { i: number; a: string | string[] | null; correct: boolean; ms: number | null };
export type RoundView = { ok: true; roundId: string; items: GameItem[]; answers: (Answer & { reveal: GameReveal })[] } | { ok: false; error: string };

/** Mini-game mở khi nhiệm vụ đứng trước nó trong Unit đã xong (cùng quy tắc với bản đồ). */
async function gameOpen(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, moduleId: string, game: GameKey) {
  const { data } = await supabase.from("module_lessons").select("day").eq("student_id", userId).eq("module_id", moduleId).eq("status", "completed").eq("day", GAME_AFTER[game]).maybeSingle();
  return !!data;
}

/** Bắt đầu (hoặc làm tiếp) một lượt chơi. Lượt đang dở thì dùng lại để không tạo lượt mới liên tục. */
export async function startRound(input: { moduleId: string; game: string }): Promise<RoundView> {
  const moduleId = UUID.safeParse(input.moduleId);
  const game = GAME.safeParse(input.game);
  if (!moduleId.success || !game.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const me = await student();
  if (!me) return { ok: false, error: "Bạn cần đăng nhập lại." };
  const m = await getModule(moduleId.data);
  if (!m || m.grade !== me.grade || m.status === "draft") return { ok: false, error: "Không tìm thấy Unit này." };
  if (!(await gameOpen(me.supabase, me.userId, m.id, game.data))) return { ok: false, error: `Trò chơi này mở sau khi xong nhiệm vụ ngày ${GAME_AFTER[game.data]}.` };

  const { data: dangling, error: readError } = await me.supabase
    .from("game_rounds")
    .select("id, items, answers")
    .eq("student_id", me.userId)
    .eq("module_id", m.id)
    .eq("game", game.data)
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { ok: false, error: "Trò chơi chưa được bật (cần chạy 0013_adventure.sql)." };
  let row = dangling as { id: string; items: GameItem[]; answers: Answer[] } | null;
  if (!row) {
    const items = buildItems(game.data, m.content, `${me.userId}|${Date.now()}`);
    if (items.length === 0) return { ok: false, error: "Unit này chưa đủ nội dung cho trò chơi." };
    const { data, error } = await createAdminClient()
      .from("game_rounds")
      .insert({ student_id: me.userId, module_id: m.id, game: game.data, items, total: items.length })
      .select("id, items, answers")
      .single();
    if (error || !data) return { ok: false, error: "Chưa tạo được lượt chơi. Hãy thử lại." };
    row = data as { id: string; items: GameItem[]; answers: Answer[] };
  }
  const answers = (row.answers ?? []).map((a) => ({ ...a, reveal: checkItem(game.data, m.content, row!.items[a.i], a.a)! })).filter((a) => a.reveal);
  return { ok: true, roundId: row.id, items: row.items, answers };
}

export type AnswerView =
  | { ok: true; reveal: GameReveal; finished: boolean; correct: number; total: number; xp: number; firstTime: boolean }
  | { ok: false; error: string };

/** Chấm một câu (mỗi câu một lần). Câu cuối: kết thúc lượt, ghi XP nếu là lần đầu xong trò này ở Unit này. */
export async function answerItem(input: { roundId: string; index: number; answer: string | string[] | null; ms: number | null }): Promise<AnswerView> {
  const roundId = UUID.safeParse(input.roundId);
  if (!roundId.success || !Number.isInteger(input.index)) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const me = await student();
  if (!me) return { ok: false, error: "Bạn cần đăng nhập lại." };
  const admin = createAdminClient();
  const { data: r } = await admin.from("game_rounds").select("id, student_id, module_id, game, items, answers, total, finished_at").eq("id", roundId.data).maybeSingle();
  if (!r || r.student_id !== me.userId) return { ok: false, error: "Không tìm thấy lượt chơi." };
  if (r.finished_at) return { ok: false, error: "Lượt chơi này đã xong." };
  const items = r.items as GameItem[];
  const answers = (r.answers ?? []) as Answer[];
  const item = items[input.index];
  if (!item) return { ok: false, error: "Không có câu này." };
  if (answers.some((a) => a.i === input.index)) return { ok: false, error: "Câu này đã trả lời." };
  const a = input.answer;
  const valid = a === null || (typeof a === "string" && item.options.includes(a)) || (Array.isArray(a) && a.length <= item.options.length && a.every((x) => typeof x === "string" && item.options.includes(x)));
  if (!valid) return { ok: false, error: "Lựa chọn không hợp lệ." };
  const m = await getModule(r.module_id);
  const reveal = m ? checkItem(r.game as GameKey, m.content, item, a) : null;
  if (!reveal) return { ok: false, error: "Không chấm được câu này." };

  const ms = typeof input.ms === "number" && Number.isFinite(input.ms) ? Math.max(0, Math.min(600_000, Math.round(input.ms))) : null;
  const next = [...answers, { i: input.index, a, correct: reveal.correct, ms }];
  const finished = next.length >= r.total;
  const correct = next.filter((x) => x.correct).length;
  // Chỉ ghi khi lượt còn chưa xong. (Giao diện khóa nút khi đang gửi; XP vẫn không trùng nhờ khóa nguồn unique.)
  const { data: saved } = await admin
    .from("game_rounds")
    .update({ answers: next, ...(finished ? { finished_at: new Date().toISOString(), correct } : {}) })
    .eq("id", r.id)
    .is("finished_at", null)
    .select("id");
  if (!saved || saved.length === 0) return { ok: false, error: "Lượt chơi này đã xong. Tải lại trang nhé." };

  let xp = 0;
  let firstTime = false;
  if (finished) {
    const { data: ins } = await admin
      .from("xp_events")
      .upsert({ student_id: me.userId, source: gameSource(r.module_id, r.game as GameKey), kind: "game", xp: XP.game }, { onConflict: "student_id,source", ignoreDuplicates: true })
      .select("id");
    firstTime = !!ins && ins.length > 0;
    xp = firstTime ? XP.game : 0;
    revalidatePath("/student/phieu-luu");
  }
  return { ok: true, reveal, finished, correct, total: r.total, xp, firstTime };
}

/** Đổi đồ trang trí: chỉ món đã mở khóa (máy chủ tự tính lại cấp và thành tích, không tin trình duyệt). */
export async function setCosmetic(formData: FormData) {
  const slot = z.enum(["flag", "season", "trail"]).safeParse(formData.get("slot"));
  const key = z.string().max(20).safeParse(formData.get("key"));
  if (!slot.success || !key.success) return;
  const me = await student();
  if (!me) return;
  const c = COSMETICS.find((x) => x.slot === slot.data && x.key === key.data);
  if (!c) return;
  const [{ data: ev }, { data: ach }, { data: prof }] = await Promise.all([
    me.supabase.from("xp_events").select("xp").eq("student_id", me.userId),
    me.supabase.from("achievements").select("key").eq("student_id", me.userId),
    me.supabase.from("adventure_profiles").select("cosmetics").eq("student_id", me.userId).maybeSingle(),
  ]);
  const level = levelOf((ev ?? []).reduce((s, e) => s + e.xp, 0)).level;
  const keys = (ach ?? []).map((a) => a.key).filter((k): k is AchievementKey => k in ACHIEVEMENTS);
  if (!unlocked(c, level, keys)) return;
  const cosmetics = { ...((prof?.cosmetics as Partial<Record<CosmeticSlot, string>> | null) ?? {}), [slot.data]: key.data };
  await createAdminClient().from("adventure_profiles").upsert({ student_id: me.userId, cosmetics, updated_at: new Date().toISOString() }, { onConflict: "student_id" });
  revalidatePath("/student/phieu-luu");
  revalidatePath("/student/phieu-luu/ho-so");
}
