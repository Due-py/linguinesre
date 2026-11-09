import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleSchema, type ModuleContent } from "@/lib/module/schema";
import { PHASES } from "@/lib/module/plan";
import {
  COSMETICS,
  earnedAchievements,
  earnedEvents,
  equipped,
  levelOf,
  questXp,
  unlocked,
  xpForLevel,
  XP,
  type AchievementInput,
  type CompletedLesson,
} from "@/lib/adventure/game";
import { dailyChallenge, recommend, skillResults, type SkillAttempt } from "@/lib/adventure/skills";
import { buildItems, checkItem, ITEM_COUNT } from "@/lib/adventure/minigames";
import { GAMES, nodeStates, worldNodes } from "@/lib/adventure/world";

const lesson = (day: number, at: string, moduleId = "m1"): CompletedLesson => ({ id: `l${moduleId}${day}`, moduleId, day, completedAt: at });

describe("tiến trình trò chơi: XP", () => {
  it("XP chỉ đến từ bài đã xong và lần ĐẦU xong mỗi mini-game ở mỗi Unit (không cày được)", () => {
    const ev = earnedEvents(
      [lesson(1, "2026-11-01T10:00:00Z"), lesson(3, "2026-11-02T10:00:00Z")],
      [
        { moduleId: "m1", game: "vocab_match", finishedAt: "2026-11-01T11:00:00Z", answered: 6, total: 6 },
        { moduleId: "m1", game: "vocab_match", finishedAt: "2026-11-01T12:00:00Z", answered: 6, total: 6 }, // chơi lại: 0 XP
        { moduleId: "m2", game: "vocab_match", finishedAt: "2026-11-01T13:00:00Z", answered: 6, total: 6 }, // Unit khác: có XP
        { moduleId: "m1", game: "grammar_fix", finishedAt: "2026-11-01T14:00:00Z", answered: 3, total: 6 }, // bỏ dở: không XP
      ],
    );
    expect(ev.map((e) => [e.source, e.xp])).toEqual([
      ["lesson:lm11", XP.quest],
      ["lesson:lm13", XP.challenge],
      ["game:m1:vocab_match", XP.game],
      ["game:m2:vocab_match", XP.game],
    ]);
    // Mỗi khóa nguồn duy nhất (CSDL cũng chặn trùng bằng unique).
    expect(new Set(ev.map((e) => e.source)).size).toBe(ev.length);
  });
  it("không có XP âm, không phụ thuộc gợi ý; thử thách cuối giai đoạn nhiều hơn một chút", () => {
    expect(questXp(2)).toBe(100);
    expect([3, 7, 10, 12, 14].map(questXp)).toEqual([150, 150, 150, 150, 150]);
    expect(Object.values(XP).every((x) => x > 0)).toBe(true);
  });
  it("cấp phiêu lưu tăng dần, tính được tiến độ lên cấp", () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 200, 500, 900]);
    expect(levelOf(0)).toMatchObject({ level: 1, into: 0, need: 200 });
    expect(levelOf(650)).toMatchObject({ level: 3, into: 150, need: 400 });
  });
});

