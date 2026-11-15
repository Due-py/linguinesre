import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockAi } from "@/lib/usage";
import { callJson } from "@/lib/module/openai";
import type { MockQuestion } from "@/lib/mockTest";
import { buildMessages, JUDGEMENT_JSON_SCHEMA, judgementSchema, mockJudgement, RUBRIC_VERSION, scoreAnswer, type Judgement } from "@/lib/mockAiGrade";

/**
 * AI chấm một câu thi thử rồi lưu vào mock_test_ai_grades (0019). Chỉ máy chủ ghi (khóa quản trị); giáo viên đọc qua RLS.
 * Lỗi AI → không lưu (thầy cô chấm tay). Không ghi lời học sinh vào nhật ký.
 */
export async function aiGradeAndSave(studentId: string, q: MockQuestion, transcript: string): Promise<void> {
  let j: Judgement | null = null;
  let model = "rules";
  const quick = scoreAnswer(q, transcript, null);
  if (!quick) {
    if (mockAi()) {
      j = mockJudgement(q, transcript);
      model = "mock";
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      model = process.env.OPENAI_FEEDBACK_MODEL ?? "";
      if (!apiKey || !model) return;
      const r = await callJson({ apiKey, model, name: "mock_test_judgement", messages: buildMessages(q, transcript), jsonSchema: JUDGEMENT_JSON_SCHEMA, parse: judgementSchema, maxTokens: 600 });
      if (!r.ok) {
        console.error("thi thử: AI chấm lỗi", { reason: r.reason, question: q.id });
        return;
      }
      j = r.output;
    }
  }
  const result = quick ?? scoreAnswer(q, transcript, j);
  if (!result) return;
  const { error } = await createAdminClient()
    .from("mock_test_ai_grades")
    .upsert(
      {
        student_id: studentId,
        question_id: q.id,
        score: result.score,
        rule: result.rule,
        judgement: j ?? {},
        model,
        rubric_version: RUBRIC_VERSION,
        transcript: transcript.slice(0, 2000),
        graded_at: new Date().toISOString(),
      },
      { onConflict: "student_id,question_id" },
    );
  if (error) console.error("thi thử: lưu điểm AI lỗi", { code: error.code, question: q.id });
}
