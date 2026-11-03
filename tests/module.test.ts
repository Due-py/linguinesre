import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleSchema, type ModuleContent } from "@/lib/module/schema";
import { unitSchema } from "@/lib/content/schema";
import {
  buildLesson,
  DAY_INFO,
  DAYS,
  dueVocab,
  errorCounts,
  knowledgeQuiz,
  nextOpenDay,
  PHASES,
  speedTarget,
  vocabStates,
  type HistoryAttempt,
  type UnitQuestion,
} from "@/lib/module/plan";
import { heardRatio, missedWords, requirementMet, speechMeasures } from "@/lib/module/measure";
import { mockAssessment, verifyAssessment } from "@/lib/module/assessCore";
import { fallbackLine, stanceTurn, verifyReply } from "@/lib/module/roleplayCore";
import { moduleReport } from "@/lib/module/report";
import { similarity, testFormSchema } from "@/lib/research/testForm";

const read = (p: string) => JSON.parse(readFileSync(join(process.cwd(), p), "utf8"));
const pad = (n: number) => String(n).padStart(2, "0");

/** Mọi module đã viết, kèm câu hỏi của Unit luyện tập cùng số (giống dữ liệu máy chủ đọc từ CSDL). */
const modules: { file: string; m: ModuleContent; questions: UnitQuestion[] }[] = [];
for (const g of readdirSync(join(process.cwd(), "content/modules"))) {
  for (const f of readdirSync(join(process.cwd(), "content/modules", g))) {
    const m = moduleSchema.parse(read(`content/modules/${g}/${f}`));
    const u = unitSchema.parse(read(`content/grade-${m.grade}/unit-${pad(m.unit)}.json`));
    const questions = u.questions.map((q, i) => ({
      id: `00000000-0000-0000-0000-0000000000${pad(i)}`,
      key: q.id,
      text: q.text,
      difficulty: q.difficulty,
      keywords: q.keywords,
      expectsReason: q.expectsReason,
      hints: [
        { level: 1 as const, title: "Hướng nghĩ", body: q.hintDirectionVi, lang: "vi" as const },
        { level: 2 as const, title: "Từ khóa", body: q.keywords.join(", "), lang: "en" as const },
        { level: 4 as const, title: "Câu ví dụ", body: q.exampleAnswer, lang: "en" as const },
      ],
    }));
    modules.push({ file: `${g}/${f}`, m, questions });
  }
}
const pilot = modules.find((x) => x.file === "grade-8/unit-07.json")!;

const NOW = Date.parse("2026-11-20T10:00:00Z");
const at = (daysAgo: number) => new Date(NOW - daysAgo * 86_400_000).toISOString();
const h = (p: Partial<HistoryAttempt>): HistoryAttempt => ({
  day: 1,
  t: "quiz",
  ref: "v01",
  set: null,
  area: null,
  attemptNo: 1,
  correct: null,
  thinkMs: null,
  hintLevel: 0,
  inTarget: null,
  targetMs: null,
  errorTags: [],
  at: at(1),
  ...p,
});

describe("nội dung module", () => {
  it("có module mẫu lớp 8 Unit 7", () => expect(pilot).toBeDefined());

  it.each(modules.map((x) => [x.file, x] as const))("%s lập được đủ 14 ngày, không ngày nào trống", (_, x) => {
    for (let day = 1; day <= DAYS; day++) {
      const lesson = buildLesson({ day, module: x.m, unitQuestions: x.questions, history: [], seed: "hs1", now: NOW });
      expect(lesson.steps.length, `ngày ${day}`).toBeGreaterThan(0);
      expect(lesson.steps.map((s) => s.n)).toEqual(lesson.steps.map((_, i) => i));
      for (const s of lesson.steps) if (s.t === "quiz") expect(s.q.options[s.q.answer]).toBeTruthy();
    }
  });
});

