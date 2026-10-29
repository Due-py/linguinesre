import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { modeContentSchema } from "@/lib/research/modeContent";
import {
  blankOut,
  buildPlanA,
  buildPlanB,
  checkTurn,
  frameCoverage,
  planDone,
  READ_ROUNDS,
  rotate,
  speedLevel,
  unitForSession,
  vnDay,
  vnWeekStart,
  type UnitData,
} from "@/lib/research/modes";
import { similarity, testFormSchema } from "@/lib/research/testForm";
import { unitSchema } from "@/lib/content/schema";

const read = (p: string) => JSON.parse(readFileSync(join(process.cwd(), p), "utf8"));
const content = modeContentSchema.parse(read("content/research/grade-8-modes.json"));

/** Unit luyện tập dạng giống dữ liệu đọc từ CSDL (để lập kế hoạch buổi y như trên máy chủ). */
function unitData(n: number): UnitData {
  const u = unitSchema.parse(read(`content/grade-8/unit-${String(n).padStart(2, "0")}.json`));
  return {
    unitNo: u.unit,
    title: u.title,
    vocab: u.vocab.map((v) => ({ key: v.id, en: v.en, vi: v.vi, example: v.example })),
    frames: u.frames.map((f) => ({ key: f.id, text: f.text, vi: f.vi, examples: f.examples })),
    questions: u.questions.map((q) => ({
      id: q.id,
      key: q.id,
      text: q.text,
      difficulty: q.difficulty,
      kind: q.kind,
      keywords: q.keywords,
      frameKey: q.frameId,
      hintDirectionVi: q.hintDirectionVi,
      exampleAnswer: q.exampleAnswer,
      expectsReason: q.expectsReason,
    })),
  };
}
const extras = (n: number) => content.units.find((u) => u.unit === n)!;

