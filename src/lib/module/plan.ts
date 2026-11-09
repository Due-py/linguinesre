/**
 * Lộ trình 14 ngày của một Learning Module: lập bài học từng ngày từ nội dung đã kiểm tra và lịch sử học thật của học sinh.
 * Quy tắc thuần, cố định, không gọi mạng và không dùng AI, để giải thích được từng quyết định và test được.
 *
 * Mỗi quyết định thích ứng (bỏ bớt phần đã biết, thêm bài xếp câu, đặt mục tiêu tốc độ...) đều kèm một câu giải thích
 * trong `notesVi` để học sinh và thầy cô biết vì sao bài hôm nay như vậy.
 */
import type { ErrorTag, ModuleContent } from "./schema";
import { ERROR_TAGS } from "./schema";

// ---- Khung 14 ngày -------------------------------------------------------------------------------------------------

export const DAYS = 14;
export const PHASES = [
  { no: 1, titleVi: "Nền tảng", days: [1, 2, 3], goalVi: "Có đủ từ vựng, ngữ pháp, phát âm và cụm câu để bắt đầu nói về chủ đề." },
  { no: 2, titleVi: "Nói có hướng dẫn", days: [4, 5, 6], goalVi: "Từ từ vựng lên câu, lên câu dài, rồi trả lời câu hỏi với gợi ý giảm dần." },
  { no: 3, titleVi: "Phản xạ", days: [7, 8, 9, 10], goalVi: "Trả lời không cần gợi ý, hiểu câu hỏi dù được hỏi theo cách khác, bắt đầu nói nhanh hơn, sửa lỗi rồi nói lại." },
  { no: 4, titleVi: "Giao tiếp thật", days: [11, 12], goalVi: "Dùng kiến thức trong tình huống trò chuyện với AI, không có kịch bản." },
  { no: 5, titleVi: "Đánh giá cuối", days: [13, 14], goalVi: "Tự nói không gợi ý với câu hỏi mới và câu đã học từ tuần trước, so sánh với bài đầu module." },
] as const;

/**
 * Mỗi ngày (Lesson) có mục tiêu và tiêu chí hoàn thành riêng. Tiêu chí "xong bài" chỉ là làm hết các bước;
 * "đạt" được đo riêng ở các bài kiểm tra cuối giai đoạn (xem report.ts), vì làm xong bài chưa có nghĩa là đã thành thạo.
 */
export const DAY_INFO: Record<number, { titleVi: string; minutes: number; goalVi: string; doneVi: string }> = {
  1: { titleVi: "Bài đầu module, từ vựng và phát âm", minutes: 20, goalVi: "Biết em đang ở đâu, học nửa đầu từ vựng và một âm khó.", doneVi: "Làm bài đầu module (không gợi ý), học hết từ mới, nói theo câu luyện âm." },
  2: { titleVi: "Nhớ lại từ vựng", minutes: 20, goalVi: "Nhớ lại từ đã học, học nốt từ còn lại và cụm từ đi kèm.", doneVi: "Nhớ lại từ đến hạn ôn, học hết từ mới, làm bài cụm từ." },
  3: { titleVi: "Ngữ pháp, cụm câu hay và kiểm tra kiến thức", minutes: 25, goalVi: "Hiểu cấu trúc ngữ pháp và cụm câu của Unit.", doneVi: "Học hết thẻ kiến thức và làm bài kiểm tra cuối Phase 1." },
  4: { titleVi: "Từ vựng thành câu, xếp câu", minutes: 20, goalVi: "Dùng từ của bài để nói thành câu hoàn chỉnh.", doneVi: "Nói một câu với mỗi cụm từ, xếp đúng các câu." },
  5: { titleVi: "Mở rộng câu", minutes: 20, goalVi: "Biến câu ngắn thành câu dài có thời gian, lý do, kết quả.", doneVi: "Mở rộng hết các câu theo câu hỏi phụ." },
  6: { titleVi: "Trả lời câu hỏi có gợi ý từng bước", minutes: 25, goalVi: "Trả lời câu hỏi của Unit, dùng gợi ý ít dần.", doneVi: "Trả lời hết câu hỏi bằng lời của em (gợi ý không bị trừ gì)." },
  7: { titleVi: "Ôn tập và kiểm tra nhỏ", minutes: 20, goalVi: "Kiểm tra Phase 2: trả lời không cần gợi ý.", doneVi: "Làm bài kiểm tra kiến thức và 3 câu nói không gợi ý." },
  8: { titleVi: "Một ý, nhiều cách hỏi", minutes: 20, goalVi: "Hiểu ý câu hỏi dù được hỏi theo cách khác.", doneVi: "Trả lời mỗi ý được hỏi bằng hai cách." },
  9: { titleVi: "Speed Q&A mức 1", minutes: 20, goalVi: "Bắt đầu nói trong mục tiêu thời gian riêng của em.", doneVi: "Trả lời hết các câu Speed Q&A." },
  10: { titleVi: "Speed Q&A mức 2, sửa lỗi và kiểm tra Phase 3", minutes: 25, goalVi: "Nói nhanh hơn, sửa lỗi rồi nói lại, kiểm tra cuối Phase 3.", doneVi: "Trả lời Speed Q&A, nói lại sau nhận xét, làm 2 câu kiểm tra không gợi ý." },
  11: { titleVi: "Micro-Roleplay cơ bản", minutes: 25, goalVi: "Trò chuyện trong tình huống quen thuộc, đạt yêu cầu của tình huống.", doneVi: "Hoàn thành 2 tình huống." },
  12: { titleVi: "Micro-Roleplay nâng cao và kiểm tra Phase 4", minutes: 25, goalVi: "Giữ được cuộc trò chuyện khi bạn kia có ý kiến khác.", doneVi: "Hoàn thành 2 tình huống và 1 câu nói tình huống không gợi ý." },
  13: { titleVi: "Bài nói độc lập và câu hỏi nhắc lại", minutes: 20, goalVi: "Tự nói với câu hỏi mới, và nhớ được câu đã luyện từ tuần trước.", doneVi: "Trả lời hết câu hỏi, không gợi ý." },
  14: { titleVi: "Đánh giá cuối module", minutes: 25, goalVi: "Kiểm tra kiến thức, roleplay tình huống mới, so sánh với bài đầu module.", doneVi: "Làm bài kiến thức cuối module và roleplay cuối." },
};

