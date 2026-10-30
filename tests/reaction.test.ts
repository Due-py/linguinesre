import { describe, expect, it } from "vitest";
import { median, reactionTrend, sessionMedianThink, type CompletedSession } from "@/lib/reaction";

const a = (questionId: string, attemptNo: number, thinkMs: number | null) => ({ questionId, attemptNo, thinkMs });
const s = (id: string, completedAt: string, answers: ReturnType<typeof a>[]): CompletedSession => ({ id, completedAt, unitTitle: "U", answers });

describe("thời gian bắt đầu nói", () => {
  it("trung vị: số lẻ lấy giữa, số chẵn lấy trung bình hai số giữa", () => {
    expect(median([3000, 1000, 2000])).toBe(2000);
    expect(median([1000, 2000, 3000, 9000])).toBe(2500);
    expect(median([])).toBeNull();
  });
  it("mỗi câu chỉ tính lần trả lời cuối", () => {
    const r = sessionMedianThink([a("q1", 1, 9000), a("q1", 2, 1000), a("q2", 1, 3000), a("q3", 1, 2000)]);
    expect(r).toEqual({ medianMs: 2000, measured: 3 });
  });
  it("bỏ câu không đo được", () => {
    expect(sessionMedianThink([a("q1", 1, null), a("q2", 1, 4000)])).toEqual({ medianMs: 4000, measured: 1 });
    expect(sessionMedianThink([a("q1", 1, null)])).toEqual({ medianMs: null, measured: 0 });
  });
  it("lần cuối không đo được thì câu đó không tính, kể cả khi lần trước đo được", () => {
    expect(sessionMedianThink([a("q1", 1, 5000), a("q1", 2, null), a("q2", 1, 2000)])).toEqual({ medianMs: 2000, measured: 1 });
  });
  it("xếp buổi cũ trước, bỏ buổi không có số đo", () => {
    const pts = reactionTrend([
      s("b", "2026-11-03T10:00:00Z", [a("q1", 1, 2000)]),
      s("a", "2026-11-01T10:00:00Z", [a("q1", 1, 3200)]),
      s("c", "2026-11-02T10:00:00Z", [a("q1", 1, null)]),
    ]);
    expect(pts.map((p) => [p.sessionId, p.medianMs])).toEqual([
      ["a", 3200],
      ["b", 2000],
    ]);
  });
});
