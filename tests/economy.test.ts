import { describe, expect, it } from "vitest";
import { COINS, earnedCoins, earnedEvents, lessonXp, roundPassed, XP, type XpEvent } from "@/lib/adventure/game";
import { equippedLook, greeting, spriteFor, MASCOT_STATES, type ShopItem } from "@/lib/adventure/shop";
import { existsSync } from "node:fs";
import { join } from "node:path";

const lesson = (day: number, share?: number) => ({ id: `l${day}`, moduleId: "m1", day, completedAt: `2026-11-0${day}T10:00:00Z`, share });

describe("EXP: việc học thật, không đủ thì không nhận đủ", () => {
  it("bài bỏ qua nhiều bước nhận ít EXP hơn, thấp nhất 30%", () => {
    expect(lessonXp(lesson(2))).toBe(XP.quest);
    expect(lessonXp(lesson(2, 0.5))).toBe(50);
    expect(lessonXp(lesson(2, 0))).toBe(30);
    expect(lessonXp(lesson(3, 1))).toBe(XP.challenge);
  });
  it("mini-game chỉ thưởng khi đúng từ một nửa; bỏ dở không thưởng", () => {
    const r = (correct: number | null, answered = 6) => ({ moduleId: "m1", game: "vocab_match" as const, finishedAt: "2026-11-01T10:00:00Z", answered, total: 6, correct });
    expect([roundPassed(r(2)), roundPassed(r(3)), roundPassed(r(6)), roundPassed(r(6, 5)), roundPassed(r(null))]).toEqual([false, true, true, false, true]);
    // Lượt đầu chưa đạt, lượt sau đạt: vẫn nhận (một lần).
    const ev = earnedEvents([], [r(1), { ...r(4), finishedAt: "2026-11-02T10:00:00Z" }, { ...r(6), finishedAt: "2026-11-03T10:00:00Z" }]);
    expect(ev).toEqual([{ source: "game:m1:vocab_match", kind: "game", xp: XP.game, at: "2026-11-02T10:00:00Z" }]);
  });
});

describe("Lingua Coins: tách khỏi EXP, không trùng, không mua EXP", () => {
  const events: XpEvent[] = [
    { source: "lesson:a", kind: "quest", xp: 100, at: "2026-11-01T10:00:00Z" },
    { source: "lesson:b", kind: "quest", xp: 150, at: "2026-11-02T10:00:00Z" },
    { source: "lesson:c", kind: "quest", xp: 50, at: "2026-11-03T10:00:00Z" },
    { source: "game:m1:vocab_match", kind: "game", xp: 40, at: "2026-11-03T11:00:00Z" },
    { source: "daily:2026-11-03", kind: "daily", xp: 30, at: "2026-11-03T12:00:00Z" },
  ];
  const coins = earnedCoins(events, 370, [{ key: "first_quest", at: "2026-11-01T10:00:00Z" }]);
  it("cùng khóa nguồn với EXP, mỗi khóa một lần", () => {
    expect(new Set(coins.map((c) => c.source)).size).toBe(coins.length);
    const by = Object.fromEntries(coins.map((c) => [c.source, c.delta]));
    expect(by["lesson:a"]).toBe(COINS.quest);
    expect(by["lesson:b"]).toBe(COINS.challenge);
    expect(by["lesson:c"]).toBe(5); // bài làm một nửa: một nửa LC
    expect(by["game:m1:vocab_match"]).toBe(COINS.game);
    expect(by["daily:2026-11-03"]).toBe(COINS.daily);
    expect(by["level:2"]).toBe(COINS.level); // 370 EXP: cấp 2
    expect(by["level:3"]).toBeUndefined();
    expect(by["ach:first_quest"]).toBe(COINS.achievement);
  });
  it("chỉ cộng, không có khoản âm (tiêu chỉ qua hàm mua trong CSDL)", () => {
    expect(coins.every((c) => c.delta > 0)).toBe(true);
  });
});

describe("Linguine và cửa hàng", () => {
  const items: ShopItem[] = [
    { key: "bg_night", slot: "background", nameVi: "Đêm sao", descriptionVi: "", price: 90, sort: 1 },
    { key: "skin_sailor", slot: "skin", nameVi: "Thủy thủ", descriptionVi: "", price: 150, sort: 2 },
  ];
  it("chỉ mặc được đồ đã sở hữu, đúng ô", () => {
    expect(equippedLook({ m_background: "bg_night", m_skin: "skin_winter", m_effect: "bg_night" }, items)).toEqual({ skin: null, accessory: null, background: "bg_night", effect: null });
  });
  it("trang phục chỉ đổi tư thế đứng yên và vẫy tay; mọi tư thế có ảnh thật", () => {
    const look = { skin: "skin_sailor", accessory: null, background: null, effect: null };
    expect(spriteFor("idle", look)).toBe("/penguin/skins/skin_sailor.png");
    expect(spriteFor("listening", look)).toBe("/penguin/states/listening.png");
    for (const s of MASCOT_STATES) expect(existsSync(join(process.cwd(), "public", spriteFor(s, { skin: null, accessory: null, background: null, effect: null })))).toBe(true);
    for (const k of ["skin_winter", "skin_sailor", "skin_scholar"]) expect(existsSync(join(process.cwd(), "public/penguin/skins", `${k}.png`))).toBe(true);
    for (const k of ["acc_book", "acc_balloon", "acc_plant", "acc_cocoa", "acc_guitar"]) expect(existsSync(join(process.cwd(), "public/penguin/accessories", `${k}.png`))).toBe(true);
  });
  it("lời chào theo việc học thật, không thúc ép khi đã học hôm nay", () => {
    expect(greeting({ name: "An", hour: 8, nextVi: "ngày 3", doneToday: false })).toMatchObject({ state: "waving" });
    const done = greeting({ name: "An", hour: 20, nextVi: "ngày 3", doneToday: true });
    expect(done.state).toBe("happy");
    expect(done.textVi).toContain("nghỉ ngơi");
  });
});
