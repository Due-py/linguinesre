/**
 * TIẾN TRÌNH TRÒ CHƠI: XP, cấp phiêu lưu, thành tích, đồ trang trí, thử thách trong ngày.
 *
 * Cố ý tách khỏi tiến trình học (skills.ts) và dữ liệu nghiên cứu:
 *  - XP chỉ thưởng việc học có ý nghĩa và đã xong: một bài học ngày, lần ĐẦU xong một mini-game, thử thách của ngày.
 *    Không thưởng theo từng lượt nói, không thưởng theo điểm, không phụ thuộc việc dùng gợi ý (gợi ý không bị phạt).
 *  - Mỗi phần thưởng có một khóa nguồn (source) duy nhất; CSDL chặn trùng (unique), nên không nhận hai lần, không cày được.
 *  - Không trừ XP, không chuỗi ngày, không bảng xếp hạng. Thành tích chỉ mở đồ trang trí.
 *  - Cấp phiêu lưu đo việc em đã luyện, KHÔNG phải trình độ tiếng Anh; không bao giờ đổi kỹ năng hay kết quả nghiên cứu.
 * File thuần để test.
 */
import { isChallenge, type GameKey } from "./world";

// ---- XP --------------------------------------------------------------------------------------------------------------

export const XP = { quest: 100, challenge: 150, game: 40, daily: 30 } as const;
export const questXp = (day: number) => (isChallenge(day) ? XP.challenge : XP.quest);

export type XpEvent = { source: string; kind: "quest" | "game" | "daily"; xp: number; at: string };

export const lessonSource = (lessonId: string) => `lesson:${lessonId}`;
export const gameSource = (moduleId: string, game: GameKey) => `game:${moduleId}:${game}`;
export const dailySource = (vnDate: string) => `daily:${vnDate}`;

/** share: phần bước đã thật sự làm (không bỏ qua), 0–1. Thiếu thì coi là 1 (bài cũ). */
export type CompletedLesson = { id: string; moduleId: string; day: number; completedAt: string; share?: number };
/** correct: số câu đúng (null: dữ liệu cũ chưa có). */
export type FinishedRound = { moduleId: string; game: GameKey; finishedAt: string; answered: number; total: number; correct?: number | null };

/** Bài bỏ qua nhiều bước không nhận đủ EXP: nhân theo phần đã làm, thấp nhất 30% (đã đi hết bài). Gợi ý không bị tính. */
export const MIN_SHARE = 0.3;
export const lessonXp = (l: CompletedLesson) => Math.max(1, Math.round(questXp(l.day) * Math.max(MIN_SHARE, Math.min(1, l.share ?? 1))));
/** Mini-game chỉ thưởng khi đúng ít nhất một nửa (bấm bừa không có thưởng); chưa đạt thì chơi lại vẫn nhận được. */
export const GAME_PASS = 0.5;
export const roundPassed = (r: FinishedRound) => r.answered >= r.total && (r.correct === undefined || r.correct === null || r.correct / r.total >= GAME_PASS);

/**
 * Các phần thưởng mà dữ liệu thật cho phép. Tính lại được bất cứ lúc nào (idempotent): máy chủ chỉ chèn khóa chưa có.
 * Mini-game: chỉ lượt đầu tiên trả lời hết câu của mỗi trò trong mỗi Unit; chơi lại vẫn luyện được nhưng không thêm XP.
 */
export function earnedEvents(lessons: CompletedLesson[], rounds: FinishedRound[]): XpEvent[] {
  const out: XpEvent[] = lessons.map((l) => ({ source: lessonSource(l.id), kind: "quest", xp: lessonXp(l), at: l.completedAt }));
  const seen = new Set<string>();
  for (const r of [...rounds].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))) {
    if (!roundPassed(r)) continue;
    const s = gameSource(r.moduleId, r.game);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push({ source: s, kind: "game", xp: XP.game, at: r.finishedAt });
  }
  return out;
}

// ---- Lingua Coins (LC): tiền ảo riêng, chỉ mua đồ trang trí -----------------------------------------------------------

