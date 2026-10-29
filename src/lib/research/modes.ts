/**
 * Quy tắc thuần (không gọi mạng, test được) của hai chế độ luyện trong nghiên cứu:
 * lập kế hoạch một buổi, mức giới hạn thời gian Speed Q&A, chấm nhanh từng lượt, ngày/tuần theo giờ Việt Nam.
 * Mọi quy tắc cố định và viết sẵn, không dùng AI, để báo cáo giải thích được và tái lặp được.
 */
import { countWords, hasReasonWord, stem, usesKeyword } from "../feedback/measures";

export type Mode = "A" | "B";
export type Layer = "L0" | "L1" | "L2" | "L3";
export type Activity = "vocab" | "frame" | "speed" | "expand" | "roleplay" | "talk" | "read_aloud";
export type StepHint = { level: 1 | 2 | 3 | 4; title: string; body: string; lang: "vi" | "en"; note?: string };

export type PlanStep = {
  step: number;
  layer: Layer | null;
  activity: Activity;
  /** Mã nội dung để phân tích: v03, f02, q07, p1#2, t3, r2#1 (bài r2, lần đọc 1). */
  ref: string;
  /** Chữ hiện trên màn hình (L0: nghĩa tiếng Việt). */
  prompt: string;
  promptVi?: string;
  /** Câu máy đọc trước tiếng bíp. Trống = không đọc. */
  say?: string;
  /** L0: từ mẫu, phát sau lượt nhớ lại để học sinh nói theo. */
  model?: string;
  hints: StepHint[];
  keywords?: string[];
  expectsReason?: boolean;
  /** Speed Q&A: lượt đầu có giới hạn thời gian. */
  timed?: boolean;
  /** Micro-Roleplay: thông tin tình huống, chỉ hiện ở lượt đầu. */
  roleplay?: { title: string; situationVi: string; partner: string; turn: number; of: number };
  /** Chế độ B: nội dung bài đọc. */
  reading?: { title: string; kind: "dialogue" | "passage"; lines: { speaker: string | null; text: string }[]; round: number };
  /** Ghi âm tối đa (ms) và im lặng bao lâu sau khi nói thì tự dừng. */
  maxMs: number;
  endSilenceMs: number;
};

export type Plan = { mode: Mode; unitNo: number; unitTitle: string; steps: PlanStep[] };

// ---- Ngày và tuần theo giờ Việt Nam (UTC+7, không đổi giờ) ---------------------------------------------------------

