import { describe, expect, it } from "vitest";
import { questionSpread, statusCounts, studentMock } from "@/lib/mockGrading";

const base = { invited: true, completedAt: null, answeredQids: [] as string[], grades: [] as { question_id: string; score: number }[], reviewDone: false };

describe("chấm bài thi thử (trang giáo viên)", () => {
  it("trạng thái: không giao → chưa mở → đang làm → đã nộp → đã chấm xong", () => {
    expect(studentMock({ ...base, invited: false }).status).toBe("not_sent");
    expect(studentMock(base).status).toBe("not_started");
    expect(studentMock({ ...base, answeredQids: ["q01"] }).status).toBe("in_progress");
    expect(studentMock({ ...base, answeredQids: ["q01"], completedAt: "2026-11-15T10:00:00Z" }).status).toBe("submitted");
    expect(studentMock({ ...base, completedAt: "2026-11-15T10:00:00Z", reviewDone: true }).status).toBe("graded");
  });

  it("đếm câu đã nói, đã chấm, đạt 2 điểm; bỏ mã câu lạ; không có điểm tổng", () => {
    const s = studentMock({ ...base, answeredQids: ["q01", "q02", "q02", "q99"], grades: [{ question_id: "q01", score: 2 }, { question_id: "q02", score: 1 }, { question_id: "q11", score: 2 }] });
    expect(s.answered).toBe(2);
    expect(s.said).toEqual(["q01", "q02"]);
    expect(s.graded).toBe(2);
    expect(s.full).toBe(1);
    expect(s).not.toHaveProperty("total");
  });

  it("cả lớp theo từng câu và đếm trạng thái", () => {
    const a = studentMock({ ...base, grades: [{ question_id: "q01", score: 2 }, { question_id: "q02", score: 0 }] });
    const b = studentMock({ ...base, grades: [{ question_id: "q01", score: 1 }] });
    const spread = questionSpread([a, b]);
    expect(spread[0]).toEqual({ qid: "q01", two: 1, one: 1, zero: 0 });
    expect(spread[1]).toEqual({ qid: "q02", two: 0, one: 0, zero: 1 });
    expect(spread).toHaveLength(10);
    expect(statusCounts([a, b, studentMock({ ...base, invited: false })])).toMatchObject({ not_started: 2, not_sent: 1 });
  });
});