describe("tiến trình trò chơi: thành tích và đồ trang trí", () => {
  const base: AchievementInput = { lessons: [], speaks: [], roleplaysDone: 0, activeDates: [], gamesFinished: [], phaseDays: PHASES.map((p) => p.days) };
  it("không có dữ liệu thì không có thành tích nào", () => {
    expect(earnedAchievements(base)).toEqual([]);
  });
  it("thành tích từ việc thật, kèm bằng chứng", () => {
    const speak = (day: number, thinkMs: number, extra: Partial<AchievementInput["speaks"][number]> = {}) => ({
      day,
      moduleId: "m1",
      hintLevel: 0,
      thinkMs,
      words: 12,
      unclear: false,
      keywordsUsed: [],
      test: false,
      at: `2026-11-${String(day).padStart(2, "0")}T10:00:00Z`,
      ...extra,
    });
    const got = earnedAchievements({
      ...base,
      lessons: [1, 2, 3].map((d) => lesson(d, `2026-11-0${d}T10:00:00Z`)),
      speaks: [speak(1, 6000), speak(1, 5000), speak(1, 7000), speak(8, 3000), speak(9, 3500), speak(10, 2500)],
      activeDates: ["2026-11-01", "2026-11-03", "2026-11-05", "2026-11-08", "2026-11-12"],
    }).map((a) => a.key);
    expect(got).toEqual(expect.arrayContaining(["first_quest", "confident_speaker", "quick_thinker", "consistent_learner", "region_explorer"]));
    expect(got).not.toContain("unit_conqueror");
  });
  it("Phản xạ nhanh hơn cần đủ 3 câu mỗi bên và nhanh hơn ít nhất 20%", () => {
    const s = (day: number, ms: number) => ({ day, moduleId: "m1", hintLevel: 0, thinkMs: ms, words: 8, unclear: false, keywordsUsed: [], test: false, at: "2026-11-10T00:00:00Z" });
    const slow = earnedAchievements({ ...base, speaks: [s(1, 5000), s(1, 5000), s(1, 5000), s(8, 4500), s(9, 4500), s(10, 4500)] });
    expect(slow.map((a) => a.key)).not.toContain("quick_thinker");
  });
  it("đồ trang trí chưa mở khóa thì không dùng được (về mặc định)", () => {
    const winter = COSMETICS.find((c) => c.key === "winter")!;
    expect(unlocked(winter, 9, [])).toBe(false);
    expect(equipped({ season: "winter", flag: "red" }, 2, [])).toEqual({ flag: "red", season: "spring", trail: "road" });
  });
});

describe("tiến trình học: kỹ năng tách khỏi XP", () => {
  const a = (x: Partial<SkillAttempt>): SkillAttempt => ({
    moduleId: "m1",
    day: 1,
    kind: "speak",
    turn: 0,
    attemptNo: 1,
    area: null,
    correct: null,
    hintLevel: 0,
    thinkMs: null,
    measures: null,
    check: null,
    errorTags: [],
    at: "2026-11-01T10:00:00Z",
    ...x,
  });
  it("chưa đủ dữ liệu thì không xếp mức (không bịa)", () => {
    const r = skillResults([]);
    expect(r.every((s) => s.band === "none")).toBe(true);
    // Đủ số lượt nhưng chỉ trong một bài: vẫn chưa xếp.
    const one = skillResults(Array.from({ length: 10 }, () => a({ kind: "quiz", area: "vocab", correct: true })));
    expect(one.find((s) => s.skill === "vocabulary")!.band).toBe("none");
  });
  it("mức theo số đo thật qua nhiều bài, có bằng chứng", () => {
    const xs = [
      ...Array.from({ length: 10 }, (_, i) => a({ day: 1 + (i % 2), kind: "quiz", area: "vocab", correct: i < 9 })),
      ...Array.from({ length: 6 }, (_, i) => a({ day: 8 + (i % 2), thinkMs: 2000 + i * 100, measures: { words: 18, wpm: 95, longPauses: 0, unclear: false }, check: { reason: "yes" } })),
    ];
    const r = Object.fromEntries(skillResults(xs).map((s) => [s.skill, s]));
    expect(r.vocabulary.band).toBe("secure");
    expect(r.vocabulary.evidence[0]).toContain("9/10");
    expect(r.speed.band).toBe("secure");
    expect(r.completeness.band).toBe("secure");
    expect(r.fluency.band).toBe("secure");
  });
  it("làm xong bài mà không có số đo nói thì kỹ năng không tăng", () => {
    // Chỉ có các bước đọc thẻ/bỏ qua: không có số đo nào.
    const xs = Array.from({ length: 20 }, (_, i) => a({ day: 1 + (i % 5), kind: "card", correct: null }));
    expect(skillResults(xs).every((s) => s.band === "none")).toBe(true);
  });
  it("gợi ý theo kỹ năng yếu nhất, chỉ mini-game đã mở; chưa đủ dữ liệu thì làm tiếp nhiệm vụ", () => {
    const weak = Array.from({ length: 10 }, (_, i) => a({ day: 1 + (i % 2), kind: "quiz", area: "vocab", correct: i < 3 }));
    expect(recommend(skillResults(weak), ["vocab_match"])[0].action).toEqual({ kind: "game", game: "vocab_match" });
    expect(recommend(skillResults(weak), [])[0].action).toEqual({ kind: "knowledge" });
    expect(recommend(skillResults([]), [])[0].action).toEqual({ kind: "quest" });
  });
  it("thử thách trong ngày cố định trong ngày, không có chuỗi ngày", () => {
    const d1 = dailyChallenge("2026-11-08", [], ["vocab_match", "grammar_fix"]);
    expect(dailyChallenge("2026-11-08", [], ["vocab_match", "grammar_fix"])).toEqual(d1);
    expect(dailyChallenge("2026-11-08", [], []).action).toEqual({ kind: "quest" });
  });
});