export const phaseOf = (day: number) => PHASES.find((p) => (p.days as readonly number[]).includes(day))!;

// ---- Các bước của một bài ------------------------------------------------------------------------------------------

export type QuizSet = "entry" | "check1" | "check2" | "final" | "practice" | "review";
export type QuizArea = "vocab" | "grammar" | "pron" | "expression";
export type QuizItem = {
  area: QuizArea;
  prompt: string;
  promptLang: "en" | "vi";
  options: string[];
  optionsLang: "en" | "vi";
  answer: number;
  explainVi: string;
  errorTag: ErrorTag | null;
};
export type StepHint = { level: 1 | 2 | 3 | 4; title: string; body: string; lang: "vi" | "en"; note?: string };
export type SpeakSource = "unit" | "variation" | "independent";

export type Step =
  | { t: "learn_word"; ref: string }
  | { t: "recall_word"; ref: string; review: boolean }
  | { t: "known_words"; ref: "known"; refs: string[] }
  | { t: "card"; ref: string }
  | { t: "say"; ref: string; text: string }
  | { t: "quiz"; ref: string; set: QuizSet; q: QuizItem }
  | { t: "use_word"; ref: string; phrase: string }
  | { t: "arrange"; ref: string; shuffled: string[] }
  | { t: "expand"; ref: string }
  | {
      t: "speak";
      ref: string;
      text: string;
      source: SpeakSource;
      /** id câu hỏi trong CSDL (câu của Unit) để phát giọng đọc; null với câu của module. */
      qid: string | null;
      hints: StepHint[];
      keywords: string[];
      expectsReason: boolean;
      /** Speed Q&A: mục tiêu thời gian bắt đầu nói riêng của học sinh (ms). */
      targetMs: number | null;
      /** none: không AI. ask: AI nhận xét khi bấm. auto: tự nhận xét (bài kiểm tra, sửa lỗi). */
      assess: "none" | "ask" | "auto";
      /** Error Correction and Retry: sau nhận xét, nói lại với một câu hỏi tương tự. */
      retry: { ref: string; text: string } | null;
      /** Bài kiểm tra: không gợi ý, không nói lại. */
      test: boolean;
    }
  | { t: "roleplay"; ref: string; test: boolean }
  | { t: "report"; ref: ReportRef };

/** check1: cuối Phase 1 (ngày 3), check2: cuối Phase 2 (ngày 7), check3: cuối Phase 3 (ngày 10), check4: cuối Phase 4 (ngày 12). */
export type ReportRef = "check1" | "check2" | "check3" | "check4" | "final";

export type PlannedStep = Step & { n: number };
export type Lesson = { day: number; phase: number; titleVi: string; minutes: number; notesVi: string[]; steps: PlannedStep[] };

/** Câu hỏi của Unit luyện tập (đọc từ CSDL), kèm 4 mức gợi ý. */
export type UnitQuestion = {
  id: string;
  key: string;
  text: string;
  difficulty: number;
  keywords: string[];
  expectsReason: boolean;
  hints: StepHint[];
};

// ---- Lịch sử học (đọc từ module_attempts) và các số suy ra -------------------------------------------------------

export type HistoryAttempt = {
  day: number;
  t: Step["t"];
  ref: string;
  set: QuizSet | null;
  area: QuizArea | null;
  attemptNo: number;
  correct: boolean | null;
  thinkMs: number | null;
  hintLevel: number;
  inTarget: boolean | null;
  targetMs: number | null;
  errorTags: string[];
  at: string;
};

const DAY_MS = 86_400_000;
/** Ôn ngắt quãng kiểu hộp Leitner: hộp càng cao thì càng lâu mới ôn lại (ngày). */
export const REVIEW_INTERVAL_DAYS = [0, 1, 2, 4, 7] as const;
const MAX_BOX = REVIEW_INTERVAL_DAYS.length - 1;

export type VocabState = { box: number; lastAt: number; seen: number; correct: number };

