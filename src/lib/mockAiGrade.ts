/**
 * AI chấm bài thi thử nói từ LỜI MÁY CHÉP (không nghe âm thanh). File thuần, dùng chung cho máy chủ và script.
 *
 * Cơ sở chấm (bản thi-thu-v1, xem docs/thi-thu-cham-ai.md):
 *  - AI KHÔNG cho điểm. AI chỉ trả lời 3 câu hỏi có/không về lời em nói và TRÍCH NGUYÊN VĂN chỗ làm bằng chứng:
 *      answers_question (có trả lời đúng điều câu hỏi hỏi không), only_repeats_question (chỉ nói lại câu hỏi, không trả lời),
 *      gives_reason (có nêu lý do; chỉ xét ở câu cần lý do).
 *  - Điểm do QUY TẮC CỐ ĐỊNH quyết định, theo thứ tự (quy tắc đầu tiên khớp là kết quả):
 *      R0 không có lời → 0 · R1 đọc lại câu hỏi, không trả lời (máy đo HOẶC AI) → 0 · R2 không trả lời đúng câu hỏi → 0 ·
 *      R3 dưới 5 từ → 1 · R4 câu cần lý do mà không có lý do (có trích dẫn kiểm chứng) → 1 · R5 đạt → 2.
 *  - Bằng chứng phải nằm nguyên văn trong lời máy chép; AI nói "có lý do" mà trích không khớp thì coi là KHÔNG có.
 * Thầy cô chấm lại thì điểm thầy cô thay điểm AI (điểm AI vẫn được giữ để đối chiếu).
 */
import { z } from "zod";
import { givesReason, isEcho } from "./module/copyCheck";

export const RUBRIC_VERSION = "thi-thu-v1";

type Q = { text: string; kind: "personal" | "reason" | "situation"; expectsReason: boolean };

export const RULES = {
  R0: { score: 0, vi: "Không có lời (máy không nghe được câu trả lời)" },
  R1: { score: 0, vi: "Chỉ đọc lại câu hỏi, không trả lời" },
  R2: { score: 0, vi: "Không trả lời đúng điều câu hỏi hỏi (lạc đề)" },
  R3: { score: 1, vi: "Trả lời đúng ý nhưng dưới 5 từ (chưa thành câu)" },
  R4: { score: 1, vi: "Trả lời đúng ý nhưng câu cần lý do lại chưa nêu lý do" },
  R5: { score: 2, vi: "Đúng ý, thành câu, có lý do khi câu hỏi cần" },
} as const;
export type RuleId = keyof typeof RULES;

export const judgementSchema = z.object({
  answers_question: z.boolean(),
  only_repeats_question: z.boolean(),
  gives_reason: z.boolean(),
  evidence: z.string().max(300),
  note_vi: z.string().max(300),
});
export type Judgement = z.infer<typeof judgementSchema>;

export const JUDGEMENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answers_question", "only_repeats_question", "gives_reason", "evidence", "note_vi"],
  properties: {
    answers_question: { type: "boolean", description: "Lời em nói có trả lời đúng điều câu hỏi hỏi không (chấp nhận lỗi ngữ pháp, lỗi chép lời nhỏ)." },
    only_repeats_question: { type: "boolean", description: "Em chỉ nói lại (gần như nguyên văn) câu hỏi mà không thêm câu trả lời của mình." },
    gives_reason: { type: "boolean", description: "Em có nêu lý do/giải thích cho ý của mình không." },
    evidence: { type: "string", description: "Trích NGUYÊN VĂN (copy) một đoạn ngắn trong lời em nói làm bằng chứng cho câu trả lời hoặc lý do; rỗng nếu không có." },
    note_vi: { type: "string", description: "Một câu nhận xét ngắn bằng tiếng Việt cho thầy cô, không quá 25 từ." },
  },
} as const;

const FILLER = /^(uh+|um+|er+|erm|ah+|hmm+|mm+)$/i;
export const wordCount = (t: string) => (t.toLowerCase().match(/[a-z']+/g) ?? []).filter((w) => !FILLER.test(w)).length;
const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
export const quoteFound = (quote: string, transcript: string) => norm(quote).length >= 3 && norm(transcript).includes(norm(quote));

export function buildMessages(q: Q, transcript: string) {
  return [
    {
      role: "system" as const,
      content:
        "You check a Vietnamese secondary-school student's spoken English answer in a speaking mock test. You only get the speech-to-text transcript. " +
        "Do NOT give a score. Answer the yes/no fields honestly. Be fair to young learners: grammar mistakes and small transcription errors are fine; " +
        "an answer counts if it responds to what the question asks, even simply. A student who only repeats the question without adding their own answer has NOT answered. " +
        "A reason counts only if the student explains why (because/so/since or an explanation clause), not just restating the answer. " +
        "The evidence field must be copied exactly from the transcript. Write note_vi in Vietnamese for the teacher.",
    },
    {
      role: "user" as const,
      content: `Question (${q.kind}${q.expectsReason ? ", needs a reason" : ""}): ${q.text}\nStudent transcript: """${transcript.slice(0, 1500)}"""`,
    },
  ];
}

/** Điểm từ quy tắc cố định. judgement = null khi không cần AI (R0, R1 do máy đo) hoặc AI lỗi (khi đó trả null). */
export function scoreAnswer(q: Q, transcript: string, j: Judgement | null): { score: 0 | 1 | 2; rule: RuleId } | null {
  const words = wordCount(transcript);
  if (words === 0) return { score: 0, rule: "R0" };
  if (isEcho(transcript, q.text)) return { score: 0, rule: "R1" };
  if (!j) return null;
  if (j.only_repeats_question) return { score: 0, rule: "R1" };
  if (!j.answers_question) return { score: 0, rule: "R2" };
  if (words < 5) return { score: 1, rule: "R3" };
  if (q.expectsReason && !(j.gives_reason && quoteFound(j.evidence, transcript))) return { score: 1, rule: "R4" };
  return { score: 2, rule: "R5" };
}

/** MOCK_AI=1: đoán bằng quy tắc (không gọi dịch vụ), để kiểm thử luồng. */
export function mockJudgement(q: Q, transcript: string): Judgement {
  const reason = givesReason(transcript);
  return { answers_question: wordCount(transcript) > 0, only_repeats_question: false, gives_reason: reason, evidence: reason ? transcript.slice(0, 60) : "", note_vi: "Chấm thử (MOCK_AI)." };
}
