/**
 * "Đo trực tiếp" cho một lượt nói trong module: tính bằng quy tắc từ chữ ghi lời có mốc thời gian (Deepgram), KHÔNG qua AI.
 * Không import gì ngoài file thuần để test và script Node dùng lại được.
 *
 * Độ rõ (clarity) là tỷ lệ từ máy nghe chắc chắn. Đây là ƯỚC LƯỢNG máy có nghe ra lời hay không, không phải điểm phát âm:
 * máy nghe kém có thể do micro, tiếng ồn. Khi máy nghe quá kém (unclear) thì xin nói lại, không kết luận gì về học sinh.
 */
import { countWords, hasReasonWord, stem, usesKeyword } from "../feedback/measures";
import { isFiller } from "../research/latency";
import { givesExample, givesReason, givesSuggestion, isEcho } from "./copyCheck";

export type AsrWordC = { word: string; start: number; end: number; confidence: number };

export type SpeechMeasures = {
  words: number;
  /** Từ lúc hết câu hỏi tới từ có nghĩa đầu tiên (ms). */
  thinkMs: number | null;
  /** Từ đầu tiên tới từ cuối cùng (ms). */
  speakMs: number | null;
  /** Số từ mỗi phút trong lúc nói. */
  wpm: number | null;
  /** Số chỗ ngừng từ 1,5 giây trở lên giữa hai từ. */
  longPauses: number;
  /** Tỷ lệ từ máy nghe chắc chắn (độ tin cậy ≥ 0,8). */
  clarity: number | null;
  /** Máy nghe quá kém: xin nói lại, không chấm. */
  unclear: boolean;
  /**
   * Những từ máy nghe chưa chắc (độ tin cậy dưới 0,8), tối đa 8 từ, để học sinh nghe mẫu và nói lại.
   * Không phải lỗi phát âm: có thể do micro, tiếng ồn. Bản ghi cũ không có trường này.
   */
  lowWords?: string[];
  /** Bước có câu mẫu (nói từ, đọc theo, đọc câu đã xếp): đối chiếu câu mẫu với lời máy nghe (để chấm phát âm đúng đoạn). */
  ref?: RefHeard;
};

export const LONG_PAUSE_MS = 1500;
export const CLEAR_WORD_CONFIDENCE = 0.8;
export const UNCLEAR_MEAN_CONFIDENCE = 0.55;
export const MAX_LOW_WORDS = 8;

const tokens = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g) ?? [];

/**
 * lagMs: thời gian từ lúc đọc xong câu hỏi tới lúc bắt đầu ghi âm (trình duyệt đo). clientOnsetMs: ước lượng của trình
 * duyệt khi máy chủ không có mốc thời gian từng từ.
 */
export function speechMeasures(words: AsrWordC[], transcript: string, lagMs: number, clientOnsetMs: number | null): SpeechMeasures {
  const real = words.filter((w) => !isFiller(w.word));
  const first = real[0];
  const last = real.at(-1);
  const thinkMs = first ? Math.max(0, Math.round(lagMs + first.start * 1000)) : clientOnsetMs === null ? null : Math.max(0, Math.round(lagMs + clientOnsetMs));
  const speakMs = first && last ? Math.max(0, Math.round((last.end - first.start) * 1000)) : null;
  let longPauses = 0;
  for (let i = 1; i < real.length; i++) if ((real[i].start - real[i - 1].end) * 1000 >= LONG_PAUSE_MS) longPauses++;
  const n = countWords(transcript);
  const wpm = speakMs && speakMs >= 1000 && real.length >= 3 ? Math.round((real.length / speakMs) * 60_000) : null;
  const meanConf = real.length ? real.reduce((s, w) => s + w.confidence, 0) / real.length : null;
  const clarity = real.length ? real.filter((w) => w.confidence >= CLEAR_WORD_CONFIDENCE).length / real.length : null;
  const lowWords = [...new Set(real.filter((w) => w.confidence < CLEAR_WORD_CONFIDENCE).map((w) => tokens(w.word).join("")).filter(Boolean))].slice(0, MAX_LOW_WORDS);
  return {
    words: n,
    thinkMs,
    speakMs,
    wpm,
    longPauses,
    clarity: clarity === null ? null : Math.round(clarity * 100) / 100,
    unclear: n === 0 || (meanConf !== null && meanConf < UNCLEAR_MEAN_CONFIDENCE),
    lowWords,
  };
}

