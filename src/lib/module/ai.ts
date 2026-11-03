import "server-only";
import { mockAi } from "@/lib/usage";
import { callJson } from "./openai";
import { ASSESS_JSON_SCHEMA, assessOutputSchema, buildAssessMessages, mockAssessment, verifyAssessment, type AssessContext, type VerifiedAssessment } from "./assessCore";
import { buildRoleplayMessages, fallbackLine, replySchema, REPLY_JSON_SCHEMA, verifyReply, type Turn } from "./roleplayCore";
import type { ModuleContent, ModuleRoleplay } from "./schema";

/** Gọi AI ở máy chủ. Không gửi tên, email hay định danh nào của học sinh; chỉ câu hỏi, nội dung bài và lời nói. */

export type AssessResult = { ok: true; model: string; mock: boolean; assessment: VerifiedAssessment } | { ok: false; model: string; reason: string };

export async function assessAnswer(ctx: AssessContext, transcript: string): Promise<AssessResult> {
  if (mockAi()) return { ok: true, model: "mock", mock: true, assessment: verifyAssessment(mockAssessment(transcript), transcript) };
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_FEEDBACK_MODEL;
  if (!apiKey || !model) return { ok: false, model: model || "unset", reason: "not_configured" };
  const r = await callJson({ apiKey, model, name: "module_assessment", messages: buildAssessMessages(ctx, transcript), jsonSchema: ASSESS_JSON_SCHEMA, parse: assessOutputSchema });
  if (!r.ok) return { ok: false, model, reason: r.reason };
  return { ok: true, model, mock: false, assessment: verifyAssessment(r.output, transcript) };
}

/** Phạm vi bài học gửi kèm cho AI: từ vựng và tên cấu trúc ngữ pháp đã kiểm tra. */
export const unitScope = (m: ModuleContent) => ({ unitWords: m.vocab.map((v) => v.en), unitGrammar: m.grammar.map((g) => g.name) });

/**
 * Lời đáp của bạn đóng vai sau lượt nói thứ k của học sinh. AI lỗi, chưa cấu hình, hết lượt (allowAi = false) hoặc trả lời
 * không hợp lệ thì dùng câu dự phòng viết sẵn cùng vị trí.
 */
export async function roleplayReply(r: ModuleRoleplay, grade: number, m: ModuleContent, history: Turn[], allowAi: boolean): Promise<{ text: string; source: "ai" | "fallback" }> {
  const k = history.filter((t) => t.role === "student").length;
  const fallback = { text: fallbackLine(r, k), source: "fallback" as const };
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_FEEDBACK_MODEL;
  if (!allowAi || mockAi() || !apiKey || !model) return fallback;
  const res = await callJson({
    apiKey,
    model,
    name: "roleplay_reply",
    messages: buildRoleplayMessages(r, grade, m.vocab.map((v) => v.en), history),
    jsonSchema: REPLY_JSON_SCHEMA,
    parse: replySchema,
    timeoutMs: 20_000,
    maxTokens: 1500,
  });
  if (!res.ok) {
    console.error("roleplay reply failed", { model, reason: res.reason });
    return fallback;
  }
  const text = verifyReply(res.output.reply);
  return text ? { text, source: "ai" } : fallback;
}
