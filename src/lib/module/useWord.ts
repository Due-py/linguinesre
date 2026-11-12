/**
 * Bước "Từ vựng thành câu": học sinh TỰ ĐẶT một câu có dùng cụm từ (collocation), không phải đọc lại cụm từ.
 * Cụm từ có chỗ trống ("help somebody stay in shape", "aim to do something", "brush your teeth", "take responsibility for",
 * "in his/her youth", "express yourself", "prefer A to B"): chỗ trống phải được thay bằng người, việc, của ai cụ thể.
 * Học sinh được đổi dạng từ (improves, improved), chen thêm từ (improve MY physical health), đổi thứ tự
 * (my physical health improved), dùng chính tả Mỹ (color, center), viết liền từ ghép (hardworking, Hanoi).
 * Kiểm tra bằng quy tắc (không AI) để giải thích được. Bộ câu thử: tests/fixtures/use-word/*.json. File thuần để test.
 */
import { stem } from "../feedback/measures";

/** Số 0–20 máy chép lời viết bằng chữ số → chữ ("a 9 to 5 job" ~ "a nine-to-five job"). */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

export const tokens = (s: string): string[] =>
  (
    s
      .replace(/\b(?:[A-Za-z]\.){2,}/g, (m) => m.replace(/\./g, "")) // D.I.Y. → DIY
      .toLowerCase()
      .replace(/[’‘]/g, "'")
      .replace(/\bwon't\b/g, "will not")
      .replace(/\bcan't\b/g, "can not")
      .replace(/\bcannot\b/g, "can not")
      .replace(/n't\b/g, " not")
      .match(/[a-z0-9']+/g) ?? []
  ).map((w) => (/^\d+$/.test(w) && Number(w) <= 20 ? NUMBER_WORDS[Number(w)] : w));

export type Gap = "person" | "thing" | "action" | "object";
export type Part =
  | { kind: "word"; w: string }
  | { kind: "gap"; who: Gap; raw: string }
  | { kind: "poss"; raw: string }
  | { kind: "det"; raw: string }
  | { kind: "self"; raw: string }
  | { kind: "alt"; opts: string[]; raw: string };

const PERSON = new Set(["somebody", "someone", "sb", "smb"]);
const THING = new Set(["something", "sth"]);
/** Từ sở hữu trong cụm: học sinh thay bằng bất kỳ từ sở hữu nào (my, his, their, Lan's...). */
const POSS = new Set(["your", "one's", "ones", "someone's", "somebody's", "our", "their", "my", "its"]);
/** Mạo từ trong cụm: học sinh được đổi (a ↔ the ↔ my ↔ this) hoặc bỏ. */
const DET = new Set(["a", "an", "the"]);
const SELF = new Set(["yourself", "oneself", "yourselves"]);
const POSSESSIVES = new Set(["my", "your", "his", "her", "our", "their", "its"]);
const DETERMINERS = new Set(["the", "a", "an", "this", "that", "these", "those", "some", "any", "every", "each", "one", "another"]);
const REFLEXIVES = new Set(["myself", "yourself", "himself", "herself", "ourselves", "yourselves", "themselves", "itself", "oneself"]);
/** Giới từ cần có người / vật đi sau ("take responsibility for", "raise awareness of"). Không gồm tiểu từ của cụm động từ (up, off, out...). */
const NEEDS_OBJECT = new Set(["to", "of", "for", "with", "in", "on", "at", "about", "from", "into", "by", "towards", "between", "among", "as", "against", "without", "through", "across"]);

/** Tách cụm từ thành từ cố định và chỗ trống. "do something" / "doing something" là một chỗ trống "việc". */
export function parsePhrase(phrase: string): Part[] {
  const out: Part[] = [];
  const words = phrase.trim().split(/\s+/);
  const ab = /\bA\b.*\bB\b/.test(phrase);
  for (let i = 0; i < words.length; i++) {
    const raw = words[i];
    if (raw.includes("/")) {
      const opts = raw.split("/").flatMap(tokens);
      // "his/her", "my/your": một chỗ "của ai", nhận mọi từ sở hữu.
      if (opts.length && opts.every((o) => POSSESSIVES.has(o))) out.push({ kind: "poss", raw: raw.replace(/[^\w/'’-]/g, "") });
      else if (opts.length) out.push({ kind: "alt", opts, raw: raw.replace(/[^\w/'’-]/g, "") });
      continue;
    }
    if (ab && (raw === "A" || raw === "B")) {
      out.push({ kind: "gap", who: "thing", raw });
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
      else if (DET.has(w)) out.push({ kind: "det", raw: w });
      else if (SELF.has(w)) out.push({ kind: "self", raw: w });
      else out.push({ kind: "word", w });
    }
  }
  // Cụm kết thúc bằng giới từ: phải nói người / vật đi sau ("take responsibility for [ai, cái gì]").
  const last = out.at(-1);
  if (last?.kind === "word" && NEEDS_OBJECT.has(last.w) && out.length > 1) out.push({ kind: "gap", who: "object", raw: "…" });
  return out;
}

/** Dạng bất quy tắc → dạng gốc (có thể nhiều gốc: "found" vừa là quá khứ của find, vừa là động từ found = thành lập). */
const IRREGULAR: Record<string, string[]> = {
  am: ["be"], is: ["be"], are: ["be"], was: ["be"], were: ["be"], been: ["be"], being: ["be"],
  took: ["take"], taken: ["take"], went: ["go"], gone: ["go"], did: ["do"], done: ["do"], made: ["make"],
  had: ["have"], has: ["have"], got: ["get"], gotten: ["get"], gave: ["give"], given: ["give"], kept: ["keep"],
  spent: ["spend"], felt: ["feel"], built: ["build"], brought: ["bring"], caught: ["catch"], ate: ["eat"], eaten: ["eat"],
  rode: ["ride"], ridden: ["ride"], wrote: ["write"], written: ["write"], ran: ["run"], found: ["find", "found"],
  met: ["meet"], left: ["leave", "left"], lost: ["lose"], paid: ["pay"], said: ["say"], sold: ["sell"], told: ["tell"],
  thought: ["think"], taught: ["teach"], understood: ["understand"], chose: ["choose"], chosen: ["choose"],
  became: ["become"], came: ["come"], overcame: ["overcome"], began: ["begin"], begun: ["begin"], drank: ["drink"],
  drunk: ["drink"], flew: ["fly"], flown: ["fly"], grew: ["grow"], grown: ["grow"], knew: ["know"], known: ["know"],
  saw: ["see"], seen: ["see"], sang: ["sing"], sung: ["sing"], spoke: ["speak"], spoken: ["speak"], swam: ["swim"],
  swum: ["swim"], threw: ["throw"], thrown: ["throw"], woke: ["wake"], woken: ["wake"], wore: ["wear"], worn: ["wear"],
  won: ["win"], held: ["hold"], heard: ["hear"], slept: ["sleep"], sat: ["sit"], stood: ["stand"], hung: ["hang"],
  fell: ["fall"], fallen: ["fall"], broke: ["break"], broken: ["break"], forgot: ["forget"], forgotten: ["forget"],
  bought: ["buy"], fought: ["fight"], sent: ["send"], lent: ["lend"], led: ["lead"], fed: ["feed"], drove: ["drive"],
  driven: ["drive"], shook: ["shake"], shaken: ["shake"], blew: ["blow"], blown: ["blow"], wove: ["weave"],
  woven: ["weave"], rose: ["rise"], risen: ["rise"], hid: ["hide"], hidden: ["hide"], bit: ["bite"], bitten: ["bite"],
  dug: ["dig"], fled: ["flee"], froze: ["freeze"], frozen: ["freeze"], laid: ["lay"], lay: ["lie", "lay"], lain: ["lie"],
  lit: ["light"], meant: ["mean"], rang: ["ring"], rung: ["ring"], shone: ["shine"], shot: ["shoot"], slid: ["slide"],
  spun: ["spin"], stole: ["steal"], stolen: ["steal"], stuck: ["stick", "stuck"], struck: ["strike"], swept: ["sweep"],
  swung: ["swing"], tore: ["tear"], torn: ["tear"], wept: ["weep"], withdrew: ["withdraw"], withdrawn: ["withdraw"],
  forgave: ["forgive"], forgiven: ["forgive"], arose: ["arise"], arisen: ["arise"], sought: ["seek"], dealt: ["deal"],
  drew: ["draw"], drawn: ["draw"], learnt: ["learn"], burnt: ["burn"], dreamt: ["dream"], spelt: ["spell"],
  smelt: ["smell"], spilt: ["spill"], could: ["can"], would: ["will"], might: ["may"],
  teeth: ["tooth"], children: ["child"], people: ["person", "people"], men: ["man"], women: ["woman"], feet: ["foot"],
  mice: ["mouse"], geese: ["goose"], better: ["good", "well"], best: ["good", "well"],
};

/** Chính tả Anh → Mỹ (máy chép lời thường viết kiểu Mỹ). Áp cho cả cụm và lời nói nên chỉ cần nhất quán. */
const SPELLING: Record<string, string> = {
  practise: "practice", practised: "practiced", practises: "practices", practising: "practicing", licence: "license",
  programme: "program", programmes: "programs", speciality: "specialty", specialities: "specialties", tyre: "tire",
  grey: "gray", jewellery: "jewelry", travelling: "traveling", travelled: "traveled", traveller: "traveler",
  travellers: "travelers", cancelled: "canceled", cancelling: "canceling", skilful: "skillful", enrol: "enroll",
  fulfil: "fulfill", aluminium: "aluminum", mum: "mom", mums: "moms", maths: "math", adviser: "advisor",
  advisers: "advisors", liveable: "livable", fieldtrip: "field trip",
  // Từ nói tắt học sinh hay dùng: coi như cùng một từ.
  laboratory: "lab", laboratories: "labs", refrigerator: "fridge", refrigerators: "fridges", television: "tv",
  televisions: "tvs", telephone: "phone", telephones: "phones", photograph: "photo", photographs: "photos",
  bicycle: "bike", bicycles: "bikes", mathematics: "math", examination: "exam", examinations: "exams",
};
/** Đầu từ có "our" không phải đuôi Anh (your, four, hour...): không đổi. */
const OUR_KEEP = /^(your|four|hour|pour|tour|sour|flour|journ|court|cour)/;
function spell(w: string): string {
  if (SPELLING[w]) return SPELLING[w];
  let x = w;
  if (x.length >= 6 && !OUR_KEEP.test(x)) x = x.replace(/our/g, "or"); // colour, favourite, neighbourhood, behaviour
  x = x.replace(/^(cen|thea|me|li|fi|lus|calib)tre(s|d)?$/, "$1ter$2"); // centre, theatre, metre, litre, fibre
  x = x.replace(/^(.{4,})is(e|es|ed|ing|ation|ations)$/, "$1iz$2"); // organise, realise, globalisation (không đổi raise, rise)
  x = x.replace(/^(.{3,})ys(e|es|ed|ing)$/, "$1yz$2"); // analyse
  return x;
}

const VOWEL = /[aeiou]/;
/** Các dạng thường gặp của một từ gốc: -s, -es, -ed, -ing, -er/-est, -ly, -ies/-ied, gấp đôi phụ âm. */
function formsOf(b: string): Set<string> {
  const f = new Set([b, `${b}s`, `${b}es`, `${b}d`, `${b}ed`, `${b}ing`, `${b}er`, `${b}est`, `${b}ly`, `${b}'s`, `${b}s'`]);
  if (b.endsWith("e")) f.add(`${b.slice(0, -1)}ing`).add(`${b.slice(0, -1)}ed`).add(`${b}r`).add(`${b}st`);
  if (b.endsWith("ie")) f.add(`${b.slice(0, -2)}ying`);
  if (b.endsWith("le")) f.add(`${b.slice(0, -1)}y`);
  if (/[^aeiou]y$/.test(b)) for (const s of ["ies", "ied", "ier", "iest", "ily"]) f.add(`${b.slice(0, -1)}${s}`);
  const last = b.at(-1) ?? "";
  if (b.length >= 3 && /[bdgklmnprtz]/.test(last) && VOWEL.test(b.at(-2) ?? "") && !VOWEL.test(b.at(-3) ?? ""))
    for (const s of ["ed", "ing", "er", "est"]) f.add(`${b}${last}${s}`);
  if (b.endsWith("f")) f.add(`${b.slice(0, -1)}ves`);
  if (b.endsWith("fe")) f.add(`${b.slice(0, -2)}ves`);
  return f;
}
/** Từ học sinh nói (tokenRaw) có phải một dạng của từ trong cụm (baseRaw) không. */
function same(tokenRaw: string, baseRaw: string): boolean {
  const t = spell(tokenRaw);
  const b = spell(baseRaw);
  if (t === b || formsOf(b).has(t) || formsOf(t).has(b)) return true;
  const ti = IRREGULAR[t] ?? [];
  const bi = IRREGULAR[b] ?? [];
  if (ti.some((x) => x === b || formsOf(x).has(b))) return true;
  if (bi.some((x) => x === t || formsOf(x).has(t))) return true;
  if (ti.some((x) => bi.includes(x))) return true;
  // Gốc chung khi từ trong cụm đã ở dạng biến đổi ("family gatherings" ~ "gathering").
  return t.length > 4 && b.length > 4 && stem(t) === stem(b);
}

/** Từ có thể bỏ khi học sinh đổi cách nói (giới từ, "be", "and"). */
const OPTIONAL = new Set(["be", "to", "of", "for", "with", "in", "on", "at", "about", "from", "into", "by", "towards", "and", "as"]);
/** Số từ học sinh được chen vào giữa hai phần của cụm ("improve MY physical health"). */
const MAX_INSERT = 3;

/**
 * Tìm cụm từ trong lời nói.
 * 1) Theo thứ tự: các phần đúng thứ tự, giữa hai phần chen được tối đa 3 từ; chỗ trống khớp 1–5 từ; từ sở hữu và mạo từ
 *    trong cụm khớp mọi từ sở hữu / mạo từ hoặc bỏ đi; "be" bỏ được; từ ghép viết liền hay rời đều được (hard-working /
 *    hardworking, Ha Noi / Hanoi); từ so theo dạng (help/helps/helped, take/took, fancy/fancies, green/greener).
 * 2) Đổi cách nói (cụm có từ 2 từ chính): đủ mọi từ chính ở bất kỳ vị trí nào; cụm kết thúc bằng giới từ thì sau giới từ
 *    đó phải còn ít nhất một từ ("My family consists of." không đạt).
 */
function find(t: string[], parts: Part[]): boolean {
  const flex = (p: Part) => p.kind === "poss" || p.kind === "det" || (p.kind === "word" && p.w === "be");
  const matchOne = (p: Part, i: number): boolean => {
    const w = t[i];
    if (w === undefined) return false;
    if (p.kind === "word") return same(w, p.w);
    if (p.kind === "poss" || p.kind === "det") return POSSESSIVES.has(w) || DETERMINERS.has(w) || /'s$/.test(w);
    if (p.kind === "self") return REFLEXIVES.has(w);
    if (p.kind === "alt") return p.opts.some((o) => same(w, o));
    return false;
  };
  const go = (i: number, k: number, first: boolean): boolean => {
    if (k === parts.length) return true;
    const p = parts[k];
    if (p.kind === "gap") {
      for (let len = 1; len <= 5 && i + len <= t.length; len++) if (go(i + len, k + 1, false)) return true;
      return false;
    }
    // Từ sở hữu, mạo từ, "be" trong cụm có thể bỏ ("people admire my teacher for", "benefits of doing").
    if (flex(p) && go(i, k + 1, first)) return true;
    const maxSkip = first ? 0 : MAX_INSERT;
    for (let s = 0; s <= maxSkip && i + s < t.length; s++) {
      if (matchOne(p, i + s) && go(i + s + 1, k + 1, false)) return true;
      if (p.kind === "word") {
        // Từ ghép: hai từ của cụm viết liền ("man made" ~ "manmade"), hoặc một từ của cụm bị tách ("fieldtrip" ~ "field trip").
        const q = parts[k + 1];
        if (q?.kind === "word" && same(t[i + s], p.w + q.w) && go(i + s + 1, k + 2, false)) return true;
        if (t[i + s + 1] !== undefined && same(t[i + s] + t[i + s + 1], p.w) && go(i + s + 2, k + 1, false)) return true;
      }
    }
    return false;
  };
  for (let s = 0; s < t.length; s++) if (go(s, 0, true)) return true;

  // Đổi cách nói.
  const words = parts.filter((p): p is Extract<Part, { kind: "word" }> => p.kind === "word" && !OPTIONAL.has(p.w));
  if (words.length < 2) return false;
  const joined = [...t, ...t.slice(1).map((w, i) => t[i] + w)];
  const has = (w: string) => joined.some((x) => same(x, w));
  if (!words.every((p) => has(p.w))) return false;
  if (!parts.every((p) => p.kind !== "alt" || p.opts.some((o) => has(o)))) return false;
  const end = parts.at(-1);
  if (end?.kind === "gap" && end.who === "object") {
    const prep = parts.at(-2);
    if (prep?.kind === "word") {
      const at = t.lastIndexOf(prep.w);
      if (at < 0 || at === t.length - 1) return false;
    }
  }
  return true;
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

/** Đủ thành câu: tối thiểu 4 từ và dài hơn chính cụm từ ít nhất một từ ("Swimming improves physical health" là đủ). */
export function checkUseWord(transcript: string, phrase: string, example: string | null): UseWordResult {
  const t = tokens(transcript);
  const parts = parsePhrase(phrase);
  const hit = find(t, parts);
  // Đọc nguyên chữ chỗ trống của cụm ("somebody", "something", "someone's", chữ A / B) thay vì người, việc cụ thể.
  const holes = new Set<string>(tokens(phrase).filter((w) => PERSON.has(w) || THING.has(w) || w === "someone's" || w === "somebody's" || w === "one's"));
  if (/\bA\b.*\bB\b/.test(phrase)) holes.add("b");
  const placeholderLeft = hit && t.some((w) => holes.has(w));
  const tooShort = t.length < Math.max(4, tokens(phrase).length + 1);
  const ex = example ? tokens(example) : [];
  const overlap = ex.length ? ex.filter((w) => t.includes(w)).length / ex.length : 0;
  const copiedExample = ex.length > 0 && overlap >= 0.9 && Math.abs(t.length - ex.length) <= 2;
  return { used: hit, placeholderLeft, tooShort, copiedExample, ok: hit && !placeholderLeft && !tooShort && !copiedExample };
}

/** Cách hiện một phần của cụm trên màn hình: từ cố định giữ nguyên, chỗ trống thành ô gợi ý tiếng Việt. */
export function partLabel(p: Part): { text: string; gap: boolean; raw: string } {
  switch (p.kind) {
    case "word":
      return { text: p.w, gap: false, raw: p.w };
    case "det":
      return { text: p.raw, gap: false, raw: p.raw };
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
        case "det":
          return p.raw;
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
