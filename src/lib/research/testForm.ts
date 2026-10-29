import { z } from "zod";

/**
 * Đề kiểm tra phản xạ nói (quy trình nghiên cứu, mục 3.5): 2 câu làm mẫu + 15 cặp câu song song A/B.
 * Chỉ import "zod" để script Node (nạp đề, tạo giọng đọc) dùng lại trực tiếp.
 */

const question = z
  .string()
  .trim()
  .min(8)
  .max(160)
  .refine((s) => /[?.]$/.test(s), "Câu hỏi kết thúc bằng ? hoặc .");
const words = (s: string) => s.trim().split(/\s+/).length;

export const TEST_KINDS = ["personal", "reason", "situation"] as const;
/** Số câu mỗi dạng trong một đề (mục 3.5). */
export const KIND_COUNTS = { personal: 6, reason: 6, situation: 3 } as const;

export const testFormSchema = z
  .object({
    grade: z.number().int().min(6).max(12),
    units: z.array(z.number().int().min(1).max(20)).min(1),
    note: z.string().optional(),
    warmup: z.array(question).length(2),
    pairs: z
      .array(z.object({ unit: z.number().int(), kind: z.enum(TEST_KINDS), A: question, B: question }))
      .length(15),
  })
  .superRefine((f, ctx) => {
    for (const k of TEST_KINDS) {
      const n = f.pairs.filter((p) => p.kind === k).length;
      if (n !== KIND_COUNTS[k]) ctx.addIssue({ code: "custom", path: ["pairs"], message: `Cần ${KIND_COUNTS[k]} câu dạng ${k}, đang có ${n}` });
    }
    f.pairs.forEach((p, i) => {
      if (!f.units.includes(p.unit)) ctx.addIssue({ code: "custom", path: ["pairs", i], message: `Unit ${p.unit} không thuộc đề` });
      // Đề tương đương: hai câu của một cặp dài gần bằng nhau (lệch tối đa 3 từ).
      if (Math.abs(words(p.A) - words(p.B)) > 3)
        ctx.addIssue({ code: "custom", path: ["pairs", i], message: `Cặp ${i + 1} lệch độ dài quá 3 từ` });
    });
    const all = [...f.warmup, ...f.pairs.flatMap((p) => [p.A, p.B])].map(normalizeQuestion);
    if (new Set(all).size !== all.length) ctx.addIssue({ code: "custom", path: ["pairs"], message: "Có câu bị trùng trong đề" });
  });
export type TestForm = z.infer<typeof testFormSchema>;

export const normalizeQuestion = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Mức giống nhau giữa hai câu (tỉ lệ từ chung, Jaccard). Dùng để chặn câu đề gần trùng câu luyện. */
export function similarity(a: string, b: string): number {
  const x = new Set(normalizeQuestion(a).split(" "));
  const y = new Set(normalizeQuestion(b).split(" "));
  const inter = [...x].filter((w) => y.has(w)).length;
  return inter / (x.size + y.size - inter);
}

/** Đề làm ở lần kiểm tra: thứ tự đề AB → đầu vào A, đầu ra B; BA thì ngược lại. */
export const formFor = (order: "AB" | "BA", phase: "pre" | "post"): "A" | "B" =>
  (order === "AB") === (phase === "pre") ? "A" : "B";
