import "server-only";
import { callFeedbackModel, verifyFeedback, type AiOutput, type PromptQuestion, type VerifiedFeedback } from "./core";

/** Nội dung cột payload của answer_feedback (status = ok). Tăng version khi đổi hình dạng. */
export type FeedbackPayload = { version: 1; mock: boolean; feedback: VerifiedFeedback };

export type GenerateResult = { ok: true; model: string; payload: FeedbackPayload } | { ok: false; model: string; reason: string };

/** Bản giả cho MOCK_AI=1: cố định, không gọi OpenAI, vẫn đi qua đúng bước kiểm chứng như dữ liệu thật. */
function mockOutput(transcript: string): AiOutput {
  const firstWords = transcript.trim().split(/\s+/).slice(0, 3).join(" ");
  return {
    content: { status: "assessed", comment_vi: "Dữ liệu mô phỏng: bạn trả lời đúng câu hỏi." },
    grammar: {
      status: "assessed",
      issues: [
        { quote: firstWords, fix: `${firstWords} (mô phỏng)`, explanation_vi: "Dữ liệu mô phỏng để kiểm tra giao diện, không phải lỗi thật." },
        { quote: "câu không có trong bài nói", fix: "x", explanation_vi: "Lỗi bịa: phải bị máy chủ bỏ đi." },
      ],
    },
    vocabulary: { status: "assessed", comment_vi: "Dữ liệu mô phỏng: dùng từ phù hợp." },
    completeness: { status: "assessed", level: "developed", comment_vi: "Dữ liệu mô phỏng: có ý chính và lý do." },
    improved_sentence: "I usually play badminton with my friends after school because it is fun.",
  };
}

export async function generateFeedback(question: PromptQuestion, transcript: string, mock: boolean): Promise<GenerateResult> {
  if (mock) return { ok: true, model: "mock", payload: { version: 1, mock: true, feedback: verifyFeedback(mockOutput(transcript), transcript) } };

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_FEEDBACK_MODEL;
  if (!apiKey || !model) return { ok: false, model: model || "unset", reason: "not_configured" };

  const r = await callFeedbackModel({ apiKey, model, question, transcript });
  if (!r.ok) return { ok: false, model, reason: r.reason };
  return { ok: true, model, payload: { version: 1, mock: false, feedback: verifyFeedback(r.output, transcript) } };
}
