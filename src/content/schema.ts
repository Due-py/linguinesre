// Shared data shape for every textbook Unit (grades 6-12). Each Unit lives in
// src/content/units/g<grade>/u<nn>-<slug>.json and is checked against this
// schema at build time, so a broken Unit file fails the build.
//
// Fields that the student HEARS (word, example, model, question, partner line)
// may have a matching `say` field: the exact text sent to the TTS voice when it
// differs from what is shown, e.g. "DIY" is shown but "D I Y" is spoken.

import { z } from "zod";
import { matchesKeywords } from "./match";

const id = z.string().regex(/^[a-z0-9-]+$/, "id: chỉ chữ thường, số, dấu gạch ngang");
const text = z.string().trim().min(1);
const page = z.number().int().positive();
const keywords = z.array(z.array(text).min(1)).min(1);

export const STATUSES = ["draft", "team-reviewed", "teacher-approved"] as const;

const vocabItem = z.object({
  id,
  text,
  say: text.optional(),
  ipa: text.optional(),
  pos: z.enum(["n", "v", "adj", "adv", "phrase"]),
  kind: z.enum(["glossary", "activity", "expression", "verb"]),
  meaningVi: text,
  example: text,
  exampleSay: text.optional(),
  page,
});

const pronunciation = z.object({
  sounds: z.array(text).min(1),
  words: z
    .array(z.object({ id, text, say: text.optional(), sound: text }))
    .min(4),
  page,
});

/** Level 1: sentence frame with a gap, e.g. "I'm keen on ___." */
const frame = z.object({
  id,
  frame: text.refine((f) => f.includes("___"), "frame phải có chỗ trống ___"),
  meaningVi: text,
  slotOptions: z.array(text).min(2),
  model: text,
  modelSay: text.optional(),
  page,
});

/** Level 2: extend a base sentence with a reason or detail. */
const extension = z.object({
  id,
  base: text,
  connector: z.enum(["because", "and", "but", "so"]),
  promptVi: text,
  model: text,
  modelSay: text.optional(),
  page,
});

/** Level 3: speak for about `targetSeconds` on a topic. */
const talk = z.object({
  id,
  prompt: text,
  promptVi: text,
  guide: z.array(text).min(2),
  usefulLanguage: z.array(text).min(2),
  targetSeconds: z.number().int().min(15).max(90),
  model: text,
  modelSay: text.optional(),
  page,
});

/** Adaptive Rescue Cascade, lightest hint first; Vietnamese keywords come last. */
const rescue = z.object({
  image: text,
  starter: text,
  simpler: text,
  keywordsVi: text,
});

