import { z } from "zod";

/**
 * Cấu trúc nội dung của MỘT Unit (file content/grade-<khối>/unit-<số>.json).
 * Chỉ import "zod" để script Node (seed/kiểm tra) dùng lại được trực tiếp, không cần alias "@/".
 *
 * Bản quyền: chỉ lấy chủ đề, từ vựng, mẫu ngữ pháp từ SGK; mọi câu hỏi, khung câu, ví dụ đều tự viết.
 */

const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}\\d{2}$`), `id phải có dạng ${prefix}01`);
const text = (max: number) => z.string().trim().min(1).max(max);
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const vocabSchema = z.object({
  id: id("v"),
  en: text(40),
  vi: text(60),
  example: text(140),
});

export const frameSchema = z.object({
  id: id("f"),
  /** Có ít nhất một chỗ trống "___" để học sinh tự điền ý của mình. */
  text: text(120).refine((s) => s.includes("___"), "Khung câu cần có chỗ trống ___"),
  vi: text(140),
  grammarNote: text(160),
  examples: z.array(text(160)).min(1).max(3),
});

export const QUESTION_KINDS = ["personal", "reason", "opinion", "situation"] as const;

export const questionSchema = z.object({
  id: id("q"),
  text: text(160).refine((s) => /[?.]$/.test(s), "Câu hỏi kết thúc bằng ? hoặc ."),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  kind: z.enum(QUESTION_KINDS),
  /** Gợi ý mức 2: từ khóa tiếng Anh. */
  keywords: z.array(text(40)).min(2).max(5),
  /** Gợi ý mức 3: khung câu (id trong frames). */
  frameId: id("f"),
  /** Gợi ý mức 1: hướng nghĩ bằng tiếng Việt, không nói sẵn đáp án. */
  hintDirectionVi: text(160),
  /** Gợi ý mức 4: câu trả lời ví dụ ngắn, đúng trình độ. */
  exampleAnswer: text(240).refine((s) => wordCount(s) <= 35, "Câu ví dụ tối đa 35 từ"),
  /** Câu hỏi có đòi hỏi nêu lý do không (dùng cho số đo "có lý do"). */
  expectsReason: z.boolean(),
});

export const unitSchema = z
  .object({
    grade: z.number().int().min(6).max(12),
    unit: z.number().int().min(1).max(20),
    title: text(80),
    titleVi: text(80),
    topic: text(240),
    source: text(120),
    vocab: z.array(vocabSchema).min(8).max(16),
    frames: z.array(frameSchema).min(4).max(8),
    questions: z.array(questionSchema).min(12).max(20),
  })
  .superRefine((u, ctx) => {
    const dup = (arr: { id: string }[], path: string) => {
      const seen = new Set<string>();
      for (const x of arr) {
        if (seen.has(x.id)) ctx.addIssue({ code: "custom", path: [path], message: `Trùng id ${x.id}` });
        seen.add(x.id);
      }
    };
    dup(u.vocab, "vocab");
    dup(u.frames, "frames");
    dup(u.questions, "questions");

    const frameIds = new Set(u.frames.map((f) => f.id));
    u.questions.forEach((q, i) => {
      if (!frameIds.has(q.frameId))
        ctx.addIssue({ code: "custom", path: ["questions", i, "frameId"], message: `${q.id}: không có khung câu ${q.frameId}` });
      if (q.kind === "reason" && !q.expectsReason)
        ctx.addIssue({ code: "custom", path: ["questions", i], message: `${q.id}: câu hỏi lý do phải có expectsReason = true` });
    });

    // Mỗi Unit cần đủ ba mức độ khó để chọn câu tăng dần.
    for (const d of [1, 2, 3] as const) {
      if (!u.questions.some((q) => q.difficulty === d))
        ctx.addIssue({ code: "custom", path: ["questions"], message: `Thiếu câu hỏi độ khó ${d}` });
    }
    // Không có hai câu hỏi trùng nội dung.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
    const texts = new Set<string>();
    for (const q of u.questions) {
      const n = norm(q.text);
      if (texts.has(n)) ctx.addIssue({ code: "custom", path: ["questions"], message: `Câu hỏi trùng: ${q.text}` });
      texts.add(n);
    }
  });

export type UnitContent = z.infer<typeof unitSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Frame = z.infer<typeof frameSchema>;
export type Vocab = z.infer<typeof vocabSchema>;