describe("không đụng tới đề kiểm tra của nghiên cứu", () => {
  it("câu hỏi trong module lớp 8 không gần câu nào trong đề kiểm tra nghiên cứu", () => {
    const form = testFormSchema.parse(read("content/tests/grade-8.json"));
    const test = [...form.warmup, ...form.pairs.flatMap((p) => [p.A, p.B])];
    const asked = modules
      .filter((x) => x.m.grade === 8)
      .flatMap((x) => [...x.m.variations.flatMap((v) => v.questions), ...x.m.independent.map((q) => q.text), ...x.m.roleplays.map((r) => r.opener)]);
    const close = test.flatMap((t) => asked.filter((b) => similarity(t, b) >= 0.6).map((b) => `${t} ~ ${b}`));
    expect(close).toEqual([]);
  });
});

describe("bài kiểm tra đầu và cuối module", () => {
  it("cùng cấu trúc nhưng không trùng câu", () => {
    const entry = knowledgeQuiz(pilot.m, "entry", "hs1");
    const final = knowledgeQuiz(pilot.m, "final", "hs1");
    expect(entry.map((x) => x.q.area)).toEqual(final.map((x) => x.q.area));
    expect(entry.length).toBe(8);
    const prompts = new Set(entry.map((x) => x.q.prompt));
    expect(final.some((x) => prompts.has(x.q.prompt))).toBe(false);
  });

  it("câu nói độc lập ngày 1 và ngày 13 là các cặp khác nhau, không gợi ý", () => {
    const d1 = buildLesson({ day: 1, module: pilot.m, unitQuestions: pilot.questions, history: [], seed: "a", now: NOW });
    const d13 = buildLesson({ day: 13, module: pilot.m, unitQuestions: pilot.questions, history: [], seed: "a", now: NOW });
    const ind = (l: typeof d1) => l.steps.filter((s) => s.t === "speak" && s.source === "independent");
    expect(ind(d1).length).toBe(3);
    expect(ind(d13).length).toBe(3);
    for (const s of [...ind(d1), ...ind(d13)]) if (s.t === "speak") expect(s.hints).toEqual([]);
    expect(ind(d1).map((s) => s.ref)).not.toEqual(ind(d13).map((s) => s.ref));
  });

  it("cùng học sinh, cùng ngày thì cùng bài; đáp án nằm ở vị trí khác nhau giữa các câu", () => {
    const a = knowledgeQuiz(pilot.m, "entry", "hs1");
    expect(knowledgeQuiz(pilot.m, "entry", "hs1")).toEqual(a);
    expect(new Set(a.map((x) => x.q.answer)).size).toBeGreaterThan(1);
  });
});