/** Trạng thái nhớ từng từ: đúng thì lên một hộp, sai thì về hộp 1. Tính lại từ đầu theo thứ tự thời gian. */
export function vocabStates(history: HistoryAttempt[]): Map<string, VocabState> {
  const out = new Map<string, VocabState>();
  const events = history
    .filter((h) => h.correct !== null && /^v\d{2}$/.test(h.ref) && (h.t === "recall_word" || h.t === "learn_word" || (h.t === "quiz" && h.area === "vocab")))
    .sort((a, b) => a.at.localeCompare(b.at));
  for (const e of events) {
    const s = out.get(e.ref) ?? { box: 0, lastAt: 0, seen: 0, correct: 0 };
    s.seen++;
    if (e.correct) {
      s.correct++;
      s.box = Math.min(MAX_BOX, s.box + 1);
    } else s.box = 1;
    s.lastAt = Date.parse(e.at);
    out.set(e.ref, s);
  }
  return out;
}

/** Từ đến hạn ôn: đã gặp, và đã qua đủ số ngày của hộp đang ở. Từ yếu và lâu chưa ôn đứng trước. */
export function dueVocab(states: Map<string, VocabState>, now: number, limit: number): string[] {
  return [...states.entries()]
    .filter(([, s]) => s.seen > 0 && now - s.lastAt >= REVIEW_INTERVAL_DAYS[s.box] * DAY_MS - DAY_MS / 4 && s.box < MAX_BOX)
    .sort((a, b) => a[1].box - b[1].box || a[1].lastAt - b[1].lastAt)
    .slice(0, limit)
    .map(([ref]) => ref);
}

/** Error Memory: đếm lỗi theo nhãn, từ nhận xét AI (đã kiểm chứng) và câu ngữ pháp trả lời sai. */
export function errorCounts(history: HistoryAttempt[]): Map<ErrorTag, number> {
  const out = new Map<ErrorTag, number>();
  for (const h of history) for (const t of h.errorTags) if (t in ERROR_TAGS) out.set(t as ErrorTag, (out.get(t as ErrorTag) ?? 0) + 1);
  return out;
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Tỷ lệ đúng của các câu trắc nghiệm trong một bộ (và một mảng kiến thức nếu có). null = chưa làm. */
export function quizScore(history: HistoryAttempt[], set: QuizSet, area?: QuizArea): { correct: number; total: number } | null {
  const xs = history.filter((h) => h.t === "quiz" && h.set === set && h.attemptNo === 1 && (!area || h.area === area));
  if (xs.length === 0) return null;
  return { correct: xs.filter((h) => h.correct).length, total: xs.length };
}

/** Thời gian bắt đầu nói (lượt đầu, không tính bài kiểm tra đầu module) của các câu nói gần nhất. */
export function recentThinkMs(history: HistoryAttempt[], n = 8): number | null {
  const xs = history
    .filter((h) => h.t === "speak" && h.attemptNo === 1 && h.thinkMs !== null && h.day > 1)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, n)
    .map((h) => h.thinkMs!);
  return median(xs);
}

/**
 * Em đã sẵn sàng cho câu khó (độ khó 3) chưa, theo các lượt tự trả lời câu hỏi gần đây (lượt đầu, không phải bài đầu module):
 * cần ít nhất 4 câu, bắt đầu nói (trung vị) trong 6 giây và đa số câu không phải mở tới gợi ý mức 3 trở lên.
 * Chưa đủ 4 câu thì coi là chưa biết: KHÔNG đưa câu khó (để học sinh không bị "nhảy" từ câu dễ sang câu dài, khó).
 */
export const READY_RULE = { minAnswers: 4, thinkMs: 6000, heavyHint: 3, heavyShare: 0.5 } as const;
export function speakingReady(history: HistoryAttempt[]): { ready: boolean; known: boolean } {
  const xs = history.filter((h) => h.t === "speak" && h.attemptNo === 1 && h.day > 1).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
  if (xs.length < READY_RULE.minAnswers) return { ready: false, known: false };
  const think = median(xs.map((h) => h.thinkMs).filter((n): n is number => n !== null));
  const heavy = xs.filter((h) => h.hintLevel >= READY_RULE.heavyHint).length / xs.length;
  return { ready: think !== null && think <= READY_RULE.thinkMs && heavy < READY_RULE.heavyShare, known: true };
}

// ---- Speed Q&A: mục tiêu riêng từng học sinh ----------------------------------------------------------------------

export const SPEED_DEFAULT_MS = 5000;
export const SPEED_MIN_MS = 1500;
export const SPEED_MAX_MS = 8000;
const round500 = (ms: number) => Math.round(ms / 500) * 500;
const clampSpeed = (ms: number) => Math.min(SPEED_MAX_MS, Math.max(SPEED_MIN_MS, ms));

/**
 * Mức 1 (ngày 9): khoảng 85% thời gian bắt đầu nói thường ngày của chính học sinh (7 giây → 6 giây).
 * Mức 2 (ngày 10): chỉ nhanh thêm khi mức 1 đạt ít nhất 60% số câu; chưa đạt thì giữ nguyên.
 */
