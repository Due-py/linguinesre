import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleSchema } from "@/lib/module/schema";
import { buildLesson, speakingReady, type HistoryAttempt, type UnitQuestion } from "@/lib/module/plan";

const m = moduleSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "content/modules/grade-8/unit-07.json"), "utf8")));
const questions: UnitQuestion[] = Array.from({ length: 15 }, (_, i) => ({
  id: `id${i}`,
  key: `q${String(i + 1).padStart(2, "0")}`,
  text: `Question ${i + 1}?`,
  difficulty: (i % 3) + 1,
  keywords: ["a", "b"],
  expectsReason: false,
  hints: [],
}));
const speak = (k: number, thinkMs: number, hintLevel = 0): HistoryAttempt => ({
  day: 4,
  t: "speak",
  ref: `x${k}`,
  set: null,
  area: null,
  attemptNo: 1,
  correct: null,
  thinkMs,
  hintLevel,
  inTarget: null,
  targetMs: null,
  errorTags: [],
  at: `2026-11-0${(k % 8) + 1}T10:00:00Z`,
});
const levels = (day: number, history: HistoryAttempt[]) => {
  const l = buildLesson({ day, module: m, unitQuestions: questions, history, seed: "s", now: Date.parse("2026-11-10T00:00:00Z") });
  return l.steps.filter((s) => s.t === "speak" && s.source === "unit").map((s) => questions.find((q) => q.key === s.ref)!.difficulty);
};

describe("độ khó câu hỏi theo số đo thật", () => {
  it("chưa đủ lượt nói thì chưa biết, không đưa câu khó nhất", () => {
    expect(speakingReady([speak(1, 2000)])).toEqual({ ready: false, known: false });
    expect(levels(6, [])).not.toContain(3);
    expect(levels(7, [])).not.toContain(3);
  });
  it("nói chậm hoặc cần nhiều gợi ý thì giữ ở độ khó 2", () => {
    const slow = [1, 2, 3, 4, 5].map((k) => speak(k, 9000));
    const hinted = [1, 2, 3, 4, 5].map((k) => speak(k, 2000, 4));
    expect(speakingReady(slow).ready).toBe(false);
    expect(speakingReady(hinted).ready).toBe(false);
    expect(Math.max(...levels(6, slow))).toBe(2);
  });
  it("trả lời nhanh, ít gợi ý thì có câu khó, tăng dần từ dễ", () => {
    const good = [1, 2, 3, 4, 5].map((k) => speak(k, 2500, 1));
    expect(speakingReady(good)).toEqual({ ready: true, known: true });
    const d6 = levels(6, good);
    expect(d6).toContain(3);
    expect(d6).toEqual([...d6].sort());
    expect(levels(7, good)).toContain(3);
  });
});
