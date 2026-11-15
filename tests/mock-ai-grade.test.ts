import { describe, expect, it } from "vitest";
import { mockTestFor } from "@/lib/mockTest";
import { quoteFound, scoreAnswer, type Judgement } from "@/lib/mockAiGrade";
import { studentMock } from "@/lib/mockGrading";

const t = mockTestFor(8)!;
const reasonQ = t.questions.find((q) => q.expectsReason)!;
const personalQ = t.questions.find((q) => q.kind === "personal")!;
const j = (over: Partial<Judgement> = {}): Judgement => ({ answers_question: true, only_repeats_question: false, gives_reason: false, evidence: "", note_vi: "", ...over });

describe("AI chấm thi thử: điểm do quy tắc cố định, AI chỉ nhận định có/không", () => {
  it("R0: không có lời → 0, không cần AI", () => {
    expect(scoreAnswer(personalQ, "", null)).toEqual({ score: 0, rule: "R0" });
    expect(scoreAnswer(personalQ, "um uh", null)).toEqual({ score: 0, rule: "R0" });
  });

  it("R1: đọc lại câu hỏi mà không trả lời → 0, kể cả AI nói là có trả lời", () => {
    expect(scoreAnswer(reasonQ, reasonQ.text, null)).toEqual({ score: 0, rule: "R1" });
    expect(scoreAnswer(reasonQ, reasonQ.text, j({ answers_question: true, gives_reason: true, evidence: reasonQ.text }))).toEqual({ score: 0, rule: "R1" });
    expect(scoreAnswer(personalQ, "how do I spend my Sunday afternoon hmm", j({ only_repeats_question: true }))).toEqual({ score: 0, rule: "R1" });
  });

  it("chưa có nhận định AI thì không tự cho điểm (trừ R0, R1)", () => {
    expect(scoreAnswer(personalQ, "I play football with my friends", null)).toBeNull();
  });

  it("R2 lạc đề → 0; R3 dưới 5 từ → 1; R5 đạt → 2", () => {
    expect(scoreAnswer(personalQ, "My favourite colour is blue and green", j({ answers_question: false }))).toEqual({ score: 0, rule: "R2" });
    expect(scoreAnswer(personalQ, "Play football", j())).toEqual({ score: 1, rule: "R3" });
    expect(scoreAnswer(personalQ, "I usually play badminton with my dad", j())).toEqual({ score: 2, rule: "R5" });
  });

  it("R4: câu cần lý do mà không có lý do, hoặc trích dẫn lý do không có trong lời em → 1", () => {
    const said = "I prefer going out because I can meet my friends";
    expect(scoreAnswer(reasonQ, said, j({ gives_reason: true, evidence: "because I can meet my friends" }))).toEqual({ score: 2, rule: "R5" });
    expect(scoreAnswer(reasonQ, said, j({ gives_reason: false }))).toEqual({ score: 1, rule: "R4" });
    expect(scoreAnswer(reasonQ, said, j({ gives_reason: true, evidence: "because it is fun and relaxing" }))).toEqual({ score: 1, rule: "R4" });
  });

  it("trích dẫn so khớp không phân biệt hoa thường, dấu câu", () => {
    expect(quoteFound("Because I can, meet my friends!", "i prefer going out because i can meet my friends")).toBe(true);
    expect(quoteFound("", "anything")).toBe(false);
  });

  it("điểm thầy cô luôn thay điểm AI", () => {
    const s = studentMock({ invited: true, completedAt: null, answeredQids: ["q01", "q02"], grades: [{ question_id: "q01", score: 1 }], aiGrades: [{ question_id: "q01", score: 2 }, { question_id: "q02", score: 0 }], reviewDone: false });
    expect(s.scores).toMatchObject({ q01: 1, q02: 0 });
    expect(s.source).toMatchObject({ q01: "teacher", q02: "ai" });
    expect(s.byTeacher).toBe(1);
  });
});
