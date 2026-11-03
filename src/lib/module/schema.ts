import { z } from "zod";

/**
 * Cấu trúc nội dung của MỘT Learning Module (file content/modules/grade-<khối>/unit-<số>.json): Kho kiến thức
 * (Knowledge Layer) và chất liệu luyện tập (Training Layer) cho một Unit SGK, học trong 14 ngày.
 * Câu hỏi luyện nói chính (15 câu, 4 mức gợi ý) lấy từ Unit luyện tập content/grade-<khối>/unit-<số>.json.
 *
 * Mỗi mục có nguồn (src): "sgk" kèm số trang in trên sách, hoặc "team" (nhóm tự soạn theo chủ đề SGK).
 * Bản quyền: chỉ lấy từ, phiên âm, tên cấu trúc, cụm diễn đạt từ SGK; mọi câu ví dụ, bài tập, kịch bản đều tự viết.
 * Chỉ import "zod" để script Node (kiểm tra, nạp nội dung) dùng lại được trực tiếp.
 */

/** Nhãn lỗi cố định cho Error Memory. AI chỉ được chọn trong danh sách này; nhãn hiện cho học sinh bằng tiếng Việt. */
export const ERROR_TAGS = {
  third_person_s: "Thiếu -s/-es sau chủ ngữ số ít (he, she, it)",
  verb_tense: "Dùng sai thì của động từ",
  verb_form: "Sai dạng động từ (to V, V-ing, V nguyên mẫu)",
  subject_verb: "Chủ ngữ và động từ không hợp nhau (is/are, was/were)",
  modal_verb: "Sau should, can, must... phải là động từ nguyên mẫu",
  article: "Dùng sai hoặc thiếu a, an, the",
  plural: "Sai số ít, số nhiều của danh từ",
  preposition: "Dùng sai giới từ",
  word_order: "Sai trật tự từ trong câu",
  missing_word: "Thiếu chủ ngữ hoặc động từ",
  conjunction: "Dùng sai từ nối (because, so, but, when...)",
  comparison: "Sai cấu trúc so sánh",
  conditional: "Sai câu điều kiện",
  pronoun: "Dùng sai đại từ",
  word_choice: "Chọn từ chưa đúng nghĩa",
  other: "Lỗi khác",
} as const;
export type ErrorTag = keyof typeof ERROR_TAGS;
export const ERROR_TAG_KEYS = Object.keys(ERROR_TAGS) as [ErrorTag, ...ErrorTag[]];

const id = (prefix: string) => z.string().regex(new RegExp(`^${prefix}\\d{2}$`), `id phải có dạng ${prefix}01`);
const text = (max: number) => z.string().trim().min(1).max(max);
const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const sourceSchema = z
  .object({
    kind: z.enum(["sgk", "team"]),
    /** Số trang IN trên sách (không phải số trang của file PDF). */
    page: z.number().int().min(1).max(300).nullable(),
  })
  .refine((s) => s.kind !== "sgk" || s.page !== null, "Mục lấy từ SGK phải ghi số trang");

/** Câu trắc nghiệm viết sẵn (ngữ pháp, phát âm). answer: vị trí đáp án đúng trong options. */
export const choiceSchema = z
  .object({
    prompt: text(200),
    options: z.array(text(80)).min(2).max(4),
    answer: z.number().int().min(0).max(3),
    explainVi: text(240),
  })
  .refine((c) => c.answer < c.options.length, "answer nằm ngoài danh sách lựa chọn")
  .refine((c) => new Set(c.options.map((o) => o.toLowerCase())).size === c.options.length, "Các lựa chọn bị trùng");

export const vocabSchema = z.object({
  id: id("v"),
  en: text(40),
  vi: text(80),
  /** Phiên âm IPA, đặt trong hai dấu gạch chéo: /ɪˈnvaɪrənmənt/. */
  ipa: z.string().trim().regex(/^\/[^/]+\/$/, "Phiên âm đặt trong /.../"),
  /** Phiên âm chép từ Glossary SGK, hay nhóm tra từ điển (từ có trong bài nhưng Glossary không có). */
  ipaFrom: z.enum(["glossary", "dictionary"]),
  /** Từ loại viết tắt như SGK: n, v, adj, adv, phr v, n phr... */
  pos: text(20),
  example: text(160),
  collocations: z.array(text(50)).max(4),
  synonyms: z.array(text(40)).max(3),
  antonyms: z.array(text(40)).max(3),
  src: sourceSchema,
});

export const grammarSchema = z.object({
  id: id("g"),
  name: text(80),
  nameVi: text(80),
  /** Giải thích ngắn bằng tiếng Việt: dùng khi nào, để nói điều gì. */
  explainVi: text(500),
  formula: text(200),
  examples: z.array(text(160)).min(2).max(4),
  /** Câu sai thường gặp, kèm câu đúng và lý do. */
  wrong: z.array(z.object({ sentence: text(160), fix: text(160), whyVi: text(240) })).min(1).max(3),
  drills: z.array(choiceSchema).min(2).max(6),
  errorTag: z.enum(ERROR_TAG_KEYS),
  src: sourceSchema,
});

