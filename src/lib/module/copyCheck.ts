/**
 * Chống "chấm máy móc" trong bài học Hành trình: học sinh đọc lại câu hỏi, câu ví dụ trong gợi ý, hoặc câu của bạn nói chuyện
 * (Linguine) thì không được tính là tự nói. Lý do / ví dụ / gợi ý phải là một vế câu thật, không chỉ một từ nối.
 * CHỈ dùng cho bài học Hành trình. Phần nghiên cứu (chế độ A/B, bài kiểm tra) giữ nguyên quy tắc cũ để cách đo không đổi.
 * File thuần để test.
 */
import { stem } from "../feedback/measures";

const words = (s: string): string[] => s.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g) ?? [];

/** Tỷ lệ từ của câu nguồn có trong lời nói (theo gốc từ, bỏ qua thứ tự). Giống heardRatio của measure.ts. */
export function overlap(transcript: string, source: string): number {
  const want = words(source).map(stem);
  if (want.length === 0) return 0;
  const said = new Set(words(transcript).map(stem));
  return want.filter((w) => said.has(w)).length / want.length;
}

/** Lời nói gần như lặp lại nguyên văn một câu có sẵn (câu hỏi, câu ví dụ, câu của bạn nói chuyện). */
export function isEcho(transcript: string, source: string | null | undefined): boolean {
  if (!source) return false;
  const t = words(transcript).length;
  if (t === 0) return false;
  return overlap(transcript, source) >= 0.8 && Math.abs(t - words(source).length) <= 3;
}

/** Sau từ nối phải có ít nhất `min` từ trong cùng câu (không tính dấu câu), để "because." hay "so much" không được tính. */
function clauseAfter(text: string, marker: RegExp, min = 3): boolean {
  const s = text.replace(/’/g, "'");
  for (const sentence of s.split(/[.!?]+/)) {
    const re = new RegExp(marker.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(sentence))) {
      if (words(sentence.slice(m.index + m[0].length)).length >= min) return true;
    }
  }
  return false;
}

/** Có nêu lý do thật: because / since / the reason is / that's why + vế câu; "so" chỉ tính khi theo sau là chủ ngữ (so I, so we...). */
export function givesReason(text: string): boolean {
  return (
    clauseAfter(text, /\b(because|since|the reason is|that's why|that is why)\b/) ||
    clauseAfter(text, /\bso (?=(i|we|it|they|he|she|you|my|our|people|students)\b)/, 2)
  );
}

export function givesExample(text: string): boolean {
  return clauseAfter(text, /\b(for example|for instance|such as|like when)\b/, 2);
}

export function givesSuggestion(text: string): boolean {
  return clauseAfter(text, /\b(should|let's|let us|why don't we|how about|i suggest|we could|we can|could we)\b/, 2);
}