describe("thích ứng theo kết quả thật", () => {
  it("ngày 2 bỏ học kỹ các từ đã trả lời đúng ở bài đầu module", () => {
    const second = pilot.m.vocab.slice(Math.ceil(pilot.m.vocab.length / 2));
    const hist = [h({ set: "entry", area: "vocab", ref: second[0].id, correct: true })];
    const l = buildLesson({ day: 2, module: pilot.m, unitQuestions: pilot.questions, history: hist, seed: "a", now: NOW });
    expect(l.steps.some((s) => s.t === "learn_word" && s.ref === second[0].id)).toBe(false);
    expect(l.steps.some((s) => s.t === "known_words" && s.refs.includes(second[0].id))).toBe(true);
    expect(l.notesVi.join(" ")).toContain("đã biết 1 từ");
  });

  it("ngày 4 thêm bài xếp câu khi ngữ pháp ở ngày 3 yếu", () => {
    const weak = [1, 2, 3].map((i) => h({ day: 3, set: "check1", area: "grammar", ref: `g01.${i}`, correct: i === 1 }));
    const strong = [1, 2, 3].map((i) => h({ day: 3, set: "check1", area: "grammar", ref: `g01.${i}`, correct: true }));
    const n = (hist: HistoryAttempt[]) =>
      buildLesson({ day: 4, module: pilot.m, unitQuestions: pilot.questions, history: hist, seed: "a", now: NOW }).steps.filter((s) => s.t === "arrange").length;
    expect(n(weak)).toBeGreaterThan(n(strong));
  });

  it("ôn ngắt quãng: từ trả lời sai được ôn trước, từ vừa ôn đúng chưa đến hạn", () => {
    const hist = [
      h({ t: "recall_word", ref: "v01", correct: false, at: at(2) }),
      h({ t: "recall_word", ref: "v02", correct: true, at: at(0.1) }),
    ];
    const due = dueVocab(vocabStates(hist), NOW, 5);
    expect(due).toContain("v01");
    expect(due).not.toContain("v02");
  });

  it("Error Memory: lỗi lặp lại từ 2 lần trở lên có phần ôn riêng", () => {
    const hist = [h({ t: "speak", ref: "q01", errorTags: ["modal_verb"] }), h({ t: "speak", ref: "q02", errorTags: ["modal_verb"] })];
    expect(errorCounts(hist).get("modal_verb")).toBe(2);
    const l = buildLesson({ day: 5, module: pilot.m, unitQuestions: pilot.questions, history: hist, seed: "a", now: NOW });
    expect(l.steps.some((s) => s.t === "card" && s.ref === "err:modal_verb")).toBe(true);
    expect(l.steps.some((s) => s.t === "quiz" && s.set === "review" && s.ref.startsWith("g03."))).toBe(true);
  });

  it("Speed Q&A: mục tiêu riêng khoảng 85% thời gian thường ngày, chỉ nhanh thêm khi đã đạt đều", () => {
    const slow = [6, 7, 7, 8].map((s, i) => h({ day: 6, t: "speak", ref: `q0${i}`, thinkMs: s * 1000 }));
    expect(speedTarget(slow, 1).ms).toBe(6000);
    expect(speedTarget([], 1).ms).toBe(5000);
    const day9 = (hit: boolean) => [0, 1, 2, 3].map((i) => h({ day: 9, t: "speak", ref: `q1${i}`, targetMs: 6000, inTarget: hit || i === 0 }));
    expect(speedTarget([...slow, ...day9(true)], 2).ms).toBe(5000);
    expect(speedTarget([...slow, ...day9(false)], 2).ms).toBe(6000);
  });

  it("ngày tiếp theo mở theo thứ tự", () => {
    expect(nextOpenDay([])).toBe(1);
    expect(nextOpenDay([1, 2])).toBe(3);
    expect(nextOpenDay(Array.from({ length: 14 }, (_, i) => i + 1))).toBeNull();
  });
});

describe("đo trực tiếp và kiểm tra bằng quy tắc", () => {
  it("thời gian bắt đầu nói bỏ qua uh/um, đếm chỗ ngừng dài, máy nghe kém thì xin nói lại", () => {
    const w = (word: string, start: number, end: number, confidence = 0.95) => ({ word, start, end, confidence });
    const m = speechMeasures([w("um", 0.2, 0.5), w("i", 1.0, 1.1), w("recycle", 1.1, 1.6), w("bottles", 3.5, 4.0)], "um I recycle bottles", 300, null);
    expect(m.thinkMs).toBe(1300);
    expect(m.longPauses).toBe(1);
    expect(m.unclear).toBe(false);
    const bad = speechMeasures([w("i", 1, 1.1, 0.3), w("cycle", 1.1, 1.5, 0.4)], "I cycle", 0, null);
    expect(bad.unclear).toBe(true);
  });

  it("nói theo: tính tỷ lệ từ máy nghe ra", () => {
    expect(heardRatio("a truck blocked the way to the club", "A truck blocked the way to the club.")).toBe(1);
    expect(heardRatio("a truck", "A truck blocked the way to the club.")).toBeLessThan(0.5);
  });

  it("yêu cầu roleplay: lý do, ví dụ, đề xuất, từ của bài", () => {
    const turns = ["I think we should plant trees", "because trees give us oxygen", "for example near the gate"];
    expect(requirementMet({ kind: "suggestion", vi: "", words: [] }, turns)).toBe(true);
    expect(requirementMet({ kind: "reason", vi: "", words: [] }, turns)).toBe(true);
    expect(requirementMet({ kind: "example", vi: "", words: [] }, turns)).toBe(true);
    expect(requirementMet({ kind: "keyword", vi: "", words: ["recycle"] }, turns)).toBe(false);
  });
});

