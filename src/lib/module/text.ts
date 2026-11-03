import type { ModuleContent } from "./schema";

/**
 * Chữ cần đọc to cho một mã nội dung của module (giọng đọc mẫu). Trả null nếu mã không có.
 *  v01 từ · v01.ex câu ví dụ · e01 câu ví dụ của cụm câu · p01.w các từ luyện phát âm · p01.s câu luyện phát âm
 *  w01.2 câu hỏi thứ 2 của nhóm Question Variation · i01 câu nói độc lập · r01.open lời mở đầu roleplay
 *  b01 câu đã xếp đúng · x01 câu mở rộng đầy đủ · x01.base câu ngắn ban đầu
 */
export function speakable(m: ModuleContent, key: string): string | null {
  const [id, part] = key.split(".");
  const find = <T extends { id: string }>(xs: T[]) => xs.find((x) => x.id === id);
  switch (id[0]) {
    case "v": {
      const v = find(m.vocab);
      return v ? (part === "ex" ? v.example : v.en) : null;
    }
    case "e":
      return find(m.expressions)?.example ?? null;
    case "p": {
      const p = find(m.pronunciation);
      if (!p) return null;
      return part === "s" ? p.sentence : p.words.join(", ");
    }
    case "w": {
      const w = find(m.variations);
      const i = Number(part) - 1;
      return w && Number.isInteger(i) ? (w.questions[i] ?? null) : null;
    }
    case "i":
      return find(m.independent)?.text ?? null;
    case "r":
      return part === "open" ? (find(m.roleplays)?.opener ?? null) : null;
    case "b": {
      const b = find(m.build);
      return b ? b.chunks.join(" ") : null;
    }
    case "x": {
      const x = find(m.expand);
      return x ? (part === "base" ? x.base : x.full) : null;
    }
    default:
      return null;
  }
}
