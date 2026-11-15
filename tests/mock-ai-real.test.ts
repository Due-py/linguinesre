/**
 * Thử AI chấm thi thử với MÔ HÌNH THẬT (tốn rất ít: 6 lần gọi). Bỏ qua mặc định.
 * Chạy: REAL_AI=1 npx vitest run tests/mock-ai-real.test.ts
 * Câu trả lời mẫu do nhóm viết (không phải lời học sinh thật), mỗi câu ứng với một quy tắc.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mockTestFor } from "@/lib/mockTest";
import { callJson } from "@/lib/module/openai";
import { buildMessages, JUDGEMENT_JSON_SCHEMA, judgementSchema, scoreAnswer } from "@/lib/mockAiGrade";

const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const t = mockTestFor(8)!;
const reasonQ = t.questions.find((q) => q.expectsReason)!;
const personalQ = t.questions.find((q) => q.kind === "personal")!;

const CASES = [
  { q: personalQ, said: "I usually go to the park with my family and play badminton", want: 2 },
  { q: personalQ, said: "Badminton", want: 1 },
  { q: personalQ, said: "My favourite subject is maths and I like my teacher", want: 0 },
  { q: reasonQ, said: "I prefer going out at weekends because I can meet my friends and play sports", want: 2 },
  { q: reasonQ, said: "I prefer going out at weekends with my friends", want: 1 },
  { q: reasonQ, said: `${reasonQ.text} um`, want: 0 },
];

describe.skipIf(!process.env.REAL_AI)("AI chấm thi thử (mô hình thật)", () => {
  it.each(CASES)("$said → $want", async ({ q, said, want }) => {
    const quick = scoreAnswer(q, said, null);
    if (quick) return expect(quick.score).toBe(want);
    const r = await callJson({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_FEEDBACK_MODEL, name: "mock_test_judgement", messages: buildMessages(q, said), jsonSchema: JUDGEMENT_JSON_SCHEMA, parse: judgementSchema, maxTokens: 600 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = scoreAnswer(q, said, r.output);
    console.log(want, s, r.output.note_vi);
    expect(s?.score).toBe(want);
  }, 60_000);
});