/** Tỷ lệ từ của câu mẫu mà máy nghe ra trong lời nói (bỏ qua thứ tự). Dùng cho nói theo, xếp câu, mở rộng câu. */
export function heardRatio(transcript: string, target: string): number {
  const want = tokens(target).map(stem);
  if (want.length === 0) return 1;
  const said = new Set(tokens(transcript).map(stem));
  return want.filter((w) => said.has(w)).length / want.length;
}

export const SAY_MIN_RATIO = 0.8;

/** Từng từ của câu mẫu: máy chép lời có nghe thấy không (độ tin cậy), và đoạn thời gian em nói câu mẫu trong bản ghi (giây). */
export type RefHeard = {
  start: number | null;
  end: number | null;
  words: { word: string; conf: number | null }[];
  /** Toàn bộ lời máy nghe được (không tính "uh/um"): số từ và đoạn thời gian, để bỏ khoảng im lặng đầu, cuối. */
  all: { count: number; start: number | null; end: number | null };
};

/**
 * Đối chiếu câu mẫu với các từ máy chép lời nghe được, giữ đúng thứ tự (dãy con chung dài nhất theo gốc từ). Dùng để chấm
 * phát âm đúng ĐOẠN em đọc câu mẫu (bỏ phần nói thêm, nói lặp, im lặng) và để kết quả chấm khớp với những gì máy đã nghe.
 * Nếu em đọc câu mẫu nhiều lần, lấy lần cuối.
 */
export function matchReference(words: AsrWordC[], target: string): RefHeard {
  const ref = tokens(target);
  const asr = words.map((w) => ({ ...w, t: tokens(w.word).join("") })).filter((w) => w.t && !isFiller(w.t));
  const n = ref.length;
  const m = asr.length;
  // dp[i][j]: số từ khớp nhiều nhất giữa ref[i..] và asr[j..]; khi bằng nhau ưu tiên khớp muộn hơn (lần đọc cuối).
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = stem(ref[i]) === stem(asr[j].t) ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: RefHeard["words"] = ref.map((w) => ({ word: w, conf: null }));
  const hit: AsrWordC[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (stem(ref[i]) === stem(asr[j].t) && dp[i][j] === 1 + dp[i + 1][j + 1] && dp[i][j + 1] < dp[i][j]) {
      out[i].conf = Math.round(asr[j].confidence * 100) / 100;
      hit.push(asr[j]);
      i++;
      j++;
    } else if (dp[i][j + 1] >= dp[i + 1][j]) j++;
    else i++;
  }
  return {
    start: hit.length ? hit[0].start : null,
    end: hit.length ? hit[hit.length - 1].end : null,
    words: out,
    all: { count: m, start: m ? asr[0].start : null, end: m ? asr[m - 1].end : null },
  };
}

/** Những từ của câu mẫu máy KHÔNG nghe ra trong lời nói (giữ đúng chữ trong câu mẫu, không trùng). Dùng cho nói theo. */
export function missedWords(transcript: string, target: string): string[] {
  const said = new Set(tokens(transcript).map(stem));
  return [...new Set(tokens(target).filter((w) => !said.has(stem(w))))];
}


export type Requirement = { kind: "reason" | "example" | "suggestion" | "keyword"; vi: string; words: string[] };

/**
 * Kiểm tra yêu cầu của tình huống roleplay trên lời học sinh (quy tắc, không AI). Lượt nào em chỉ nhắc lại câu bạn nói chuyện
 * vừa nói thì không tính; lý do / ví dụ / gợi ý phải là một vế câu thật, không chỉ một từ nối.
 * turns: lời em; aiBefore[i]: câu bạn nói chuyện ngay trước lượt i (để nhận ra nhắc lại).
 */
export function requirementMet(r: Requirement, turns: string[], aiBefore: (string | null)[] = []): boolean {
  // Chỉ những lượt em tự nói (không nhắc lại câu bạn nói chuyện vừa nói).
  const own = turns.map((t, i) => ({ t, ai: aiBefore[i] ?? null })).filter((x) => !isEcho(x.t, x.ai));
  const all = own.map((x) => x.t).join(". ");
  switch (r.kind) {
    case "reason":
      return givesReason(all);
    case "example":
      return givesExample(all);
    case "suggestion":
      return givesSuggestion(all);
    case "keyword":
      // Từ khóa có sẵn trong câu bạn vừa nói thì em phải tự dùng thêm, không tính khi chỉ lặp lại.
      return own.some((x) => r.words.some((w) => usesKeyword(x.t, w) && !usesKeyword(x.ai ?? "", w)));
  }
}

export { countWords, hasReasonWord, usesKeyword };
