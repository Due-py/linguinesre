/**
 * Thời gian phản xạ (Response Latency, RL) theo định nghĩa của quy trình nghiên cứu (mục 1.4):
 * từ lúc HẾT tiếng bíp tới lúc bắt đầu từ tiếng Anh có nghĩa đầu tiên, bỏ qua âm ngập ngừng.
 * Không trả lời trong 10 giây → ghi 10 giây và đánh dấu "không trả lời".
 *
 * Mốc thời gian từng từ lấy từ Deepgram (giây, tính từ đầu file ghi âm). Tiếng bíp được trộn vào chính file ghi âm
 * nên người đo tay bằng Audacity thấy đúng mốc đó. Không import gì để script Node dùng lại được.
 */

export type AsrWord = { word: string; start: number; end: number };
export type RlResult = { rlMs: number; status: "ok" | "no_response"; firstWord: string | null };

export const RL_LIMIT_MS = 10_000;

/**
 * Âm ngập ngừng: uh, um, er, ah, hmm (mục 1.4) và các cách máy chép lời hay viết chúng.
 * "ờ, à, ừm" của tiếng Việt thường được máy chép thành "uh", "ah", "um". "oh" KHÔNG nằm trong danh sách.
 */
export const FILLERS = new Set(["uh", "um", "uhm", "umm", "uhh", "er", "erm", "err", "ah", "ahh", "hmm", "hm", "hmmm", "mm", "mmm", "mhm", "eh"]);

const clean = (w: string) => w.toLowerCase().replace(/[^a-z']/g, "");
export const isFiller = (w: string) => FILLERS.has(clean(w)) || clean(w) === "";

export function computeRl(words: AsrWord[], beepEndMs: number): RlResult {
  // Bỏ từ kết thúc trước khi hết tiếng bíp (thường là đuôi giọng đọc câu hỏi lọt vào micro).
  const first = words.find((w) => !isFiller(w.word) && w.end * 1000 > beepEndMs);
  if (!first) return { rlMs: RL_LIMIT_MS, status: "no_response", firstWord: null };
  const rl = Math.max(0, Math.round(first.start * 1000 - beepEndMs));
  if (rl > RL_LIMIT_MS) return { rlMs: RL_LIMIT_MS, status: "no_response", firstWord: clean(first.word) };
  return { rlMs: rl, status: "ok", firstWord: clean(first.word) };
}

/** Trung vị (mục 1.4: RL của một học sinh = trung vị RL các câu của một đề). */
export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
