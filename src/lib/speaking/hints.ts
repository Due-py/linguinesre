/**
 * Bốn mức trợ giúp, lấy thẳng từ nội dung đã duyệt (không gọi AI):
 *  1. Hướng nghĩ bằng tiếng Việt  2. Từ khóa  3. Khung câu  4. Câu ví dụ ngắn.
 * Mở từng mức một; mức cao nhất đã mở được lưu vào session_answers.hint_level. Dùng gợi ý không bị trừ điểm.
 */
export type HintSource = {
  hintDirectionVi: string;
  keywords: string[];
  frame: { text: string; vi: string } | null;
  exampleAnswer: string;
};

export type Hint = { level: 1 | 2 | 3 | 4; title: string; body: string; lang: "vi" | "en"; note?: string };

export const HINT_TITLES = ["Hướng nghĩ", "Từ khóa", "Khung câu", "Câu ví dụ"] as const;

export function buildHints(q: HintSource): Hint[] {
  const hints: Hint[] = [
    { level: 1, title: HINT_TITLES[0], body: q.hintDirectionVi, lang: "vi" },
    { level: 2, title: HINT_TITLES[1], body: q.keywords.join(", "), lang: "en" },
  ];
  if (q.frame) hints.push({ level: 3, title: HINT_TITLES[2], body: q.frame.text, lang: "en", note: q.frame.vi });
  hints.push({
    level: 4,
    title: HINT_TITLES[3],
    body: q.exampleAnswer,
    lang: "en",
    note: "Đọc để lấy ý, rồi nói bằng lời của bạn. Không cần nói y hệt.",
  });
  return hints;
}

/** Mức cao nhất đã mở, giữ nguyên khi người dùng đóng gợi ý (không giảm). */
export const nextHintLevel = (current: number, opened: number) => Math.max(current, Math.min(4, Math.max(0, opened)));