const speedItem = z.object({
  id,
  question: text,
  say: text.optional(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  keywords,
  samples: z.array(text).min(2),
  rescue,
  page,
});

const roleplayTurn = z.object({
  id,
  partner: text,
  say: text.optional(),
  expect: z.enum(["invite", "accept", "accept-or-decline", "answer", "close"]),
  keywords,
  samples: z.array(text).min(1),
  starter: text,
});

const roleplay = z.object({
  id,
  title: text,
  titleVi: text,
  goalVi: text,
  partnerName: text,
  /** English brief for the AI partner (Phase 3); the scripted turns are the fallback. */
  aiBrief: text,
  usefulLanguage: z.array(text).min(2),
  /** True when the scenario adds language the textbook does not teach. */
  beyondBook: z.boolean(),
  beyondBookNoteVi: text.optional(),
  turns: z.array(roleplayTurn).min(3),
  page,
});

const unitBase = z.object({
  id,
  grade: z.number().int().min(6).max(12),
  unit: z.number().int().min(1).max(12),
  title: text,
  titleVi: text,
  status: z.enum(STATUSES),
  source: z.object({
    book: text,
    pages: z.tuple([page, page]),
    glossaryPage: page.optional(),
  }),
  objectivesVi: z.array(text).min(2),
  vocabulary: z.array(vocabItem).min(15),
  pronunciation,
  frames: z.array(frame).min(6),
  extensions: z.array(extension).min(5),
  talks: z.array(talk).min(2),
  speed: z.array(speedItem).min(15),
  roleplays: z.array(roleplay).min(1),
});

export type Unit = z.infer<typeof unitBase>;

/** A piece of English the student hears, collected for the TTS script. */
export interface Speakable {
  /** Where it comes from, e.g. "vocabulary.v-diy.example". */
  ref: string;
  /** Shown on screen. */
  text: string;
  /** Sent to the voice. */
  say: string;
}

export function collectSpeakables(unit: Unit): Speakable[] {
  const out: Speakable[] = [];
  const add = (ref: string, shown: string, say?: string) => out.push({ ref, text: shown, say: say ?? shown });

  for (const v of unit.vocabulary) {
    add(`vocabulary.${v.id}.text`, v.text, v.say);
    add(`vocabulary.${v.id}.example`, v.example, v.exampleSay);
  }
  for (const w of unit.pronunciation.words) add(`pronunciation.${w.id}`, w.text, w.say);
  for (const f of unit.frames) add(`frames.${f.id}.model`, f.model, f.modelSay);
  for (const e of unit.extensions) add(`extensions.${e.id}.model`, e.model, e.modelSay);
  for (const t of unit.talks) add(`talks.${t.id}.model`, t.model, t.modelSay);
  for (const s of unit.speed) add(`speed.${s.id}.question`, s.question, s.say);
  for (const r of unit.roleplays) {
    for (const turn of r.turns) add(`roleplays.${r.id}.${turn.id}`, turn.partner, turn.say);
  }
  return out;
}

/** Abbreviations like DIY or TV are read badly by TTS voices, so they need `say`. */
const ABBREVIATION = /\b[A-Z]{2,}\b/;

export const unitSchema = unitBase.superRefine((unit, ctx) => {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

  const seen = new Set<string>();
  const ids = [
    ...unit.vocabulary.map((x) => x.id),
    ...unit.pronunciation.words.map((x) => x.id),
    ...unit.frames.map((x) => x.id),
    ...unit.extensions.map((x) => x.id),
    ...unit.talks.map((x) => x.id),
    ...unit.speed.map((x) => x.id),
    ...unit.roleplays.flatMap((r) => [r.id, ...r.turns.map((t) => `${r.id}/${t.id}`)]),
  ];
  for (const itemId of ids) {
    if (seen.has(itemId)) issue(["id"], `id bị trùng: ${itemId}`);
    seen.add(itemId);
  }

  const [from, to] = unit.source.pages;
  const pageOk = (p: number) => (p >= from && p <= to) || p === unit.source.glossaryPage;
  const checkPage = (path: (string | number)[], p: number) => {
    if (!pageOk(p)) issue(path, `trang ${p} nằm ngoài Unit (${from}-${to})`);
  };
  unit.vocabulary.forEach((v, i) => checkPage(["vocabulary", i, "page"], v.page));
  checkPage(["pronunciation", "page"], unit.pronunciation.page);
  unit.frames.forEach((f, i) => checkPage(["frames", i, "page"], f.page));
  unit.extensions.forEach((e, i) => checkPage(["extensions", i, "page"], e.page));
  unit.talks.forEach((t, i) => checkPage(["talks", i, "page"], t.page));
  unit.speed.forEach((s, i) => checkPage(["speed", i, "page"], s.page));
  unit.roleplays.forEach((r, i) => checkPage(["roleplays", i, "page"], r.page));

  unit.pronunciation.words.forEach((w, i) => {
    if (!unit.pronunciation.sounds.includes(w.sound)) {
      issue(["pronunciation", "words", i, "sound"], `âm ${w.sound} không có trong danh sách sounds`);
    }
  });

  unit.speed.forEach((s, i) => {
    s.samples.forEach((sample, j) => {
      if (!matchesKeywords(sample, s.keywords)) {
        issue(["speed", i, "samples", j], `câu mẫu không khớp từ khóa: "${sample}"`);
      }
    });
  });
  unit.roleplays.forEach((r, i) => {
    r.turns.forEach((t, j) => {
      t.samples.forEach((sample, k) => {
        if (!matchesKeywords(sample, t.keywords)) {
          issue(["roleplays", i, "turns", j, "samples", k], `câu mẫu không khớp từ khóa: "${sample}"`);
        }
      });
    });
    if (r.beyondBook && !r.beyondBookNoteVi) {
      issue(["roleplays", i, "beyondBookNoteVi"], "phần ngoài sách cần ghi chú cho giáo viên");
    }
  });

  for (const s of collectSpeakables(unit)) {
    if (s.say === s.text && ABBREVIATION.test(s.text)) {
      issue([s.ref], `có chữ viết tắt, cần thêm cách đọc (say): "${s.text}"`);
    }
  }
});

export function parseUnit(data: unknown): Unit {
  return unitSchema.parse(data);
}