describe("AI nhận xét và AI đóng vai", () => {
  it("bỏ lỗi AI bịa (không trích đúng lời học sinh), giữ nhãn lỗi thật", () => {
    const t = "She recycle bottles every day because it helps.";
    const v = verifyAssessment(mockAssessment(t), t);
    expect(v.grammar.issues.length).toBe(1);
    expect(v.dropped_issues).toBe(1);
    expect(v.grammar.issues[0].tag).toBe("third_person_s");
  });

  it("câu trả lời quá dài hoặc trống thì dùng câu dự phòng; AI nêu ý kiến khác ở giữa cuộc trò chuyện", () => {
    expect(verifyReply("Nice idea! Why do you think so?")).toBe("Nice idea! Why do you think so?");
    expect(verifyReply("word ".repeat(80))).toBeNull();
    const r = pilot.m.roleplays.find((x) => x.level === "advanced")!;
    expect(fallbackLine(r, 1)).toBe(r.fallback[0]);
    expect(fallbackLine(r, 99)).toBe(r.fallback.at(-1));
    expect(stanceTurn(r)).toBeGreaterThan(0);
    expect(stanceTurn(r)).toBeLessThan(r.turns);
  });
});

describe("báo cáo so sánh đầu và cuối module", () => {
  it("chưa có bài cuối thì không so sánh; có đủ thì tính theo từng tiêu chí, không có điểm tổng", () => {
    const entry = [
      { day: 1, t: "speak" as const, ref: "i01", attemptNo: 1, set: null, area: null, correct: null, test: true, measures: { words: 4, thinkMs: 6000, clarity: 0.9 }, check: { reason: "not_required" as const }, ai: null },
      { day: 1, t: "quiz" as const, ref: "v01", attemptNo: 1, set: "entry" as const, area: "vocab" as const, correct: false, test: true, measures: null, check: null, ai: null },
    ];
    const r1 = moduleReport(pilot.m, entry);
    expect(r1.speaking.entry?.answers).toBe(1);
    expect(r1.speaking.final).toBeNull();
    const final = [
      { ...entry[0], day: 13, ref: "i04", measures: { words: 12, thinkMs: 3000, clarity: 0.95 } },
      { ...entry[1], day: 14, set: "final" as const, correct: true },
    ];
    const r2 = moduleReport(pilot.m, [...entry, ...final]);
    expect(r2.speaking.final?.medianThinkMs).toBe(3000);
    expect(r2.knowledge.final?.correct).toBe(1);
    expect(JSON.stringify(r2)).not.toMatch(/score|overall|total_score/i);
  });
});

