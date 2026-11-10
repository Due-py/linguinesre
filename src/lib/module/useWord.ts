/**
 * Bước "Từ vựng thành câu": học sinh TỰ ĐẶT một câu có dùng cụm từ (collocation), không phải đọc lại cụm từ.
 * Cụm từ có chỗ trống ("help somebody stay in shape", "aim to do something", "brush your teeth", "take responsibility for",
 * "in his/her youth", "express yourself"): chỗ trống phải được thay bằng người, việc, của ai cụ thể. Kiểm tra bằng quy tắc
 * (không AI) để giải thích được. File thuần để test.
 */
import { stem } from "../feedback/measures";

const tokens = (s: string): string[] => s.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z']+/g) ?? [];

export type Gap = "person" | "thing" | "action" | "object";
export type Part =
  | { kind: "word"; w: string }
  | { kind: "gap"; who: Gap; raw: string }
  | { kind: "poss"; raw: string }
  | { kind: "self"; raw: string }
  | { kind: "alt"; opts: string[]; raw: string };

const PERSON = new Set(["somebody", "someone", "sb", "smb"]);
const THING = new Set(["something", "sth"]);
const POSS = new Set(["your", "one's", "ones", "someone's", "somebody's"]);
const SELF = new Set(["yourself", "oneself", "yourselves"]);
const POSSESSIVES = new Set(["my", "your", "his", "her", "our", "their", "its"]);
const REFLEXIVES = new Set(["myself", "yourself", "himself", "herself", "ourselves", "yourselves", "themselves", "itself", "oneself"]);
/** Giới từ cần có người / vật đi sau ("take responsibility for", "raise awareness of"). Không gồm tiểu từ của cụm động từ (up, off, out...). */
const NEEDS_OBJECT = new Set(["to", "of", "for", "with", "in", "on", "at", "about", "from", "into", "by", "towards", "between", "among"]);