const VN_OFFSET_MS = 7 * 3600_000;
/** "2026-11-09" theo giờ Việt Nam. */
export const vnDay = (d: Date) => new Date(d.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
/** Thứ Hai của tuần chứa ngày d (giờ Việt Nam), dạng "2026-11-09". */
export function vnWeekStart(d: Date): string {
  const local = new Date(d.getTime() + VN_OFFSET_MS);
  const dow = (local.getUTCDay() + 6) % 7; // thứ Hai = 0
  return new Date(local.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

// ---- Unit của từng buổi --------------------------------------------------------------------------------------------

export const SESSIONS_PER_UNIT = 5;
/** Buổi 1–5 học Unit thứ nhất trong danh sách, 6–10 Unit thứ hai... hết danh sách thì quay lại. */
export function unitForSession(sessionNo: number, units: number[]): number {
  if (units.length === 0) throw new Error("Chưa chọn Unit luyện tập");
  return units[Math.floor((sessionNo - 1) / SESSIONS_PER_UNIT) % units.length];
}
/** Buổi thứ mấy trong Unit (0–4): dùng để xoay vòng nội dung, các buổi cùng Unit không lặp y hệt. */
export const roundInUnit = (sessionNo: number) => (sessionNo - 1) % SESSIONS_PER_UNIT;

/** Lấy n phần tử bắt đầu từ vị trí offset, quay vòng. */
export function rotate<T>(arr: T[], offset: number, n: number): T[] {
  if (arr.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < Math.min(n, arr.length); i++) out.push(arr[(offset + i) % arr.length]);
  return out;
}

// ---- Speed Q&A: 5 → 3 → 1,5 giây ---------------------------------------------------------------------------------

export const SPEED_LIMITS = [5000, 3000, 1500] as const;
export type SpeedLimit = (typeof SPEED_LIMITS)[number];
/** Kịp giờ 3 lượt liền ở một mức thì lên mức nhanh hơn; trễ 2 lượt liền thì lùi về mức chậm hơn. */
export const SPEED_UP_AFTER = 3;
export const SLOW_DOWN_AFTER = 2;

/** Mức giới hạn hiện tại, tính lại từ toàn bộ các lượt Speed Q&A có giới hạn (theo thứ tự thời gian). */
export function speedLevel(history: { limitMs: number; inLimit: boolean | null }[]): SpeedLimit {
  let i = 0;
  let hits = 0;
  let misses = 0;
  for (const h of history) {
    if (h.inLimit === null || h.limitMs !== SPEED_LIMITS[i]) continue; // lượt không đo được, hoặc ở mức khác (không tính)
    if (h.inLimit) {
      hits++;
      misses = 0;
      if (hits >= SPEED_UP_AFTER && i < SPEED_LIMITS.length - 1) {
        i++;
        hits = 0;
      }
    } else {
      misses++;
      hits = 0;
      if (misses >= SLOW_DOWN_AFTER && i > 0) {
        i--;
        misses = 0;
      }
    }
  }
  return SPEED_LIMITS[i];
}

// ---- Chấm nhanh từng lượt (quy tắc, không AI) ----------------------------------------------------------------------

export type TurnCheck = {
  words: number;
  /** L0: nói đúng từ cần nhớ. L1: dùng đủ phần cố định của khung câu. Các tầng khác: null. */
  target: boolean | null;
  keywordsUsed: string[];
  reason: boolean | null;
};

const tokens = (s: string) => s.toLowerCase().match(/[a-z']+/g) ?? [];

/** Tỷ lệ từ cố định của khung câu (bỏ chỗ trống ___) xuất hiện trong lời nói. */
export function frameCoverage(transcript: string, frame: string): number {
  const fixed = tokens(frame.replace(/_+/g, " ")).map(stem);
  if (fixed.length === 0) return 1;
  const said = new Set(tokens(transcript).map(stem));
  return fixed.filter((w) => said.has(w)).length / fixed.length;
}
export const FRAME_MIN_COVERAGE = 0.6;

export function checkTurn(step: Pick<PlanStep, "activity" | "model" | "prompt" | "keywords" | "expectsReason">, transcript: string): TurnCheck {
  const words = countWords(transcript);
  const keywordsUsed = (step.keywords ?? []).filter((k) => usesKeyword(transcript, k));
  let target: boolean | null = null;
  if (step.activity === "vocab") target = !!step.model && usesKeyword(transcript, step.model);
  if (step.activity === "frame") target = frameCoverage(transcript, step.prompt) >= FRAME_MIN_COVERAGE && words >= tokens(step.prompt).length;
  const reason = step.expectsReason ? hasReasonWord(transcript) : null;
  return { words, target, keywordsUsed, reason };
}

// ---- Lập kế hoạch buổi -------------------------------------------------------------------------------------------

export type UnitData = {
  unitNo: number;
  title: string;
  vocab: { key: string; en: string; vi: string; example: string }[];
  frames: { key: string; text: string; vi: string; examples: string[] }[];
  questions: {
    id: string;
    key: string;
    text: string;
    difficulty: number;
    kind: string;
    keywords: string[];
    frameKey: string;
    hintDirectionVi: string;
    exampleAnswer: string;
    expectsReason: boolean;
  }[];
};
export type ModeExtras = {
  reading: { id: string; kind: "dialogue" | "passage"; title: string; lines: { speaker: string | null; text: string }[] }[];
  roleplays: { id: string; titleVi: string; situationVi: string; partner: string; turns: { prompt: string; hintVi: string; keywords: string[]; example: string }[] }[];
  talks: { id: string; prompt: string; promptVi: string; points: string[]; example: string }[];
};

export const PLAN_A = { vocab: 6, frames: 3, speed: 6, expand: 3 } as const;
export const READ_ROUNDS = 2;

/** Ẩn từ cần nhớ trong câu ví dụ: "I often hang out with friends" → "I often ___ with friends". */
export function blankOut(sentence: string, phrase: string): string {
  const re = new RegExp(phrase.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*").join("\\s+"), "i");
  return re.test(sentence) ? sentence.replace(re, "___") : sentence;
}

function questionHints(q: UnitData["questions"][number], frames: UnitData["frames"]): StepHint[] {
  const frame = frames.find((f) => f.key === q.frameKey);
  const hints: StepHint[] = [
    { level: 1, title: "Hướng nghĩ", body: q.hintDirectionVi, lang: "vi" },
    { level: 2, title: "Từ khóa", body: q.keywords.join(", "), lang: "en" },
  ];
  if (frame) hints.push({ level: 3, title: "Khung câu", body: frame.text, lang: "en", note: frame.vi });
  hints.push({ level: 4, title: "Câu ví dụ", body: q.exampleAnswer, lang: "en", note: "Đọc để lấy ý, rồi nói bằng lời của em." });
  return hints;
}

export function buildPlanA(sessionNo: number, u: UnitData, extras: ModeExtras): Plan {
  const r = roundInUnit(sessionNo);
  const steps: Omit<PlanStep, "step">[] = [];

  for (const v of rotate(u.vocab, r * PLAN_A.vocab, PLAN_A.vocab)) {
    steps.push({
      layer: "L0",
      activity: "vocab",
      ref: v.key,
      prompt: v.vi,
      model: v.en,
      hints: [
        { level: 1, title: "Chữ cái đầu", body: `${v.en[0]}… (${v.en.split(/\s+/).length} từ)`, lang: "en" },
        { level: 2, title: "Câu ví dụ", body: blankOut(v.example, v.en), lang: "en" },
        { level: 3, title: "Đáp án", body: v.en, lang: "en" },
      ],
      maxMs: 8000,
      endSilenceMs: 1200,
    });
  }

  for (const f of rotate(u.frames, r * PLAN_A.frames, PLAN_A.frames)) {
    steps.push({
      layer: "L1",
      activity: "frame",
      ref: f.key,
      prompt: f.text,
      promptVi: f.vi,
      hints: [{ level: 1, title: "Câu ví dụ", body: f.examples[0], lang: "en", note: "Nói câu của em, không cần giống ví dụ." }],
      maxMs: 15000,
      endSilenceMs: 1500,
    });
  }

  const easy = u.questions.filter((q) => q.difficulty <= 2 && !q.expectsReason);
  const speedPool = easy.length >= PLAN_A.speed ? easy : u.questions.filter((q) => q.difficulty <= 2);
  for (const q of rotate(speedPool, r * PLAN_A.speed, PLAN_A.speed)) {
    steps.push({
      layer: "L1",
      activity: "speed",
      ref: q.key,
      prompt: q.text,
      say: q.text,
      hints: questionHints(q, u.frames),
      keywords: q.keywords,
      timed: true,
      maxMs: 20000,
      endSilenceMs: 1500,
    });
  }

  const taken = new Set(steps.filter((s) => s.activity === "speed").map((s) => s.ref));
  const expandPool = u.questions.filter((q) => q.expectsReason && q.difficulty >= 2 && !taken.has(q.key));
  for (const q of rotate(expandPool, r * PLAN_A.expand, PLAN_A.expand)) {
    steps.push({
      layer: "L2",
      activity: "expand",
      ref: q.key,
      prompt: q.text,
      say: q.text,
      hints: questionHints(q, u.frames),
      keywords: q.keywords,
      expectsReason: true,
      maxMs: 45000,
      endSilenceMs: 2500,
    });
  }

  const rp = extras.roleplays[r % extras.roleplays.length];
  if (rp) {
    rp.turns.forEach((t, i) =>
      steps.push({
        layer: "L3",
        activity: "roleplay",
        ref: `${rp.id}#${i + 1}`,
        prompt: t.prompt,
        say: t.prompt,
        hints: [
          { level: 1, title: "Hướng nghĩ", body: t.hintVi, lang: "vi" },
          { level: 2, title: "Từ khóa", body: t.keywords.join(", "), lang: "en" },
          { level: 4, title: "Câu ví dụ", body: t.example, lang: "en", note: "Nói theo ý của em." },
        ],
        keywords: t.keywords,
        roleplay: { title: rp.titleVi, situationVi: rp.situationVi, partner: rp.partner, turn: i + 1, of: rp.turns.length },
        maxMs: 30000,
        endSilenceMs: 2000,
      }),
    );
  }

  const talk = extras.talks[r % extras.talks.length];
  if (talk) {
    steps.push({
      layer: "L3",
      activity: "talk",
      ref: talk.id,
      prompt: talk.prompt,
      promptVi: talk.promptVi,
      say: talk.prompt,
      hints: [
        { level: 2, title: "Ý cần nói", body: talk.points.join(" · "), lang: "en" },
        { level: 4, title: "Bài nói mẫu", body: talk.example, lang: "en", note: "Đọc để lấy ý, rồi nói bằng lời của em." },
      ],
      keywords: [],
      maxMs: 75000,
      endSilenceMs: 3500,
    });
  }

  return { mode: "A", unitNo: u.unitNo, unitTitle: u.title, steps: steps.map((s, i) => ({ ...s, step: i })) };
}

export function buildPlanB(sessionNo: number, unitNo: number, unitTitle: string, extras: ModeExtras): Plan {
  const steps: PlanStep[] = [];
  // Đọc hết các bài của Unit, mỗi bài READ_ROUNDS lần; bắt đầu từ bài khác nhau ở mỗi buổi.
  for (const rd of rotate(extras.reading, roundInUnit(sessionNo), extras.reading.length)) {
    for (let round = 1; round <= READ_ROUNDS; round++) {
      steps.push({
        step: steps.length,
        layer: null,
        activity: "read_aloud",
        ref: `${rd.id}#${round}`,
        prompt: rd.title,
        hints: [],
        reading: { title: rd.title, kind: rd.kind, lines: rd.lines, round },
        maxMs: 180000,
        endSilenceMs: 0,
      });
    }
  }
  return { mode: "B", unitNo, unitTitle, steps };
}

/** Buổi xong khi mọi bước có ít nhất một lượt đã lưu. */
export const planDone = (plan: Plan, savedSteps: Set<number>) => plan.steps.every((s) => savedSteps.has(s.step));

/** Buổi được tính "hoàn thành ≥ 10 phút" (mục 1.4, mức độ tham gia). */
export const MIN_SESSION_MS = 10 * 60_000;