/** LC nhận theo cùng việc học thật như EXP (cùng khóa nguồn), thêm khi lên cấp và khi có thành tích. Không bao giờ mua EXP. */
export const COINS = { quest: 10, challenge: 15, game: 5, daily: 5, level: 20, achievement: 10 } as const;
export type CoinGrant = { source: string; delta: number; reason: string; at: string };

export function earnedCoins(events: XpEvent[], totalXp: number, achievements: { key: AchievementKey; at: string }[]): CoinGrant[] {
  const out: CoinGrant[] = [];
  for (const e of events) {
    if (e.kind === "quest") {
      const full = e.xp >= XP.challenge ? COINS.challenge : COINS.quest;
      // Cùng tỷ lệ với EXP của bài (bài bỏ qua nhiều bước nhận ít hơn).
      const base = e.xp >= XP.challenge ? XP.challenge : XP.quest;
      out.push({ source: e.source, delta: Math.max(1, Math.round(full * Math.min(1, e.xp / base))), reason: "Hoàn thành một nhiệm vụ", at: e.at });
    } else if (e.kind === "game") out.push({ source: e.source, delta: COINS.game, reason: "Lần đầu chơi đạt một mini-game", at: e.at });
    else out.push({ source: e.source, delta: COINS.daily, reason: "Thử thách trong ngày", at: e.at });
  }
  const level = levelOf(totalXp).level;
  for (let l = 2; l <= level; l++) out.push({ source: `level:${l}`, delta: COINS.level, reason: `Lên cấp ${l}`, at: new Date(0).toISOString() });
  for (const a of achievements) out.push({ source: `ach:${a.key}`, delta: COINS.achievement, reason: `Thành tích: ${ACHIEVEMENTS[a.key].titleVi}`, at: a.at });
  return out;
}

// ---- Cấp phiêu lưu -----------------------------------------------------------------------------------------------------

/** XP cần để đạt cấp L (cấp 1 từ 0 XP): 0, 200, 500, 900, 1400, 2000... tăng dần, một module đầy đủ khoảng cấp 5. */
export const xpForLevel = (level: number) => (level <= 1 ? 0 : 50 * (level - 1) * (level + 2));

export function levelOf(xp: number): { level: number; from: number; to: number; into: number; need: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  return { level, from, to, into: xp - from, need: to - from };
}

export const LEVEL_TITLES = ["", "Người mới lên đường", "Lữ khách", "Nhà thám hiểm", "Người dẫn đường", "Nhà thám hiểm lão luyện", "Huyền thoại phiêu lưu"] as const;
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(level, LEVEL_TITLES.length - 1)];

// ---- Thành tích (chỉ mở đồ trang trí) ---------------------------------------------------------------------------------

export type AchievementKey =
  | "first_quest"
  | "confident_speaker"
  | "quick_thinker"
  | "vocab_explorer"
  | "consistent_learner"
  | "conversationalist"
  | "region_explorer"
  | "unit_conqueror"
  | "game_explorer";

export const ACHIEVEMENTS: Record<AchievementKey, { titleVi: string; howVi: string }> = {
  first_quest: { titleVi: "Chuyến đi đầu tiên", howVi: "Hoàn thành nhiệm vụ đầu tiên." },
  confident_speaker: { titleVi: "Tự tin cất lời", howVi: "Tự trả lời một câu hỏi mà không mở gợi ý." },
  quick_thinker: { titleVi: "Phản xạ nhanh hơn", howVi: "Thời gian bắt đầu nói (trung vị) ở các bài gần đây ngắn hơn bài đầu module ít nhất 20%." },
  vocab_explorer: { titleVi: "Nhà thám hiểm từ vựng", howVi: "Dùng đúng 10 từ khóa khác nhau của Unit khi tự trả lời câu hỏi." },
  consistent_learner: { titleVi: "Đều đặn", howVi: "Luyện tập vào 5 ngày khác nhau (không cần liên tiếp)." },
  conversationalist: { titleVi: "Người bạn trò chuyện", howVi: "Hoàn thành một cuộc trò chuyện (roleplay) với Linguine." },
  region_explorer: { titleVi: "Khám phá vùng đất", howVi: "Hoàn thành mọi nhiệm vụ của một khu vực." },
  unit_conqueror: { titleVi: "Chinh phục Unit", howVi: "Hoàn thành cả 14 nhiệm vụ của một Unit." },
  game_explorer: { titleVi: "Thử hết trò chơi", howVi: "Chơi xong cả 5 mini-game (ở bất kỳ Unit nào)." },
};