export function speedTarget(history: HistoryAttempt[], level: 1 | 2): { ms: number; noteVi: string } {
  const base = recentThinkMs(history);
  const l1 = base === null ? SPEED_DEFAULT_MS : clampSpeed(round500(base * 0.85));
  const note1 =
    base === null
      ? `Chưa có đủ số đo thời gian bắt đầu nói, nên mục tiêu bắt đầu là ${l1 / 1000} giây.`
      : `Thời gian bắt đầu nói thường ngày của em khoảng ${(base / 1000).toFixed(1)} giây, nên mục tiêu là ${l1 / 1000} giây.`;
  if (level === 1) return { ms: l1, noteVi: note1 };
  const day9 = history.filter((h) => h.day === 9 && h.t === "speak" && h.attemptNo === 1 && h.inTarget !== null);
  const hit = day9.length ? day9.filter((h) => h.inTarget).length / day9.length : 0;
  // Mức 2 tính từ mục tiêu ĐÃ dùng ở ngày 9 (không tính lại từ số đo mới), để chỉ nhanh hơn khi đã đạt mức cũ.
  const prev = day9.find((h) => h.targetMs !== null)?.targetMs ?? l1;
  if (day9.length >= 3 && hit >= 0.6) {
    const ms = clampSpeed(round500(prev * 0.85));
    return { ms, noteVi: `Hôm qua em kịp mục tiêu ở ${Math.round(hit * 100)}% số câu, nên hôm nay mục tiêu nhanh hơn một chút: ${ms / 1000} giây.` };
  }
  return { ms: prev, noteVi: `Mục tiêu giữ ở ${prev / 1000} giây cho tới khi em kịp giờ đều hơn (từ 60% số câu).` };
}

// ---- Câu trắc nghiệm từ Kho kiến thức ----------------------------------------------------------------------------

/** Số ngẫu nhiên tái lặp được từ một chuỗi (cùng học sinh, cùng ngày → cùng thứ tự). */
export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
export function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Đặt đáp án đúng vào vị trí ngẫu nhiên giữa các phương án nhiễu. */
function withChoices(correct: string, distractors: string[], rnd: () => number): { options: string[]; answer: number } {
  const options = shuffle([correct, ...distractors.slice(0, 2)], rnd);
  return { options, answer: options.indexOf(correct) };
}

type RefQuiz = { ref: string; q: QuizItem };

