/**
 * "Đo trực tiếp" cho một lượt nói trong module: tính bằng quy tắc từ chữ ghi lời có mốc thời gian (Deepgram), KHÔNG qua AI.
 * Không import gì ngoài file thuần để test và script Node dùng lại được.
 *
 * Độ rõ (clarity) là tỷ lệ từ máy nghe chắc chắn. Đây là ƯỚC LƯỢNG máy có nghe ra lời hay không, không phải điểm phát âm:
 * máy nghe kém có thể do micro, tiếng ồn. Khi máy nghe quá kém (unclear) thì xin nói lại, không kết luận gì về học sinh.
 */
import { countWords, hasReasonWord, stem, usesKeyword } from "../feedback/measures";
import { isFiller } from "../research/latency";

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
};

export const LONG_PAUSE_MS = 1500;
export const CLEAR_WORD_CONFIDENCE = 0.8;
export const UNCLEAR_MEAN_CONFIDENCE = 0.55;

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
  return {
    words: n,
    thinkMs,
    speakMs,
    wpm,
    longPauses,
    clarity: clarity === null ? null : Math.round(clarity * 100) / 100,
    unclear: n === 0 || (meanConf !== null && meanConf < UNCLEAR_MEAN_CONFIDENCE),
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

const SUGGESTION = /\b(should|let's|let us|why don't we|how about|i suggest|we could|we can|could we)\b/i;
const EXAMPLE = /\b(for example|for instance|such as|like when)\b/i;

export type Requirement = { kind: "reason" | "example" | "suggestion" | "keyword"; vi: string; words: string[] };

/** Kiểm tra yêu cầu của tình huống roleplay trên toàn bộ lời học sinh (quy tắc, không AI). */
export function requirementMet(r: Requirement, studentTurns: string[]): boolean {
  const all = studentTurns.join(" ").replace(/’/g, "'");
  switch (r.kind) {
    case "reason":
      return hasReasonWord(all);
    case "example":
      return EXAMPLE.test(all);
    case "suggestion":
      return SUGGESTION.test(all);
    case "keyword":
      return r.words.some((w) => usesKeyword(all, w));
  }
}

export { countWords, hasReasonWord, usesKeyword };