describe("lộ trình đúng 5 giai đoạn, có kiểm tra cuối giai đoạn và câu hỏi nhắc lại", () => {
  const base = { unitQuestions: pilot.questions, seed: "hs1", now: NOW };
  it("Phase 2 là ngày 4–6, Phase 3 là ngày 7–10; mỗi ngày có mục tiêu và tiêu chí hoàn thành", () => {
    expect(PHASES.map((p) => [...p.days])).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9, 10], [11, 12], [13, 14]]);
    for (let d = 1; d <= DAYS; d++) expect(DAY_INFO[d].goalVi.length * DAY_INFO[d].doneVi.length).toBeGreaterThan(0);
  });
  it("mọi module: ngày 10 và 12 có câu kiểm tra không gợi ý và báo cáo cuối giai đoạn, không trùng câu trong bài", () => {
    for (const x of modules) {
      for (const [day, ref] of [[10, "check3"], [12, "check4"]] as const) {
        const l = buildLesson({ ...base, day, module: x.m, unitQuestions: x.questions, history: [] });
        const tests = l.steps.filter((s) => s.t === "speak" && s.test);
        expect(tests.length, x.file).toBeGreaterThan(0);
        for (const s of tests) if (s.t === "speak") expect(s.hints).toEqual([]);
        expect(l.steps.at(-1)).toMatchObject({ t: "report", ref });
        const refs = l.steps.filter((s) => s.t === "speak").map((s) => s.ref);
        expect(new Set(refs).size, x.file).toBe(refs.length);
      }
    }
  });
  it("ngày 13 hỏi lại không gợi ý câu đã luyện có gợi ý ở ngày 6", () => {
    const q = pilot.questions.slice(0, 3);
    const history = q.map((x, i) => h({ day: 6, t: "speak", ref: x.key, at: at(8 - i) }));
    const l = buildLesson({ ...base, day: 13, module: pilot.m, history });
    const again = l.steps.filter((s) => s.t === "speak" && (s.ref === q[0].key || s.ref === q[1].key));
    expect(again).toHaveLength(2);
    for (const s of again) if (s.t === "speak") expect([s.hints, s.test]).toEqual([[], true]);
  });
  it("kiểm tra cuối giai đoạn: Đạt / Chưa đạt / Chưa làm theo số liệu thật; câu nhắc lại không tính là câu mới", () => {
    const quiz = (day: number, set: "check1" | "check2", correct: boolean, i: number) => ({ day, t: "quiz" as const, ref: "q" + i, attemptNo: 1, set, area: "vocab" as const, correct, test: true, measures: null, check: null, ai: null });
    const speak = (day: number, ref: string, test: boolean, thinkMs: number, inTarget: boolean | null = null) => ({ day, t: "speak" as const, ref, attemptNo: 1, set: null, area: null, correct: null, test, inTarget, measures: { words: 8, thinkMs, clarity: 0.9 }, check: null, ai: null });
    const r0 = moduleReport(pilot.m, []);
    expect(r0.checkpoints.map((c) => c.status)).toEqual(["pending", "pending", "pending", "pending"]);
    const attempts = [
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => quiz(3, "check1", i < 7, i)), // 7/8 = 88% → đạt
      ...[0, 1, 2, 3].map((i) => quiz(7, "check2", i < 2, i)), // 2/4 = 50% → chưa đạt
      speak(6, "q01", false, 6000),
      speak(10, "x01.4", true, 3000, true),
      speak(10, "x02.4", true, 5000, false),
      speak(13, "q01", true, 4000),
      speak(13, "q09", true, 3500),
    ];
    const r = moduleReport(pilot.m, attempts);
    expect(r.checkpoints.map((c) => c.status)).toEqual(["met", "not_met", "not_met", "pending"]); // 1/2 kịp giờ < 60%
    expect(r.delayed.pairs).toEqual([{ ref: "q01", before: { day: 6, thinkMs: 6000, words: 8 }, after: { thinkMs: 4000, words: 8 } }]);
    expect(r.transfer.fresh?.answers).toBe(1);
  });
});

describe("từ máy nghe chưa rõ (thay cho chấm phát âm)", () => {
  it("ghi các từ độ tin cậy thấp (bỏ uh/um, không trùng) và các từ của câu mẫu máy không nghe thấy", () => {
    const w = (word: string, confidence: number, i: number) => ({ word, start: i * 0.4, end: i * 0.4 + 0.3, confidence });
    const m = speechMeasures([w("um", 0.2, 0), w("we", 0.95, 1), w("should", 0.6, 2), w("protect", 0.5, 3), w("protect", 0.4, 4), w("forests", 0.9, 5)], "um we should protect protect forests", 0, null);
    expect(m.lowWords).toEqual(["should", "protect"]);
    expect(missedWords("we should project the forest", "We should protect the forests.")).toEqual(["protect"]);
  });
});