export const PRON_KINDS = ["sound", "word_stress", "sentence_stress", "ending", "intonation"] as const;
export const pronSchema = z.object({
  id: id("p"),
  kind: z.enum(PRON_KINDS),
  /** Điểm cần luyện, ví dụ "/bl/ và /kl/" hoặc "Trọng âm từ có đuôi -ic". */
  focus: text(80),
  tipVi: text(300),
  words: z.array(text(40)).min(2).max(10),
  sentence: text(160).nullable(),
  quiz: z.array(choiceSchema).max(3),
  src: sourceSchema,
});

export const expressionSchema = z.object({
  id: id("e"),
  en: text(80),
  vi: text(100),
  /** Khi nào dùng: "Khi muốn nêu ý kiến của mình". */
  useVi: text(160),
  example: text(160),
  src: sourceSchema,
});

/** Sentence Building: các mảnh theo ĐÚNG thứ tự; máy trộn lên cho học sinh xếp lại. */
export const buildSchema = z.object({
  id: id("b"),
  chunks: z.array(text(40)).min(3).max(7),
  vi: text(160),
  grammarId: id("g").nullable(),
});

/** Sentence Expansion: từ câu ngắn, mỗi bước hỏi thêm một ý (cái gì, khi nào, vì sao...) để câu dài dần. */
export const expandSchema = z.object({
  id: id("x"),
  base: text(80),
  steps: z
    .array(z.object({ askVi: text(100), ask: text(60), add: text(60) }))
    .min(2)
    .max(4),
  /** Câu đầy đủ mẫu, chứa mọi phần "add". */
  full: text(240),
});

/** Question Variation: cùng một ý, hỏi theo nhiều cách. */
export const variationSchema = z.object({
  id: id("w"),
  ideaVi: text(160),
  questions: z.array(text(160).refine((s) => /[?.]$/.test(s), "Câu hỏi kết thúc bằng ? hoặc .")).min(3).max(4),
  keywords: z.array(text(40)).min(2).max(5),
  exampleAnswer: text(240).refine((s) => wordCount(s) <= 35, "Câu ví dụ tối đa 35 từ"),
  expectsReason: z.boolean(),
});

/**
 * Câu nói độc lập (không gợi ý) cho bài kiểm tra đầu module (entry) và cuối module (final).
 * Hai bộ là các cặp song song (pair 1, 2, 3...): cùng dạng, cùng độ khó, khác câu chữ, để so sánh trước/sau công bằng.
 */
export const independentSchema = z.object({
  id: id("i"),
  set: z.enum(["entry", "final"]),
  pair: z.number().int().min(1).max(6),
  text: text(160).refine((s) => /[?.]$/.test(s), "Câu hỏi kết thúc bằng ? hoặc ."),
  keywords: z.array(text(40)).min(2).max(5),
  expectsReason: z.boolean(),
});

export const REQUIREMENT_KINDS = ["reason", "example", "suggestion", "keyword"] as const;
export const roleplaySchema = z.object({
  id: id("r"),
  /** basic: ngày 11; advanced: ngày 12 (AI nêu ý kiến khác); final: bài kiểm tra ngày 14 (tình huống mới, không gợi ý). */
  level: z.enum(["basic", "advanced", "final"]),
  titleVi: text(80),
  contextVi: text(300),
  aiRole: text(80),
  studentRoleVi: text(100),
  goalVi: text(200),
  /** Nhiệm vụ bằng tiếng Anh, gửi cho AI làm bối cảnh. */
  goal: text(200),
  requirements: z
    .array(z.object({ kind: z.enum(REQUIREMENT_KINDS), vi: text(120), words: z.array(text(40)).max(6) }))
    .min(1)
    .max(3),
  opener: text(200),
  /** Ý kiến khác AI có thể nêu giữa chừng để học sinh giải thích, bảo vệ ý mình (advanced, final). */
  stance: text(200).nullable(),
  /** Số lượt học sinh nói. */
  turns: z.number().int().min(3).max(6),
  /** Lời dự phòng theo kịch bản khi AI lỗi hoặc hết lượt: đúng turns - 1 câu. */
  fallback: z.array(text(200)).min(2).max(5),
  tipsVi: z.array(text(160)).min(1).max(3),
  keywords: z.array(text(40)).min(2).max(6),
});

