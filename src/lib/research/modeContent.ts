import { z } from "zod";

/**
 * Nội dung riêng của hai chế độ luyện trong nghiên cứu (content/research/grade-<khối>-modes.json):
 *  - reading: bài hội thoại / đoạn văn để ĐỌC TO (chế độ B).
 *  - roleplays: hội thoại ngắn nhiều lượt (Micro-Roleplay, chế độ A, tầng L3).
 *  - talks: đề nói một đoạn ngắn (chế độ A, tầng L3).
 * Từ vựng, khung câu và câu hỏi của chế độ A lấy từ Unit luyện tập (content/grade-<khối>/unit-<số>.json).
 * Mọi câu chữ do nhóm tự viết theo chủ đề và từ vựng SGK, không chép nguyên văn SGK. Chỉ import "zod".
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}\\d$`), `id phải có dạng ${prefix}1`);

export const readingSchema = z.object({
  id: id("r"),
  kind: z.enum(["dialogue", "passage"]),
  title: text(80),
  /** Hội thoại: mỗi dòng có người nói. Đoạn văn: speaker = null, mỗi dòng là một câu hoặc một đoạn nhỏ. */
  lines: z.array(z.object({ speaker: text(20).nullable(), text: text(240) })).min(3).max(16),
});

export const roleplayTurnSchema = z.object({
  /** Câu bạn nói chuyện (máy đọc to). */
  prompt: text(160).refine((s) => /[?.!]$/.test(s), "Kết thúc bằng ? . hoặc !"),
  hintVi: text(160),
  keywords: z.array(text(40)).min(2).max(4),
  example: text(200),
});

export const roleplaySchema = z.object({
  id: id("p"),
  titleVi: text(80),
  /** Tình huống bằng tiếng Việt: em là ai, đang nói với ai, để làm gì. */
  situationVi: text(240),
  partner: text(30),
  turns: z.array(roleplayTurnSchema).min(3).max(5),
});

export const talkSchema = z.object({
  id: id("t"),
  prompt: text(160),
  promptVi: text(200),
  /** 3 ý gợi ý để nói thành đoạn (tiếng Anh, ngắn). */
  points: z.array(text(80)).length(3),
  example: text(400),
});

export const modeUnitSchema = z.object({
  unit: z.number().int().min(1).max(20),
  reading: z.array(readingSchema).min(3).max(6),
  roleplays: z.array(roleplaySchema).min(2).max(5),
  talks: z.array(talkSchema).min(2).max(5),
});

export const modeContentSchema = z
  .object({
    grade: z.number().int().min(6).max(12),
    units: z.array(modeUnitSchema).min(1),
  })
  .superRefine((c, ctx) => {
    const seen = new Set<number>();
    for (const u of c.units) {
      if (seen.has(u.unit)) ctx.addIssue({ code: "custom", path: ["units"], message: `Trùng Unit ${u.unit}` });
      seen.add(u.unit);
      for (const [name, arr] of [
        ["reading", u.reading],
        ["roleplays", u.roleplays],
        ["talks", u.talks],
      ] as const) {
        const ids = arr.map((x) => x.id);
        if (new Set(ids).size !== ids.length) ctx.addIssue({ code: "custom", path: ["units", u.unit, name], message: `Trùng id trong ${name}` });
      }
    }
  });

export type ModeContent = z.infer<typeof modeContentSchema>;
export type ModeUnit = z.infer<typeof modeUnitSchema>;
export type Reading = z.infer<typeof readingSchema>;
export type Roleplay = z.infer<typeof roleplaySchema>;
export type Talk = z.infer<typeof talkSchema>;

/** Số từ của một bài đọc (để ước lượng thời gian đọc). */
export const readingWords = (r: Reading) => r.lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