describe("bản đồ: trạng thái nút từ tiến độ thật", () => {
  it("xong / hiện tại / khóa; mini-game mở sau nhiệm vụ đứng trước", () => {
    const st = nodeStates(worldNodes(), [1, 2], 3, []);
    expect([st.get("d1"), st.get("d2"), st.get("d3"), st.get("d4")]).toEqual(["done", "done", "current", "locked"]);
    expect(st.get("g-vocab_match")).toBe("available");
    expect(st.get("g-sentence_builder")).toBe("locked");
    expect(nodeStates(worldNodes(), [1, 2], 3, ["vocab_match"]).get("g-vocab_match")).toBe("done");
  });
});

// Mini-game trên MỌI module thật: câu lấy đúng từ nội dung, chấm đúng đáp án gốc.
const modules: [string, ModuleContent][] = [];
for (const g of readdirSync(join(process.cwd(), "content/modules")))
  for (const f of readdirSync(join(process.cwd(), "content/modules", g)).filter((x) => x.endsWith(".json")).slice(0, 3))
    modules.push([`${g}/${f}`, moduleSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "content/modules", g, f), "utf8")))]);

describe("mini-game lấy nội dung thật của Unit", () => {
  it.each(modules)("%s: đủ câu, chấm đúng, trả lời bừa không đúng hết", (_, m) => {
    for (const game of GAMES) {
      const items = buildItems(game, m, "seed-1");
      expect(items.length).toBe(Math.min(ITEM_COUNT[game], items.length));
      expect(items.length).toBeGreaterThanOrEqual(3);
      for (const it of items) {
        expect(new Set(it.options).size).toBe(it.options.length);
        const right = checkItem(game, m, it, null)!;
        expect(right).not.toBeNull();
        // Đáp án đúng nằm trong các lựa chọn và được chấm đúng.
        const ans = right.answer;
        if (Array.isArray(ans)) {
          expect([...ans].sort()).toEqual([...it.options].sort());
          expect(checkItem(game, m, it, ans)!.correct).toBe(true);
          expect(checkItem(game, m, it, it.options)!.correct).toBe(it.options.every((c, i) => c === ans[i]));
        } else {
          expect(it.options).toContain(ans);
          expect(checkItem(game, m, it, ans)!.correct).toBe(true);
          expect(checkItem(game, m, it, it.options.find((o) => o !== ans)!)!.correct).toBe(false);
        }
      }
    }
  });
  it("xếp câu luôn bị xáo (không đúng sẵn), chơi lại khác câu", () => {
    const m = modules[0][1];
    for (const it of buildItems("sentence_builder", m, "x")) expect(checkItem("sentence_builder", m, it, it.options)!.correct).toBe(false);
    expect(buildItems("vocab_match", m, "a").map((i) => i.ref)).not.toEqual(buildItems("vocab_match", m, "b").map((i) => i.ref));
  });
});
