/**
 * Mini-game ngắn (1–3 phút), nội dung lấy từ CHÍNH Unit đã kiểm tra (modules.content): không có câu hỏi bịa thêm.
 * Máy chủ chọn câu (items, không kèm đáp án) và chấm từng câu theo nội dung gốc. Đây là hoạt động ôn tập tùy chọn,
 * không thay cho phần nói. File thuần để test.
 */
import type { ModuleContent } from "../module/schema";
import type { GameKey } from "./world";

export type GameItem = { ref: string; prompt: string; promptLang: "en" | "vi"; options: string[]; optionsLang: "en" | "vi" };
export type GameReveal = { correct: boolean; answer: string | string[]; explainVi: string };

export const ITEM_COUNT: Record<GameKey, number> = { vocab_match: 6, sentence_builder: 3, grammar_fix: 6, quick_think: 5, conversation_choice: 5 };
/** Quick Think: thời gian gợi ý mỗi câu (chỉ để chơi, không tính vào kết quả học hay nghiên cứu). */
export const QUICK_THINK_MS = 15_000;

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(xs: readonly T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** Xáo khác thứ tự gốc khi có thể (xếp câu mà mảnh đã đúng sẵn thì không còn là trò chơi). */
function shuffleChanged(xs: readonly string[], r: () => number): string[] {
  for (let k = 0; k < 6; k++) {
    const s = shuffle(xs, r);
    if (s.some((x, i) => x !== xs[i])) return s;
  }
  return [...xs].reverse();
}

/** Chọn câu cho một lượt chơi. seed khác nhau thì câu và thứ tự khác nhau (chơi lại không y hệt). */
export function buildItems(game: GameKey, m: ModuleContent, seed: string): GameItem[] {
  const r = rng(`${game}|${seed}`);
  const n = ITEM_COUNT[game];
  switch (game) {
    case "vocab_match": {
      const words = shuffle(m.vocab, r).slice(0, n);
      const meanings = shuffle(words.map((w) => w.vi), r);
      return words.map((w) => ({ ref: w.id, prompt: w.en, promptLang: "en", options: meanings, optionsLang: "vi" }));
    }
    case "sentence_builder":
      return shuffle(m.build, r)
        .slice(0, n)
        .map((b) => ({ ref: b.id, prompt: b.vi, promptLang: "vi", options: shuffleChanged(b.chunks, r), optionsLang: "en" }));
    case "grammar_fix": {
      const pool: { ref: string; sentence: string }[] = [];
      for (const g of m.grammar) {
        g.wrong.forEach((w, i) => {
          pool.push({ ref: `${g.id}:w:${i}`, sentence: w.sentence });
          pool.push({ ref: `${g.id}:f:${i}`, sentence: w.fix });
        });
        g.examples.forEach((e, i) => pool.push({ ref: `${g.id}:e:${i}`, sentence: e }));
      }
      // Cân bằng câu đúng và câu sai, để chọn bừa một phía không thắng được.
      const wrong = shuffle(pool.filter((p) => p.ref.includes(":w:")), r);
      const right = shuffle(pool.filter((p) => !p.ref.includes(":w:")), r);
      const half = Math.min(Math.ceil(n / 2), wrong.length);
      const picked = shuffle([...wrong.slice(0, half), ...right.slice(0, n - half)], r);
      return picked.map((p) => ({ ref: p.ref, prompt: p.sentence, promptLang: "en", options: ["Đúng", "Sai"], optionsLang: "vi" }));
    }
    case "quick_think": {
      const items: GameItem[] = [];
      for (const v of shuffle(m.variations, r).slice(0, n)) {
        const qi = Math.floor(r() * v.questions.length);
        const others = shuffle(
          m.variations.filter((x) => x.id !== v.id).map((x) => x.ideaVi),
          r,
        ).slice(0, 2);
        items.push({ ref: `${v.id}:${qi}`, prompt: v.questions[qi], promptLang: "en", options: shuffle([v.ideaVi, ...others], r), optionsLang: "vi" });
      }
      return items;
    }
    case "conversation_choice": {
      return shuffle(m.expressions, r)
        .slice(0, n)
        .map((e) => {
          const others = shuffle(
            m.expressions.filter((x) => x.id !== e.id && x.useVi !== e.useVi).map((x) => x.en),
            r,
          ).slice(0, 2);
          return { ref: e.id, prompt: e.useVi, promptLang: "vi", options: shuffle([e.en, ...others], r), optionsLang: "en" };
        });
    }
  }
}

/** Chấm một câu theo nội dung gốc. null: câu không có trong Unit (dữ liệu sai). answer là chuỗi đã chọn, hoặc thứ tự mảnh. */
export function checkItem(game: GameKey, m: ModuleContent, item: GameItem, answer: string | string[] | null): GameReveal | null {
  const pick = typeof answer === "string" ? answer : null;
  switch (game) {
    case "vocab_match": {
      const v = m.vocab.find((x) => x.id === item.ref);
      if (!v) return null;
      return { correct: pick === v.vi, answer: v.vi, explainVi: `${v.en} ${v.ipa} (${v.pos}): ${v.vi}. Ví dụ: ${v.example}` };
    }
    case "sentence_builder": {
      const b = m.build.find((x) => x.id === item.ref);
      if (!b) return null;
      const ok = Array.isArray(answer) && answer.length === b.chunks.length && answer.every((c, i) => c === b.chunks[i]);
      return { correct: ok, answer: b.chunks, explainVi: `Câu đúng: ${b.chunks.join(" ")}` };
    }
    case "grammar_fix": {
      const [gid, t, i] = item.ref.split(":");
      const g = m.grammar.find((x) => x.id === gid);
      if (!g) return null;
      const idx = Number(i);
      if (t === "w") {
        const w = g.wrong[idx];
        if (!w) return null;
        return { correct: pick === "Sai", answer: "Sai", explainVi: `Sửa: ${w.fix}. ${w.whyVi}` };
      }
      const s = t === "f" ? g.wrong[idx]?.fix : g.examples[idx];
      if (!s) return null;
      return { correct: pick === "Đúng", answer: "Đúng", explainVi: `Câu đúng (${g.nameVi}).` };
    }
    case "quick_think": {
      const [vid] = item.ref.split(":");
      const v = m.variations.find((x) => x.id === vid);
      if (!v) return null;
      return { correct: pick === v.ideaVi, answer: v.ideaVi, explainVi: `Câu này hỏi: ${v.ideaVi}. Câu trả lời mẫu: ${v.exampleAnswer}` };
    }
    case "conversation_choice": {
      const e = m.expressions.find((x) => x.id === item.ref);
      if (!e) return null;
      return { correct: pick === e.en, answer: e.en, explainVi: `${e.en}: ${e.vi}. Ví dụ: ${e.example}` };
    }
  }
}
