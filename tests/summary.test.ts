import { describe, expect, it } from "vitest";
import type { FeedbackView } from "@/app/(student)/student/practice/actions";
import type { Measures } from "@/lib/feedback/measures";
import { latestAttempt, pickGoal, sessionStats, type ReportQuestion } from "@/lib/summary";

const m = (over: Partial<Measures> = {}): Measures => ({
  thinkMs: 2000,
  speakMs: 5000,
  words: 12,
  keywords: { total: 3, used: ["a", "b"] },
  reason: "not_required",
  ...over,
});
const view = (attemptNo: number, measures: Measures, issues = 0): FeedbackView => ({
  attemptNo,
  measures,
  status: "ok",
  mock: false,
  ai: {
    content: { status: "assessed", comment_vi: "" },
    grammar: { status: "assessed", issues: Array.from({ length: issues }, (_, i) => ({ quote: `q${i}`, fix: `f${i}`, explanation_vi: "" })) },
    vocabulary: { status: "assessed", comment_vi: "" },
    completeness: { status: "assessed", level: "adequate", comment_vi: "" },
    improved_sentence: null,
    dropped_issues: 0,
  },
});
const q = (id: string, ...views: FeedbackView[]): ReportQuestion => ({
  id,
  text: `Question ${id}?`,
  attempts: views.map((v) => ({ answerId: `${id}-${v.attemptNo}`, attemptNo: v.attemptNo, transcript: "x", hintLevel: 0, audioUrl: null, view: v })),
});

describe("mục tiêu buổi sau (quy tắc cố định)", () => {
  it("không có câu trả lời thì không có mục tiêu", () => {
    expect(pickGoal([])).toBeNull();
  });
  it("ưu tiên 1: ít nhất nửa số câu cần lý do mà thiếu lý do", () => {
    const g = pickGoal([m({ reason: "no" }), m({ reason: "yes" }), m(), m({ words: 3 }), m({ words: 3 }), m({ words: 3 })]);
    expect(g?.key).toBe("reason");
    expect(g?.basis).toBe("1/2 câu hỏi cần lý do chưa có từ nối lý do.");
  });
  it("ưu tiên 2: ít nhất nửa số câu dưới 8 từ", () => {
    expect(pickGoal([m({ words: 5 }), m({ words: 7 }), m({ words: 20 })])?.key).toBe("longer");
    expect(pickGoal([m({ words: 5 }), m({ words: 20 }), m({ words: 20 })])?.key).not.toBe("longer");
  });
  it("ưu tiên 3: dùng chưa tới 1/3 số từ gợi ý", () => {
    const g = pickGoal([m({ keywords: { total: 3, used: [] } }), m({ keywords: { total: 3, used: ["a"] } })]);
    expect(g?.key).toBe("keywords");
    expect(g?.basis).toContain("1/6");
  });
  it("mọi số đo đều ổn thì giữ nhịp", () => {
    expect(pickGoal([m({ reason: "yes" }), m()])?.key).toBe("keep");
  });
  it("câu không cần lý do không bị tính là thiếu lý do", () => {
    expect(pickGoal([m(), m(), m()])?.key).toBe("keep");
  });
});

describe("tổng kết buổi", () => {
  it("mỗi câu chỉ tính lần trả lời cuối", () => {
    const one = q("1", view(1, m({ words: 3 })), view(2, m({ words: 15 })));
    expect(latestAttempt(one)?.attemptNo).toBe(2);
    const s = sessionStats([one]);
    expect(s.goal?.key).toBe("keep"); // lần 1 ngắn nhưng lần 2 đủ dài
    expect(s.retries).toBe(1);
  });
  it("đếm câu đã trả lời, câu mở gợi ý, trung bình thời gian suy nghĩ đo được", () => {
    const a = q("a", view(1, m({ thinkMs: 1000 })));
    a.attempts[0].hintLevel = 2;
    const b = q("b", view(1, m({ thinkMs: null })));
    const c = q("c", view(1, m({ thinkMs: 3000 })));
    const s = sessionStats([a, b, c, q("d")]);
    expect(s.answered).toBe(3);
    expect(s.total).toBe(4);
    expect(s.withHints).toBe(1);
    expect(s.avgThinkMs).toBe(2000);
  });
  it("chưa đo được thời gian thì trung bình là null, không bịa số", () => {
    expect(sessionStats([q("a", view(1, m({ thinkMs: null })))]).avgThinkMs).toBeNull();
  });
  it("gom lỗi ngữ pháp từ lần trả lời cuối, bỏ lỗi của lần trước", () => {
    const s = sessionStats([q("a", view(1, m(), 3), view(2, m(), 1))]);
    expect(s.issues).toHaveLength(1);
    expect(s.issues[0].questionText).toBe("Question a?");
  });
});