/** Tách cụm từ thành từ cố định và chỗ trống. "do something" / "doing something" là một chỗ trống "việc". */
export function parsePhrase(phrase: string): Part[] {
  const out: Part[] = [];
  const words = phrase.trim().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    if (raw.includes("/")) {
      const opts = raw.split("/").flatMap(tokens);
      if (opts.length) out.push({ kind: "alt", opts, raw: raw.replace(/[^\w/'’-]/g, "") });
      continue;
    }
    const ts = tokens(raw);
    for (let j = 0; j < ts.length; j++) {
      const w = ts[j];
      const next = ts[j + 1] ?? tokens(words[i + 1] ?? "")[0] ?? "";
      if ((w === "do" || w === "doing") && THING.has(next)) {
        out.push({ kind: "gap", who: "action", raw: `${w} ${next}` });
        if (j + 1 < ts.length) j++;
        else i++;
      } else if (PERSON.has(w)) out.push({ kind: "gap", who: "person", raw: w });
      else if (THING.has(w)) out.push({ kind: "gap", who: "thing", raw: w });
      else if (POSS.has(w)) out.push({ kind: "poss", raw: w });
      else if (SELF.has(w)) out.push({ kind: "self", raw: w });
      else out.push({ kind: "word", w });
    }
  }
  // Cụm kết thúc bằng giới từ: phải nói người / vật đi sau ("take responsibility for [ai, cái gì]").
  const last = out.at(-1);
  if (last?.kind === "word" && NEEDS_OBJECT.has(last.w) && out.length > 1) out.push({ kind: "gap", who: "object", raw: "…" });
  return out;
}

/** Tìm cụm từ trong lời nói. Chỗ trống khớp 1–5 từ; "your" khớp my/his/her...; từ cố định so theo gốc (help/helps/helped). */
function find(t: string[], parts: Part[]): { filled: string[] } | null {
  const go = (i: number, k: number, filled: string[]): string[] | null => {
    if (k === parts.length) return filled;
    if (i > t.length) return null;
    const p = parts[k];
    const w = t[i];
    if (p.kind === "word") return w !== undefined && stem(w) === stem(p.w) ? go(i + 1, k + 1, filled) : null;
    if (p.kind === "poss") return w !== undefined && (POSSESSIVES.has(w) || /'s$/.test(w)) ? go(i + 1, k + 1, filled) : null;
    if (p.kind === "self") return w !== undefined && REFLEXIVES.has(w) ? go(i + 1, k + 1, filled) : null;
    if (p.kind === "alt") return w !== undefined && p.opts.some((o) => stem(o) === stem(w)) ? go(i + 1, k + 1, filled) : null;
    for (let n = 1; n <= 5 && i + n <= t.length; n++) {
      const r = go(i + n, k + 1, [...filled, t.slice(i, i + n).join(" ")]);
      if (r) return r;
    }
    return null;
  };
  for (let s = 0; s < t.length; s++) {
    const r = go(s, 0, []);
    if (r) return { filled: r };
  }
  return null;
}

export type UseWordResult = {
  /** Có dùng cụm từ (chỗ trống đã được điền). */
  used: boolean;
  /** Em đọc nguyên chữ "somebody/something" thay vì người, việc cụ thể. */
  placeholderLeft: boolean;
  /** Câu quá ngắn: gần như chỉ đọc lại cụm từ. */
  tooShort: boolean;
  /** Đọc lại câu ví dụ. */
  copiedExample: boolean;
  ok: boolean;
};

/** Đủ thành câu: thêm ít nhất 2 từ ngoài các từ cố định của cụm, và tối thiểu 4 từ. */
export function checkUseWord(transcript: string, phrase: string, example: string | null): UseWordResult {
  const t = tokens(transcript);
  const parts = parsePhrase(phrase);
  const fixed = parts.filter((p) => p.kind === "word").length;
  const hit = find(t, parts);
  // Đọc nguyên chữ chỗ trống của cụm ("somebody", "something") thay vì người, việc cụ thể.
  const holes = new Set<string>(tokens(phrase).filter((w) => PERSON.has(w) || THING.has(w)));
  const placeholderLeft = !!hit && t.some((w) => holes.has(w));
  const tooShort = t.length < Math.max(4, fixed + 2);
  const ex = example ? tokens(example) : [];
  const same = ex.length ? ex.filter((w) => t.includes(w)).length / ex.length : 0;
  const copiedExample = ex.length > 0 && same >= 0.9 && Math.abs(t.length - ex.length) <= 2;
  const used = !!hit;
  return { used, placeholderLeft, tooShort, copiedExample, ok: used && !placeholderLeft && !tooShort && !copiedExample };
}

/** Cách hiện một phần của cụm trên màn hình: từ cố định giữ nguyên, chỗ trống thành ô gợi ý tiếng Việt. */
export function partLabel(p: Part): { text: string; gap: boolean; raw: string } {
  switch (p.kind) {
    case "word":
      return { text: p.w, gap: false, raw: p.w };
    case "alt":
      return { text: p.opts.join(" / "), gap: false, raw: p.raw };
    case "poss":
      return { text: "của ai", gap: true, raw: p.raw };
    case "self":
      return { text: "bản thân (myself, herself…)", gap: true, raw: p.raw };
    case "gap":
      return { text: { person: "ai đó", thing: "cái gì đó", action: "làm việc gì đó", object: "ai / cái gì" }[p.who], gap: true, raw: p.raw };
  }
}

/** Điền chỗ trống bằng ví dụ cụ thể (my friend, my homework, study, my). Dùng cho câu thử tự động. */
export function fillPhrase(phrase: string): string {
  return parsePhrase(phrase)
    .map((p) => {
      switch (p.kind) {
        case "word":
          return p.w;
        case "alt":
          return p.opts[0];
        case "poss":
          return "my";
        case "self":
          return "myself";
        case "gap":
          return { person: "my friend", thing: "my homework", action: p.raw.startsWith("doing") ? "studying" : "study", object: "my classmates" }[p.who];
      }
    })
    .join(" ");
}
