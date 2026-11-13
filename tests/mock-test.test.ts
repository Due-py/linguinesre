import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { allMockTests, checkMockAnswer, mockTestFor } from "@/lib/mockTest";

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z']+/g) ?? []);
const similarity = (a: string, b: string) => {
  const x = words(a);
  const y = words(b);
  return [...x].filter((w) => y.has(w)).length / Math.max(x.size, y.size);
};

describe("bài thi thử nói", () => {
  it("đủ 7 khối, mỗi khối 10 câu: 4 bản thân, 4 cần lý do, 2 tình huống, câu không trùng", () => {
    expect(allMockTests().map((t) => t.grade).sort((a, b) => a - b)).toEqual([6, 7, 8, 9, 10, 11, 12]);
    for (const t of allMockTests()) {
      expect(t.questions).toHaveLength(10);
      expect(t.questions.filter((q) => q.kind === "personal")).toHaveLength(4);
      expect(t.questions.filter((q) => q.kind === "reason")).toHaveLength(4);
      expect(t.questions.filter((q) => q.kind === "situation")).toHaveLength(2);
      expect(new Set(t.questions.map((q) => q.id)).size).toBe(10);
      expect(new Set(t.questions.map((q) => q.text)).size).toBe(10);
      for (const q of t.questions) expect(q.expectsReason).toBe(q.kind === "reason");
    }
  });

  it("không giống câu nào trong đề kiểm tra nói A/B của nghiên cứu", () => {
    const research = JSON.parse(readFileSync(join(process.cwd(), "content/tests/grade-8.json"), "utf8"));
    const items: string[] = [...research.warmup.map((w: { text?: string } | string) => (typeof w === "string" ? w : w.text ?? "")), ...research.pairs.flatMap((p: { A: string; B: string }) => [p.A, p.B])];
    for (const t of allMockTests())
      for (const q of t.questions)
        for (const r of items) expect(similarity(q.text, r), `lớp ${t.grade}: "${q.text}" giống "${r}"`).toBeLessThan(0.6);
  });

  it("chấm nội dung: thành câu, có lý do, đọc lại câu hỏi không được tính", () => {
    const t = mockTestFor(8)!;
    const reasonQ = t.questions.find((q) => q.expectsReason)!;
    const personalQ = t.questions.find((q) => q.kind === "personal")!;
    expect(checkMockAnswer("I prefer going out because I can meet my friends", reasonQ)).toMatchObject({ sentence: true, reason: true, ok: true });
    expect(checkMockAnswer("I like going out with my friends a lot", reasonQ)).toMatchObject({ sentence: true, reason: false, ok: false });
    expect(checkMockAnswer("um football", personalQ)).toMatchObject({ words: 1, sentence: false, ok: false });
    expect(checkMockAnswer(reasonQ.text, reasonQ)).toMatchObject({ echo: true, ok: false });
    expect(checkMockAnswer("I usually play badminton with my dad on Sunday afternoon", personalQ)).toMatchObject({ ok: true, reason: null });
  });
});