/** Dữ liệu thật dùng để xét thành tích (máy chủ gom từ module_lessons, module_attempts, game_rounds). */
export type AchievementInput = {
  lessons: CompletedLesson[];
  /** Lượt nói câu hỏi (speak, lượt đầu) có đo được. */
  speaks: { day: number; moduleId: string; hintLevel: number; thinkMs: number | null; words: number | null; unclear: boolean; keywordsUsed: string[]; test: boolean; at: string }[];
  roleplaysDone: number;
  /** Các ngày (giờ Việt Nam) có làm bài hoặc chơi. */
  activeDates: string[];
  /** Mỗi mini-game đã chơi xong: lần xong đầu tiên. */
  gamesFinished: { game: GameKey; at: string }[];
  /** Ngày của từng giai đoạn để xét "khám phá vùng đất". */
  phaseDays: readonly (readonly number[])[];
};

const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Thành tích đạt được và bằng chứng (câu giải thích). Thuần, xét lại được bất cứ lúc nào. */
export function earnedAchievements(x: AchievementInput): { key: AchievementKey; evidence: string; at: string }[] {
  const out: { key: AchievementKey; evidence: string; at: string }[] = [];
  const byTime = [...x.lessons].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  if (byTime[0]) out.push({ key: "first_quest", evidence: `Xong ngày ${byTime[0].day}.`, at: byTime[0].completedAt });

  const own = x.speaks.find((s) => s.hintLevel === 0 && !s.unclear && (s.words ?? 0) >= 5);
  if (own) out.push({ key: "confident_speaker", evidence: `Tự nói ${own.words} từ ở ngày ${own.day}, không mở gợi ý.`, at: own.at });

  // Phản xạ: so trung vị thời gian bắt đầu nói ngày 1 (bài đầu module) với các ngày từ 8 trở đi, cùng một Unit, đủ 3 câu mỗi bên.
  for (const moduleId of new Set(x.speaks.map((s) => s.moduleId))) {
    const ms = (f: (d: number) => boolean) => x.speaks.filter((s) => s.moduleId === moduleId && f(s.day) && s.thinkMs !== null && !s.unclear);
    const before = ms((d) => d === 1);
    const after = ms((d) => d >= 8);
    const b = median(before.map((s) => s.thinkMs!));
    const a = median(after.map((s) => s.thinkMs!));
    if (before.length >= 3 && after.length >= 3 && a !== null && b !== null && a <= b * 0.8) {
      out.push({ key: "quick_thinker", evidence: `Bắt đầu nói ${(b / 1000).toFixed(1)} giây ở ngày 1, ${(a / 1000).toFixed(1)} giây ở các ngày sau.`, at: after.at(-1)!.at });
      break;
    }
  }

  const words = new Map<string, string>();
  for (const s of x.speaks) for (const k of s.keywordsUsed) if (!words.has(k.toLowerCase())) words.set(k.toLowerCase(), s.at);
  if (words.size >= 10) out.push({ key: "vocab_explorer", evidence: `Đã dùng ${words.size} từ khóa khác nhau.`, at: [...words.values()].sort()[9] });

  const dates = [...new Set(x.activeDates)].sort();
  if (dates.length >= 5) out.push({ key: "consistent_learner", evidence: `Đã luyện vào ${dates.length} ngày khác nhau.`, at: `${dates[4]}T12:00:00+07:00` });

  if (x.roleplaysDone > 0) {
    const l = byTime.find((l) => l.day === 11 || l.day === 12 || l.day === 14);
    out.push({ key: "conversationalist", evidence: "Đã hoàn thành một cuộc trò chuyện với Linguine.", at: l?.completedAt ?? byTime.at(-1)?.completedAt ?? new Date(0).toISOString() });
  }

  const byModule = new Map<string, CompletedLesson[]>();
  for (const l of byTime) byModule.set(l.moduleId, [...(byModule.get(l.moduleId) ?? []), l]);
  let region: { at: string; phase: number } | null = null;
  let conquered: string | null = null;
  for (const ls of byModule.values()) {
    const days = new Set(ls.map((l) => l.day));
    x.phaseDays.forEach((pd, i) => {
      if (pd.every((d) => days.has(d))) {
        const at = ls.filter((l) => pd.includes(l.day)).map((l) => l.completedAt).sort().at(-1)!;
        if (!region || at < region.at) region = { at, phase: i + 1 };
      }
    });
    if (days.size >= 14) {
      const at = ls.map((l) => l.completedAt).sort().at(-1)!;
      if (!conquered || at < conquered) conquered = at;
    }
  }
  const r = region as { at: string; phase: number } | null;
  if (r) out.push({ key: "region_explorer", evidence: `Xong cả giai đoạn ${r.phase}.`, at: r.at });
  if (conquered) out.push({ key: "unit_conqueror", evidence: "Xong cả 14 ngày của một Unit.", at: conquered });

  const firstFinish = new Map<GameKey, string>();
  for (const g of [...x.gamesFinished].sort((a, b) => a.at.localeCompare(b.at))) if (!firstFinish.has(g.game)) firstFinish.set(g.game, g.at);
  if (firstFinish.size >= 5) out.push({ key: "game_explorer", evidence: "Đã chơi xong cả 5 mini-game.", at: [...firstFinish.values()].sort().at(-1)! });
  return out;
}

