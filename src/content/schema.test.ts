import { describe, expect, it } from "vitest";
import { collectSpeakables, unitSchema, type Unit } from "./schema";
import { UNITS } from "./units";
import g8u01 from "./units/g8/u01-leisure-time.json";

function clone(): Unit {
  return structuredClone(g8u01) as Unit;
}

function issues(data: unknown): string[] {
  const result = unitSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((i) => i.message);
}

describe("registered units", () => {
  it.each(UNITS.map((u) => [u.id, u] as const))("%s is valid", (_id, unit) => {
    expect(issues(unit)).toEqual([]);
  });
});

describe("unit rules", () => {
  it("rejects a sample answer that does not match its keywords", () => {
    const unit = clone();
    unit.speed[0].samples.push("Maybe later.");
    expect(issues(unit)).toContain('câu mẫu không khớp từ khóa: "Maybe later."');
  });

  it("requires `say` for abbreviations so the voice reads them right", () => {
    const unit = clone();
    unit.vocabulary[0].example = "I watch TV every evening.";
    expect(issues(unit)).toContain('có chữ viết tắt, cần thêm cách đọc (say): "I watch TV every evening."');
  });

  it("rejects duplicate ids", () => {
    const unit = clone();
    unit.frames[1].id = unit.frames[0].id;
    expect(issues(unit)).toContain(`id bị trùng: ${unit.frames[0].id}`);
  });

  it("rejects pages outside the unit", () => {
    const unit = clone();
    unit.speed[0].page = 30;
    expect(issues(unit)).toContain("trang 30 nằm ngoài Unit (8-17)");
  });

  it("needs a teacher note when a roleplay goes beyond the book", () => {
    const unit = clone();
    delete unit.roleplays[1].beyondBookNoteVi;
    expect(issues(unit)).toContain("phần ngoài sách cần ghi chú cho giáo viên");
  });
});

describe("collectSpeakables", () => {
  it("lists what the TTS voice must read, using `say` when given", () => {
    const unit = UNITS[0];
    const speakables = collectSpeakables(unit);
    const diy = speakables.find((s) => s.ref === "vocabulary.v-diy.text");
    expect(diy).toEqual({ ref: "vocabulary.v-diy.text", text: "DIY", say: "D I Y" });
    expect(speakables.find((s) => s.ref === "speed.s-like-cooking.question")?.say).toBe("Do you like cooking?");
    expect(new Set(speakables.map((s) => s.ref)).size).toBe(speakables.length);
  });
});