function vocabMeaning(m: ModuleContent, i: number, rnd: () => number): RefQuiz {
  const v = m.vocab[i];
  const others = shuffle(m.vocab.filter((x) => x.id !== v.id).map((x) => x.vi), rnd);
  return {
    ref: v.id,
    q: { area: "vocab", prompt: `What does "${v.en}" mean?`, promptLang: "en", ...withChoices(v.vi, others, rnd), optionsLang: "vi", explainVi: `${v.en} ${v.ipa}: ${v.vi}.`, errorTag: null },
  };
}
function vocabReverse(m: ModuleContent, i: number, rnd: () => number): RefQuiz {
  const v = m.vocab[i];
  const others = shuffle(m.vocab.filter((x) => x.id !== v.id).map((x) => x.en), rnd);
  return {
    ref: v.id,
    q: { area: "vocab", prompt: `“${v.vi}” trong tiếng Anh là gì?`, promptLang: "vi", ...withChoices(v.en, others, rnd), optionsLang: "en", explainVi: `${v.vi}: ${v.en} ${v.ipa}.`, errorTag: null },
  };
}
/** Cụm từ đi kèm: "reduce our carbon footprint" → "___ our carbon footprint". Chỉ khi cụm chứa đúng từ đó. */
function vocabCollocation(m: ModuleContent, i: number, rnd: () => number): RefQuiz | null {
  const v = m.vocab[i];
  const c = v.collocations.find((x) => x.toLowerCase().includes(v.en.toLowerCase()) && x.toLowerCase() !== v.en.toLowerCase());
  if (!c) return null;
  const blank = c.replace(new RegExp(v.en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "___");
  const others = shuffle(m.vocab.filter((x) => x.id !== v.id && !c.toLowerCase().includes(x.en.toLowerCase())).map((x) => x.en), rnd);
  return {
    ref: v.id,
    q: { area: "vocab", prompt: `Complete the phrase: ${blank}`, promptLang: "en", ...withChoices(v.en, others, rnd), optionsLang: "en", explainVi: `Cụm từ đúng: ${c}.`, errorTag: null },
  };
}
function grammarDrills(m: ModuleContent): RefQuiz[] {
  return m.grammar.flatMap((g) =>
    g.drills.map((d, j) => ({
      ref: `${g.id}.${j + 1}`,
      q: { area: "grammar" as const, prompt: d.prompt, promptLang: "en" as const, options: d.options, optionsLang: "en" as const, answer: d.answer, explainVi: d.explainVi, errorTag: g.errorTag },
    })),
  );
}
function pronQuiz(m: ModuleContent): RefQuiz[] {
  return m.pronunciation.flatMap((p) =>
    p.quiz.map((d, j) => ({
      ref: `${p.id}.${j + 1}`,
      q: { area: "pron" as const, prompt: d.prompt, promptLang: "en" as const, options: d.options, optionsLang: "en" as const, answer: d.answer, explainVi: d.explainVi, errorTag: null },
    })),
  );
}
function expressionQuiz(m: ModuleContent, i: number, rnd: () => number): RefQuiz {
  const e = m.expressions[i];
  const others = shuffle(m.expressions.filter((x) => x.id !== e.id).map((x) => x.en), rnd);
  return {
    ref: e.id,
    q: { area: "expression", prompt: `${e.useVi} Em nói:`, promptLang: "vi", ...withChoices(e.en, others, rnd), optionsLang: "en", explainVi: `${e.en} (${e.vi}).`, errorTag: null },
  };
}

/** Lấy n phần tử trải đều trong danh sách (để bài kiểm tra phủ cả đầu lẫn cuối danh sách). */
export function spread<T>(xs: T[], n: number, offset = 0): T[] {
  if (xs.length === 0 || n <= 0) return [];
  if (xs.length <= n) return xs;
  const step = xs.length / n;
  return Array.from({ length: n }, (_, k) => xs[(Math.floor(k * step) + offset) % xs.length]);
}
const parity = <T,>(xs: T[], odd: boolean) => xs.filter((_, i) => i % 2 === (odd ? 1 : 0));

/**
 * Bài trắc nghiệm kiến thức 8 câu: 4 từ vựng, 2 ngữ pháp, 1 cụm câu, 1 phát âm (thiếu phát âm thì thêm từ vựng).
 * Đầu module (entry) và cuối module (final) cùng cấu trúc nhưng KHÁC câu: entry lấy các mục ở vị trí chẵn, final ở vị trí lẻ.
 * Kiểm tra giữa chừng (check1, check2) lấy trên toàn bộ kho, lệch vị trí để không trùng nhau.
 */
export function knowledgeQuiz(m: ModuleContent, set: "entry" | "check1" | "check2" | "final", seed: string): RefQuiz[] {
  const rnd = seeded(`${seed}|${set}`);
  const vIdx = m.vocab.map((_, i) => i);
  const gAll = grammarDrills(m);
  const pAll = pronQuiz(m);
  const eIdx = m.expressions.map((_, i) => i);
  const odd = set === "final";
  const pick = <T,>(xs: T[], n: number, off: number) => (set === "entry" || set === "final" ? spread(parity(xs, odd), n) : spread(xs, n, off));
  const off = set === "check1" ? 1 : 2;

  const pron = pick(pAll, 1, off);
  const vocab = pick(vIdx, pron.length ? 4 : 5, off).map((i, k) => (k % 2 === 0 ? vocabMeaning(m, i, rnd) : vocabReverse(m, i, rnd)));
  // Ngữ pháp: mỗi cấu trúc một câu trước khi lấy câu thứ hai của cùng cấu trúc.
  const byGrammar = m.grammar.map((g) => pick(gAll.filter((x) => x.ref.startsWith(`${g.id}.`)), 2, off));
  const grammar: RefQuiz[] = [];
  for (let k = 0; grammar.length < 2 && k < 2; k++) for (const xs of byGrammar) if (grammar.length < 2 && xs[k]) grammar.push(xs[k]);
  const expr = pick(eIdx, 1, off).map((i) => expressionQuiz(m, i, rnd));
  return [...vocab, ...grammar, ...expr, ...pron];
}

// ---- Bài từng ngày -------------------------------------------------------------------------------------------------

export type PlanInput = {
  day: number;
  module: ModuleContent;
  unitQuestions: UnitQuestion[];
  history: HistoryAttempt[];
  /** Ổn định theo học sinh: cùng học sinh, cùng ngày → cùng bài. */
  seed: string;
  now: number;
};

const firstHalf = <T,>(xs: T[]) => xs.slice(0, Math.ceil(xs.length / 2));
const secondHalf = <T,>(xs: T[]) => xs.slice(Math.ceil(xs.length / 2));

/** Gợi ý của câu Question Variation: hướng nghĩ, từ khóa, câu ví dụ. */
function variationHints(v: ModuleContent["variations"][number], max: number): StepHint[] {
  const all: StepHint[] = [
    { level: 1, title: "Hướng nghĩ", body: v.ideaVi, lang: "vi" },
    { level: 2, title: "Từ khóa", body: v.keywords.join(", "), lang: "en" },
    { level: 4, title: "Câu ví dụ", body: v.exampleAnswer, lang: "en", note: "Đọc để lấy ý, rồi nói bằng lời của em. Không cần nói y hệt." },
  ];
  return all.filter((h) => h.level <= max);
}

function speakUnit(q: UnitQuestion, o: { hints: number; targetMs?: number | null; assess?: "none" | "ask" | "auto"; test?: boolean }): Step {
  return {
    t: "speak",
    ref: q.key,
    text: q.text,
    source: "unit",
    qid: q.id,
    hints: q.hints.filter((h) => h.level <= o.hints),
    keywords: q.keywords,
    expectsReason: q.expectsReason,
    targetMs: o.targetMs ?? null,
    assess: o.assess ?? "ask",
    retry: null,
    test: o.test ?? false,
  };
}

/** Câu của Unit chưa từng trả lời trong module, ưu tiên độ khó cho trước, rồi theo thứ tự trong bài. */
function freshQuestions(input: PlanInput, used: Set<string>, difficulties: number[]): UnitQuestion[] {
  const answered = new Set(input.history.filter((h) => h.t === "speak").map((h) => h.ref));
  const pool = input.unitQuestions.filter((q) => !used.has(q.key));
  const out: UnitQuestion[] = [];
  for (const d of difficulties) {
    const q =
      pool.find((x) => x.difficulty === d && !answered.has(x.key) && !out.includes(x)) ??
      pool.find((x) => !answered.has(x.key) && !out.includes(x)) ??
      pool.find((x) => !out.includes(x));
    if (q) {
      out.push(q);
      used.add(q.key);
    }
  }
  return out;
}

/** Câu Question Variation chưa từng hỏi trong module và chưa có trong bài hôm nay; lấy câu ở cuối mỗi nhóm trước. */
function unusedVariations(input: PlanInput, used: Set<string>, n: number): Step[] {
  const out: Step[] = [];
  for (let k = 3; k >= 0 && out.length < n; k--)
    for (const v of input.module.variations) {
      if (out.length >= n) break;
      const text = v.questions[k];
      const ref = `${v.id}.${k + 1}`;
      if (!text || used.has(ref)) continue;
      used.add(ref);
      out.push({ t: "speak", ref, text, source: "variation", qid: null, hints: [], keywords: v.keywords, expectsReason: v.expectsReason, targetMs: null, assess: "auto", retry: null, test: true });
    }
  return out;
}

/**
 * Câu hỏi nhắc lại (delayed questions): câu của Unit đã trả lời có gợi ý ở ngày 4–8, hỏi lại không gợi ý ở ngày 13
 * để xem em còn nhớ và tự nói được không. Lấy câu luyện sớm nhất trước (cách lâu nhất).
 */
export function delayedQuestions(input: PlanInput, n: number): UnitQuestion[] {
  const early = input.history
    .filter((h) => h.t === "speak" && h.attemptNo === 1 && h.day >= 4 && h.day <= 8)
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((h) => h.ref);
  const out: UnitQuestion[] = [];
  for (const ref of early) {
    const q = input.unitQuestions.find((x) => x.key === ref);
    if (q && !out.includes(q)) out.push(q);
    if (out.length >= n) break;
  }
  return out;
}

/** Khối ôn đầu bài: từ đến hạn ôn (ôn ngắt quãng) và lỗi hay gặp nhất (Error Memory → Personalized Review). */
function reviewBlock(input: PlanInput, maxWords: number, notes: string[]): Step[] {
  const steps: Step[] = [];
  const due = dueVocab(vocabStates(input.history), input.now, maxWords);
  for (const ref of due) steps.push({ t: "recall_word", ref, review: true });
  if (due.length) notes.push(`Ôn lại ${due.length} từ đã đến hạn ôn (từ em hay quên được ôn sớm hơn).`);

  const top = [...errorCounts(input.history).entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    const [tag, count] = top;
    steps.push({ t: "card", ref: `err:${tag}` });
    const g = input.module.grammar.find((x) => x.errorTag === tag);
    if (g) {
      const drills = grammarDrills(input.module).filter((d) => d.ref.startsWith(`${g.id}.`));
      const d = drills[count % drills.length];
      steps.push({ t: "quiz", ref: d.ref, set: "review", q: d.q });
    }
    notes.push(`Em đã gặp lỗi "${ERROR_TAGS[tag]}" ${count} lần, nên có một phần ôn riêng cho lỗi này.`);
  }
  return steps;
}

export function buildLesson(input: PlanInput): Lesson {
  const { day, module: m, history, seed } = input;
  const rnd = seeded(`${seed}|day${day}`);
  const notes: string[] = [];
  const steps: Step[] = [];
  const used = new Set<string>(history.filter((h) => h.t === "speak").map((h) => h.ref));
  const quiz = (set: "entry" | "check1" | "check2" | "final") =>
    knowledgeQuiz(m, set, seed).forEach((x) => steps.push({ t: "quiz", ref: x.ref, set, q: x.q }));

  switch (day) {
    case 1: {
      // Bài đầu module: biết gì rồi, nói được tới đâu khi chưa học. Không gợi ý, không nói lại.
      quiz("entry");
      for (const q of m.independent.filter((x) => x.set === "entry").sort((a, b) => a.pair - b.pair))
        steps.push({ t: "speak", ref: q.id, text: q.text, source: "independent", qid: null, hints: [], keywords: q.keywords, expectsReason: q.expectsReason, targetMs: null, assess: "auto", retry: null, test: true });
      // Kết quả bài đầu module hiện ở trang tổng quan của module, không chen vào giữa buổi học.
      const words = firstHalf(m.vocab);
      for (const v of words) steps.push({ t: "learn_word", ref: v.id });
      const p = m.pronunciation.find((x) => x.kind === "sound") ?? m.pronunciation[0];
      steps.push({ t: "card", ref: p.id });
      if (p.sentence) steps.push({ t: "say", ref: `${p.id}.s`, text: p.sentence });
      break;
    }
    case 2: {
      steps.push(...reviewBlock(input, 8, notes));
      // Từ của nửa sau: từ đã trả lời đúng ở bài đầu module thì chỉ điểm lại, không học kỹ lại.
      const entryRight = new Set(history.filter((h) => h.set === "entry" && h.area === "vocab" && h.correct).map((h) => h.ref));
      const words = secondHalf(m.vocab);
      const known = words.filter((v) => entryRight.has(v.id));
      const fresh = words.filter((v) => !entryRight.has(v.id));
      if (known.length) {
        steps.push({ t: "known_words", ref: "known", refs: known.map((v) => v.id) });
        notes.push(`Em đã biết ${known.length} từ ở bài đầu module, nên chỉ điểm lại các từ này thay vì học lại.`);
      }
      for (const v of fresh) steps.push({ t: "learn_word", ref: v.id });
      const p2 = m.pronunciation.filter((x) => x.kind === "sound")[1];
      if (p2) {
        steps.push({ t: "card", ref: p2.id });
        if (p2.sentence) steps.push({ t: "say", ref: `${p2.id}.s`, text: p2.sentence });
      }
      for (const i of spread(m.vocab.map((_, k) => k), 3, 1)) {
        const c = vocabCollocation(m, i, rnd);
        if (c) steps.push({ t: "quiz", ref: c.ref, set: "practice", q: c.q });
      }
      break;
    }
    case 3: {
      steps.push(...reviewBlock(input, 4, notes));
      for (const g of m.grammar) {
        steps.push({ t: "card", ref: g.id });
        for (const d of grammarDrills(m).filter((x) => x.ref.startsWith(`${g.id}.`)).slice(0, 2)) steps.push({ t: "quiz", ref: d.ref, set: "practice", q: d.q });
      }
      steps.push({ t: "card", ref: "expressions" });
      for (const e of spread(m.expressions, 3)) steps.push({ t: "say", ref: e.id, text: e.example });
      for (const p of m.pronunciation.filter((x) => x.kind !== "sound")) steps.push({ t: "card", ref: p.id });
      quiz("check1");
      steps.push({ t: "report", ref: "check1" });
      break;
    }
    case 4: {
      steps.push(...reviewBlock(input, 4, notes));
      const words = shuffle(m.vocab.filter((v) => v.collocations.length > 0), rnd).slice(0, 4);
      for (const v of words) steps.push({ t: "use_word", ref: v.id, phrase: v.collocations[0] });
      const g = quizScore(history, "check1", "grammar") ?? quizScore(history, "practice", "grammar");
      const weak = g !== null && g.correct / g.total < 0.6;
      const builds = weak ? m.build.length : Math.min(5, m.build.length);
      if (weak) notes.push(`Phần ngữ pháp ở bài kiểm tra ngày 3 em đúng ${g!.correct}/${g!.total} câu, nên hôm nay có thêm bài xếp câu.`);
      for (const b of m.build.slice(0, builds)) steps.push({ t: "arrange", ref: b.id, shuffled: shuffleChunks(b.chunks, rnd) });
      break;
    }
    case 5: {
      steps.push(...reviewBlock(input, 4, notes));
      for (const b of m.build.slice(Math.min(5, m.build.length)).slice(0, 2)) steps.push({ t: "arrange", ref: b.id, shuffled: shuffleChunks(b.chunks, rnd) });
      for (const x of m.expand) steps.push({ t: "expand", ref: x.id });
      break;
    }
    case 6: {
      steps.push(...reviewBlock(input, 3, notes));
      const c = quizScore(history, "check1");
      const strong = c !== null && c.correct / c.total >= 0.8;
      // Câu khó (độ khó 3) chỉ khi số đo nói cho thấy em đã sẵn sàng; không thì tăng dần nhẹ, dừng ở độ khó 2.
      const ready = speakingReady(history).ready;
      const levels = strong && ready ? [1, 2, 2, 3, 3] : ready ? [1, 1, 2, 2, 3] : [1, 1, 2, 2, 2];
      if (strong && ready) notes.push(`Bài kiểm tra ngày 3 em đúng ${c!.correct}/${c!.total} câu và em trả lời khá nhanh, nên hôm nay có nhiều câu khó hơn.`);
      else if (!ready) notes.push("Hôm nay các câu hỏi tăng độ khó từ từ, chưa có câu khó nhất: luyện chắc câu vừa sức trước.");
      for (const q of freshQuestions(input, used, levels)) steps.push(speakUnit(q, { hints: 4, assess: "ask" }));
      break;
    }
    case 7: {
      steps.push(...reviewBlock(input, 6, notes));
      quiz("check2");
      const ready7 = speakingReady(history).ready;
      if (!ready7) notes.push("Ba câu kiểm tra ở mức em đã luyện (chưa có câu khó nhất).");
      for (const q of freshQuestions(input, used, ready7 ? [1, 2, 3] : [1, 2, 2])) steps.push(speakUnit(q, { hints: 0, assess: "auto", test: true }));
      steps.push({ t: "report", ref: "check2" });
      break;
    }
    case 8: {
      steps.push(...reviewBlock(input, 3, notes));
      for (const v of m.variations.slice(0, 3))
        for (const [k, text] of v.questions.slice(0, 2).entries())
          steps.push({ t: "speak", ref: `${v.id}.${k + 1}`, text, source: "variation", qid: null, hints: variationHints(v, 2), keywords: v.keywords, expectsReason: v.expectsReason, targetMs: null, assess: "ask", retry: null, test: false });
      notes.push("Mỗi ý được hỏi bằng hai cách khác nhau, để em quen hiểu ý câu hỏi chứ không chỉ nhớ một câu.");
      break;
    }
    case 9:
    case 10: {
      steps.push(...reviewBlock(input, 3, notes));
      const target = speedTarget(history, day === 9 ? 1 : 2);
      notes.push(target.noteVi);
      const slow = recentThinkMs(history);
      const extra = day === 9 && slow !== null && slow > 5000;
      if (extra) notes.push("Em thường cần hơn 5 giây để bắt đầu nói, nên hôm nay có thêm 2 câu Speed Q&A.");
      const n = day === 9 ? (extra ? 8 : 6) : 4;
      const qs = freshQuestions(input, used, Array.from({ length: n }, (_, k) => (k < n / 2 ? 1 : 2)));
      for (const q of qs) steps.push(speakUnit(q, { hints: 2, targetMs: target.ms, assess: "none" }));
      if (day === 10) {
        // Error Correction and Retry: AI chỉ ra lỗi, em nói lại với một câu hỏi tương tự.
        const groups = m.variations.length > 3 ? m.variations.slice(3) : m.variations;
        for (const v of [...groups, ...m.variations].slice(0, 3)) {
          const [a, b] = v.questions.length > 3 ? [v.questions[2], v.questions[3]] : [v.questions[v.questions.length - 1], v.questions[0]];
          const k = v.questions.indexOf(a);
          steps.push({
            t: "speak",
            ref: `${v.id}.${k + 1}`,
            text: a,
            source: "variation",
            qid: null,
            hints: variationHints(v, 2),
            keywords: v.keywords,
            expectsReason: v.expectsReason,
            targetMs: null,
            assess: "auto",
            retry: { ref: `${v.id}.${v.questions.indexOf(b) + 1}`, text: b },
            test: false,
          });
          used.add(`${v.id}.${k + 1}`);
          used.add(`${v.id}.${v.questions.indexOf(b) + 1}`);
        }
        // Kiểm tra cuối Phase 3: câu chưa luyện, không gợi ý, vẫn đo mục tiêu thời gian riêng. Không gọi AI (đỡ tốn).
        for (const x of unusedVariations(input, used, 2)) if (x.t === "speak") steps.push({ ...x, targetMs: target.ms, assess: "none" });
        steps.push({ t: "report", ref: "check3" });
        notes.push("Cuối bài có 2 câu kiểm tra Phase 3: câu chưa luyện, không gợi ý, đo thời gian bắt đầu nói.");
      }
      break;
    }
    case 11:
    case 12: {
      steps.push(...reviewBlock(input, 3, notes));
      if (day === 11) {
        steps.push({ t: "card", ref: "expressions" });
        const r = m.roleplays.filter((x) => x.level === "basic");
        for (const x of r.slice(0, 2)) steps.push({ t: "roleplay", ref: x.id, test: false });
      } else {
        // Khó duy trì hội thoại (ngày 11 có tình huống chưa đạt hết yêu cầu) thì luyện thêm một tình huống cơ bản mới trước.
        const missed = history.some((h) => h.day === 11 && h.t === "roleplay" && h.correct === false);
        const extraBasic = m.roleplays.filter((x) => x.level === "basic")[2];
        if (missed && extraBasic) {
          steps.push({ t: "roleplay", ref: extraBasic.id, test: false });
          notes.push("Hôm qua có tình huống em chưa đạt hết yêu cầu, nên hôm nay luyện thêm một tình huống cơ bản trước.");
        }
        const r = m.roleplays.filter((x) => x.level === "advanced");
        for (const x of r.slice(0, 2)) steps.push({ t: "roleplay", ref: x.id, test: false });
        steps.push(...unusedVariations(input, used, 1));
        steps.push({ t: "report", ref: "check4" });
        notes.push("Cuối bài có 1 câu kiểm tra Phase 4: nói về một tình huống, không gợi ý.");
      }
      break;
    }
    case 13: {
      for (const q of m.independent.filter((x) => x.set === "final").sort((a, b) => a.pair - b.pair))
        steps.push({ t: "speak", ref: q.id, text: q.text, source: "independent", qid: null, hints: [], keywords: q.keywords, expectsReason: q.expectsReason, targetMs: null, assess: "auto", retry: null, test: true });
      for (const q of freshQuestions(input, used, speakingReady(history).ready ? [2, 3] : [2, 2])) steps.push(speakUnit(q, { hints: 0, assess: "auto", test: true }));
      const again = delayedQuestions(input, 2);
      for (const q of again) steps.push(speakUnit(q, { hints: 0, assess: "auto", test: true }));
      notes.push("Hôm nay không có gợi ý: câu hỏi mới, em tự nói bằng lời của mình.");
      if (again.length) notes.push(`Có ${again.length} câu em đã luyện từ tuần trước được hỏi lại, để xem em còn nhớ và tự nói được không.`);
      break;
    }
    case 14: {
      quiz("final");
      const r = m.roleplays.find((x) => x.level === "final")!;
      steps.push({ t: "roleplay", ref: r.id, test: true });
      steps.push({ t: "report", ref: "final" });
      break;
    }
    default:
      throw new Error(`Ngày ${day} không thuộc module 14 ngày`);
  }

  return {
    day,
    phase: phaseOf(day).no,
    titleVi: DAY_INFO[day].titleVi,
    minutes: DAY_INFO[day].minutes,
    notesVi: notes,
    steps: steps.map((s, n) => ({ ...s, n })),
  };
}

/** Trộn các mảnh câu sao cho không trùng thứ tự đúng (nếu trộn được). */
export function shuffleChunks(chunks: string[], rnd: () => number): string[] {
  for (let k = 0; k < 6; k++) {
    const s = shuffle(chunks, rnd);
    if (s.some((c, i) => c !== chunks[i])) return s;
  }
  return [...chunks].reverse();
}

/** Ngày được mở: ngày 1, hoặc ngày ngay sau ngày đã hoàn thành gần nhất. Học lại ngày đã xong không cần. */
export function nextOpenDay(completedDays: number[]): number | null {
  for (let d = 1; d <= DAYS; d++) if (!completedDays.includes(d)) return d;
  return null;
}