describe("nội dung hai chế độ lớp 8", () => {
  it("có đủ Unit 1–6", () => {
    expect(content.units.map((u) => u.unit).sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it("lời trong hội thoại và đề nói KHÔNG gần câu nào của đề kiểm tra", () => {
    const form = testFormSchema.parse(read("content/tests/grade-8.json"));
    const test = [...form.warmup, ...form.pairs.flatMap((p) => [p.A, p.B])];
    const prompts = content.units.flatMap((u) => [...u.roleplays.flatMap((r) => r.turns.map((t) => t.prompt)), ...u.talks.map((t) => t.prompt)]);
    const close = test.flatMap((t) => prompts.filter((p) => similarity(t, p) >= 0.6).map((p) => `${t} ~ ${p}`));
    expect(close).toEqual([]);
  });
});

describe("Speed Q&A: 5 → 3 → 1,5 giây", () => {
  const hit = (limitMs: number) => ({ limitMs, inLimit: true });
  const miss = (limitMs: number) => ({ limitMs, inLimit: false });
  it("bắt đầu ở 5 giây", () => expect(speedLevel([])).toBe(5000));
  it("kịp 3 lượt liền thì lên mức nhanh hơn", () => {
    expect(speedLevel([hit(5000), hit(5000)])).toBe(5000);
    expect(speedLevel([hit(5000), hit(5000), hit(5000)])).toBe(3000);
    expect(speedLevel([hit(5000), hit(5000), hit(5000), hit(3000), hit(3000), hit(3000)])).toBe(1500);
  });
  it("không vượt quá 1,5 giây", () => {
    const h = [...Array(3)].map(() => hit(5000)).concat([...Array(3)].map(() => hit(3000)), [...Array(6)].map(() => hit(1500)));
    expect(speedLevel(h)).toBe(1500);
  });
  it("trễ 2 lượt liền thì lùi về mức chậm hơn; một lượt kịp xen giữa thì đếm lại", () => {
    const up = [hit(5000), hit(5000), hit(5000)];
    expect(speedLevel([...up, miss(3000), miss(3000)])).toBe(5000);
    expect(speedLevel([...up, miss(3000), hit(3000), miss(3000)])).toBe(3000);
  });
  it("không lùi dưới 5 giây; lượt không đo được thì bỏ qua", () => {
    expect(speedLevel([miss(5000), miss(5000), miss(5000)])).toBe(5000);
    expect(speedLevel([hit(5000), { limitMs: 5000, inLimit: null }, hit(5000), hit(5000)])).toBe(3000);
  });
});

describe("Unit của từng buổi, ngày và tuần theo giờ Việt Nam", () => {
  it("mỗi Unit 5 buổi, theo thứ tự, hết thì quay lại", () => {
    expect([1, 5, 6, 10, 11, 15, 16].map((n) => unitForSession(n, [1, 2, 3]))).toEqual([1, 1, 2, 2, 3, 3, 1]);
  });
  it("23:30 giờ Việt Nam vẫn là cùng ngày (không lệch sang UTC)", () => {
    expect(vnDay(new Date("2026-11-09T16:30:00Z"))).toBe("2026-11-09");
    expect(vnDay(new Date("2026-11-09T17:30:00Z"))).toBe("2026-11-10");
  });
  it("tuần bắt đầu thứ Hai", () => {
    expect(vnWeekStart(new Date("2026-11-09T02:00:00Z"))).toBe("2026-11-09"); // thứ Hai
    expect(vnWeekStart(new Date("2026-11-15T10:00:00Z"))).toBe("2026-11-09"); // Chủ nhật
    expect(vnWeekStart(new Date("2026-11-15T18:00:00Z"))).toBe("2026-11-16"); // đã sang thứ Hai giờ VN
  });
  it("lấy vòng tròn", () => expect(rotate([1, 2, 3, 4], 3, 3)).toEqual([4, 1, 2]));
});

describe("kế hoạch buổi chế độ A", () => {
  const plan = buildPlanA(1, unitData(1), extras(1));
  it("đi đúng thứ tự tầng L0 → L1 → L2 → L3", () => {
    const order = plan.steps.map((s) => s.layer);
    expect(order).toEqual([...order].sort());
    expect(new Set(order)).toEqual(new Set(["L0", "L1", "L2", "L3"]));
  });
  it("đủ các hoạt động: từ vựng, khung câu, Speed Q&A, mở rộng, hội thoại, nói đoạn", () => {
    const count = (a: string) => plan.steps.filter((s) => s.activity === a).length;
    expect([count("vocab"), count("frame"), count("speed"), count("expand"), count("roleplay"), count("talk")]).toEqual([6, 3, 6, 3, 4, 1]);
  });
  it("Speed Q&A dùng câu dễ/vừa, có giới hạn; câu mở rộng đòi lý do; không câu nào lặp", () => {
    const refs = plan.steps.filter((s) => s.activity === "speed" || s.activity === "expand").map((s) => s.ref);
    expect(new Set(refs).size).toBe(refs.length);
    expect(plan.steps.filter((s) => s.activity === "speed").every((s) => s.timed && s.say)).toBe(true);
    expect(plan.steps.filter((s) => s.activity === "expand").every((s) => s.expectsReason)).toBe(true);
  });
  it("các buổi trong cùng Unit xoay vòng nội dung", () => {
    const a = buildPlanA(1, unitData(1), extras(1));
    const b = buildPlanA(2, unitData(1), extras(1));
    expect(a.steps.filter((s) => s.activity === "vocab").map((s) => s.ref)).not.toEqual(b.steps.filter((s) => s.activity === "vocab").map((s) => s.ref));
    expect(a.steps.find((s) => s.activity === "roleplay")!.ref).not.toBe(b.steps.find((s) => s.activity === "roleplay")!.ref);
  });
  it("lập được kế hoạch cho cả 6 Unit, 5 buổi mỗi Unit", () => {
    for (let n = 1; n <= 6; n++) for (let s = 1; s <= 5; s++) expect(buildPlanA(s, unitData(n), extras(n)).steps.length).toBeGreaterThanOrEqual(20);
  });
  it("gợi ý xếp từ nhẹ đến mạnh (Rescue Cascade)", () => {
    for (const s of plan.steps) {
      const lv = s.hints.map((h) => h.level);
      expect(lv).toEqual([...lv].sort());
    }
  });
});

describe("kế hoạch buổi chế độ B", () => {
  const plan = buildPlanB(2, 1, "Leisure Time", extras(1));
  it("đọc hết các bài của Unit, mỗi bài 2 lần liền nhau", () => {
    expect(plan.steps).toHaveLength(extras(1).reading.length * READ_ROUNDS);
    expect(plan.steps.every((s) => s.activity === "read_aloud" && s.layer === null)).toBe(true);
    expect(plan.steps[0].reading!.title).toBe(plan.steps[1].reading!.title);
    expect(plan.steps.map((s) => s.reading!.round)).toEqual([1, 2, 1, 2, 1, 2, 1, 2]);
  });
  it("buổi xong khi mọi bước đã có lượt lưu", () => {
    expect(planDone(plan, new Set([0, 1, 2]))).toBe(false);
    expect(planDone(plan, new Set(plan.steps.map((s) => s.step)))).toBe(true);
  });
});

describe("chấm nhanh từng lượt (quy tắc)", () => {
  it("L0: nói đúng từ (chấp nhận biến đổi đuôi)", () => {
    const st = { activity: "vocab" as const, model: "hang out with friends", prompt: "đi chơi với bạn bè" };
    expect(checkTurn(st, "Hang out with friends").target).toBe(true);
    expect(checkTurn(st, "I like hanging out with friends").target).toBe(true);
    expect(checkTurn(st, "go cycling").target).toBe(false);
  });
  it("L1: phải dùng phần lớn khung câu và điền thêm ý", () => {
    const frame = "In my free time, I like ___ because ___.";
    expect(frameCoverage("In my free time I like reading because it is fun", frame)).toBe(1);
    expect(checkTurn({ activity: "frame", prompt: frame }, "In my free time I like reading because it is fun").target).toBe(true);
    expect(checkTurn({ activity: "frame", prompt: frame }, "reading").target).toBe(false);
  });
  it("L2: có lý do; từ khóa đã dùng", () => {
    const st = { activity: "expand" as const, prompt: "Why?", keywords: ["relaxed", "creativity"], expectsReason: true };
    const c = checkTurn(st, "I enjoy drawing because it makes me relaxed");
    expect(c.reason).toBe(true);
    expect(c.keywordsUsed).toEqual(["relaxed"]);
  });
  it("ẩn từ cần nhớ trong câu ví dụ", () => {
    expect(blankOut("On Saturdays I often hang out with friends at the park.", "hang out with friends")).toBe("On Saturdays I often ___ at the park.");
  });
});