export const moduleSchema = z
  .object({
    grade: z.number().int().min(6).max(12),
    unit: z.number().int().min(1).max(20),
    title: text(80),
    titleVi: text(80),
    /** Sách và lần xuất bản, ví dụ "Tiếng Anh 8 Global Success, sách học sinh (NXB Giáo dục Việt Nam)". */
    edition: text(160),
    /** Trang của Unit trong sách, ví dụ "tr. 70–79; Glossary tr. 136". */
    pages: text(80),
    vocab: z.array(vocabSchema).min(12).max(40),
    grammar: z.array(grammarSchema).min(1).max(4),
    pronunciation: z.array(pronSchema).min(2).max(12),
    expressions: z.array(expressionSchema).min(6).max(20),
    build: z.array(buildSchema).min(6).max(10),
    expand: z.array(expandSchema).min(3).max(6),
    variations: z.array(variationSchema).min(4).max(8),
    independent: z.array(independentSchema).min(6).max(12),
    roleplays: z.array(roleplaySchema).min(3).max(6),
  })
  .superRefine((m, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
    const dup = (arr: { id: string }[], path: string) => {
      const seen = new Set<string>();
      for (const x of arr) {
        if (seen.has(x.id)) issue([path], `Trùng id ${x.id}`);
        seen.add(x.id);
      }
    };
    for (const k of ["vocab", "grammar", "pronunciation", "expressions", "build", "expand", "variations", "independent", "roleplays"] as const)
      dup(m[k], k);

    const norm = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();
    const words = new Set<string>();
    m.vocab.forEach((v, i) => {
      if (words.has(norm(v.en))) issue(["vocab", i], `Từ bị trùng: ${v.en}`);
      words.add(norm(v.en));
    });

    const grammarIds = new Set(m.grammar.map((g) => g.id));
    m.build.forEach((b, i) => {
      if (b.grammarId && !grammarIds.has(b.grammarId)) issue(["build", i], `${b.id}: không có cấu trúc ${b.grammarId}`);
      if (new Set(b.chunks.map(norm)).size !== b.chunks.length) issue(["build", i], `${b.id}: hai mảnh giống nhau thì không xếp được duy nhất`);
    });
    m.expand.forEach((x, i) => {
      for (const s of x.steps) if (!` ${norm(x.full)} `.includes(` ${norm(s.add)} `)) issue(["expand", i], `${x.id}: câu đầy đủ thiếu phần "${s.add}"`);
    });

    // Bộ đầu module và cuối module: cùng số cặp, mỗi cặp cùng yêu cầu lý do, không trùng câu chữ.
    const entry = m.independent.filter((q) => q.set === "entry");
    const final = m.independent.filter((q) => q.set === "final");
    if (entry.length < 3) issue(["independent"], "Cần ít nhất 3 câu cho bài đầu module (entry)");
    const pairs = (xs: typeof entry) => xs.map((q) => q.pair).sort().join(",");
    if (pairs(entry) !== pairs(final)) issue(["independent"], "Bộ entry và final phải có cùng các cặp (pair)");
    for (const e of entry) {
      const f = final.find((q) => q.pair === e.pair);
      if (f && f.expectsReason !== e.expectsReason) issue(["independent"], `Cặp ${e.pair}: hai câu phải cùng yêu cầu lý do`);
      if (f && norm(f.text) === norm(e.text)) issue(["independent"], `Cặp ${e.pair}: hai câu giống hệt nhau`);
    }
    // Câu kiểm tra độc lập không được trùng câu luyện (Question Variation).
    const practiced = new Set(m.variations.flatMap((v) => v.questions.map(norm)));
    m.independent.forEach((q, i) => {
      if (practiced.has(norm(q.text))) issue(["independent", i], `${q.id}: trùng với câu luyện ở variations`);
    });

    m.roleplays.forEach((r, i) => {
      if (r.fallback.length !== r.turns - 1) issue(["roleplays", i], `${r.id}: cần đúng ${r.turns - 1} câu dự phòng (turns - 1)`);
      if (r.level !== "basic" && !r.stance) issue(["roleplays", i], `${r.id}: tình huống ${r.level} cần "stance" (ý kiến khác)`);
      r.requirements.forEach((q, j) => {
        if (q.kind === "keyword" && q.words.length === 0) issue(["roleplays", i, "requirements", j], "Yêu cầu dùng từ cần danh sách words");
      });
    });
    for (const level of ["basic", "advanced", "final"] as const)
      if (!m.roleplays.some((r) => r.level === level)) issue(["roleplays"], `Thiếu tình huống mức ${level}`);
  });

export type ModuleContent = z.infer<typeof moduleSchema>;
export type ModuleVocab = z.infer<typeof vocabSchema>;
export type ModuleGrammar = z.infer<typeof grammarSchema>;
export type ModulePron = z.infer<typeof pronSchema>;
export type ModuleExpression = z.infer<typeof expressionSchema>;
export type ModuleRoleplay = z.infer<typeof roleplaySchema>;
export type Choice = z.infer<typeof choiceSchema>;