// ---- Đồ trang trí (chỉ để vui, không ảnh hưởng việc học) ----------------------------------------------------------

export type CosmeticSlot = "flag" | "season" | "trail";
export type Cosmetic = { slot: CosmeticSlot; key: string; titleVi: string; unlock: { level: number } | { achievement: AchievementKey } };
export const COSMETICS: Cosmetic[] = [
  { slot: "flag", key: "green", titleVi: "Cờ xanh lá", unlock: { level: 1 } },
  { slot: "flag", key: "red", titleVi: "Cờ đỏ Ý", unlock: { level: 2 } },
  { slot: "flag", key: "gold", titleVi: "Cờ vàng", unlock: { achievement: "region_explorer" } },
  { slot: "flag", key: "blue", titleVi: "Cờ xanh dương", unlock: { level: 4 } },
  { slot: "season", key: "spring", titleVi: "Mùa xuân", unlock: { level: 1 } },
  { slot: "season", key: "autumn", titleVi: "Mùa thu", unlock: { level: 3 } },
  { slot: "season", key: "winter", titleVi: "Mùa đông", unlock: { achievement: "unit_conqueror" } },
  { slot: "trail", key: "road", titleVi: "Đường đất", unlock: { level: 1 } },
  { slot: "trail", key: "flowers", titleVi: "Đường hoa", unlock: { achievement: "consistent_learner" } },
  { slot: "trail", key: "stars", titleVi: "Đường sao", unlock: { achievement: "game_explorer" } },
];
export const DEFAULT_COSMETICS: Record<CosmeticSlot, string> = { flag: "green", season: "spring", trail: "road" };

export function unlocked(c: Cosmetic, level: number, achievements: AchievementKey[]): boolean {
  return "level" in c.unlock ? level >= c.unlock.level : achievements.includes(c.unlock.achievement);
}

/** Đồ đang dùng: chỉ giữ món đã mở khóa, còn lại về mặc định (máy chủ cũng kiểm tra khi lưu). */
export function equipped(saved: Partial<Record<CosmeticSlot, string>> | null, level: number, achievements: AchievementKey[]): Record<CosmeticSlot, string> {
  const out = { ...DEFAULT_COSMETICS };
  for (const slot of Object.keys(out) as CosmeticSlot[]) {
    const c = COSMETICS.find((x) => x.slot === slot && x.key === saved?.[slot]);
    if (c && unlocked(c, level, achievements)) out[slot] = c.key;
  }
  return out;
}
