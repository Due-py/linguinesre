/**
 * "Đo trực tiếp": các số tính bằng quy tắc từ chữ ghi lời và số đo của trình duyệt, KHÔNG qua AI.
 * Không import gì để script Node dùng lại được. Tất cả là ƯỚC LƯỢNG từ chữ ghi lời (máy có thể nghe sai).
 */

export type Measures = {
  thinkMs: number | null;
  speakMs: number | null;
  words: number;
  /** Từ khóa gợi ý của câu hỏi và những từ khóa học sinh đã dùng (theo thứ tự gợi ý). */
  keywords: { total: number; used: string[] };
  /** "not_required": câu hỏi không đòi hỏi lý do nên không chấm mục này. */
  reason: "yes" | "no" | "not_required";
};

const tokens = (s: string) => s.toLowerCase().match(/[a-z']+/g) ?? [];

/**
 * Rút gọn thô để "hanging out" khớp "hang out", "liking" khớp "like", "relaxed" khớp "relax".
 * Không hoàn hảo (từ bất quy tắc như "went" không khớp "go"); chấp nhận vì chỉ để đếm từ khóa.
 */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/'/g, "");
  if (w.length > 4) w = w.replace(/(ing|ed|es|s)$/, "");
  w = w.replace(/e$/, "");
  return w.replace(/([^aeiou])\1$/, "$1"); // runn -> run
}

/** Cụm từ khóa xuất hiện đúng thứ tự, liền nhau, trong chữ ghi lời. */
export function usesKeyword(transcript: string, keyword: string): boolean {
  const t = tokens(transcript).map(stem);
  const k = tokens(keyword).map(stem);
  if (k.length === 0) return false;
  for (let i = 0; i + k.length <= t.length; i++) {
    if (k.every((w, j) => t[i + j] === w)) return true;
  }
  return false;
}

const REASON_WORDS = /\b(because|since|so|as|that's why|the reason is)\b/i;
export const hasReasonWord = (transcript: string) => REASON_WORDS.test(transcript.replace(/’/g, "'"));

export function countWords(transcript: string): number {
  return tokens(transcript).length;
}

export function computeMeasures(input: {
  thinkMs: number | null;
  speakMs: number | null;
  transcript: string;
  keywords: string[];
  expectsReason: boolean;
}): Measures {
  return {
    thinkMs: input.thinkMs,
    speakMs: input.speakMs,
    words: countWords(input.transcript),
    keywords: { total: input.keywords.length, used: input.keywords.filter((k) => usesKeyword(input.transcript, k)) },
    reason: !input.expectsReason ? "not_required" : hasReasonWord(input.transcript) ? "yes" : "no",
  };
}
