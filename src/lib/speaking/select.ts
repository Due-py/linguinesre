/**
 * Chọn câu hỏi cho một buổi luyện. Quy tắc cố định (không dùng AI), dễ giải thích:
 *  1. Ưu tiên câu học sinh trả lời ít lần nhất (câu mới trước), để luyện vận dụng thay vì nhớ câu cũ.
 *  2. Trong buổi, cố gắng có đủ các mức: 2 câu dễ, 2 câu vừa, 1 câu khó (nếu Unit đủ câu).
 *  3. Sắp xếp buổi theo độ khó tăng dần.
 * Hòa nhau thì xáo trộn theo hạt giống (xác định, test được).
 * Điều chỉnh độ khó theo kết quả các buổi trước là Giai đoạn 3, chưa có ở đây.
 */
export type Candidate = { id: string; difficulty: 1 | 2 | 3 };

export const SESSION_SIZE = 5;
const MIX: Record<1 | 2 | 3, number> = { 1: 2, 2: 2, 3: 1 };

function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

export function pickQuestions(
  all: Candidate[],
  timesAnswered: Map<string, number>,
  seed: number,
  size = SESSION_SIZE,
): Candidate[] {
  const rnd = seededRandom(seed);
  const tie = new Map(all.map((q) => [q.id, rnd()]));
  const order = (a: Candidate, b: Candidate) =>
    (timesAnswered.get(a.id) ?? 0) - (timesAnswered.get(b.id) ?? 0) || tie.get(a.id)! - tie.get(b.id)!;

  const chosen: Candidate[] = [];
  for (const d of [1, 2, 3] as const) {
    chosen.push(...all.filter((q) => q.difficulty === d).sort(order).slice(0, MIX[d]));
  }
  // Unit thiếu câu ở một mức thì lấy bù từ các câu còn lại.
  if (chosen.length < size) {
    const taken = new Set(chosen.map((q) => q.id));
    chosen.push(...all.filter((q) => !taken.has(q.id)).sort(order).slice(0, size - chosen.length));
  }
  return chosen.slice(0, size).sort((a, b) => a.difficulty - b.difficulty);
}
