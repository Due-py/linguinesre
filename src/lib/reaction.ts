/**
 * "Thời gian bắt đầu nói" qua các buổi luyện tự do (quy tắc thuần, không AI, có test).
 *  - Nguồn: think_ms của câu trả lời, do TRÌNH DUYỆT ước lượng (từ lúc đọc xong câu hỏi tới lúc micro nghe thấy tiếng nói).
 *  - Mỗi câu chỉ tính lần trả lời cuối (như summary.ts). Câu không đo được (think_ms trống) bị bỏ qua.
 *  - Mỗi buổi lấy trung vị (ít bị lệch bởi một câu bất thường). Chỉ tính buổi đã hoàn thành.
 *  - Dưới REACTION_MIN_SESSIONS buổi có số đo thì không vẽ xu hướng.
 * Không import gì để test và script dùng lại được.
 */

export type ThinkAnswer = { questionId: string; attemptNo: number; thinkMs: number | null };
export type CompletedSession = { id: string; completedAt: string; unitTitle: string; answers: ThinkAnswer[] };
export type ReactionPoint = { sessionId: string; completedAt: string; unitTitle: string; medianMs: number; measured: number };

export const REACTION_MIN_SESSIONS = 2;

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Trung vị thời gian bắt đầu nói của một buổi, chỉ lấy lần trả lời cuối của mỗi câu. */
export function sessionMedianThink(answers: ThinkAnswer[]): { medianMs: number | null; measured: number } {
  const last = new Map<string, ThinkAnswer>();
  for (const a of answers) {
    const cur = last.get(a.questionId);
    if (!cur || a.attemptNo > cur.attemptNo) last.set(a.questionId, a);
  }
  const ms = [...last.values()].map((a) => a.thinkMs).filter((x): x is number => x !== null);
  return { medianMs: median(ms), measured: ms.length };
}

/** Các điểm theo thứ tự thời gian (buổi cũ trước). Buổi không có câu nào đo được thì bỏ. */
export function reactionTrend(sessions: CompletedSession[]): ReactionPoint[] {
  return [...sessions]
    .sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1))
    .map((s) => ({ s, r: sessionMedianThink(s.answers) }))
    .filter(({ r }) => r.medianMs !== null)
    .map(({ s, r }) => ({ sessionId: s.id, completedAt: s.completedAt, unitTitle: s.unitTitle, medianMs: r.medianMs!, measured: r.measured }));
}
