import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { unitSchema } from "@/lib/content/schema";

const root = join(process.cwd(), "content");
const files = readdirSync(root)
  .filter((d) => /^grade-\d+$/.test(d))
  .flatMap((d) => readdirSync(join(root, d)).filter((f) => /^unit-\d{2}\.json$/.test(f)).map((f) => `${d}/${f}`));
const load = (f: string) => JSON.parse(readFileSync(join(root, f), "utf8"));

describe("nội dung các khối lớp", () => {
  it("có ít nhất 3 Unit lớp 8", () => {
    expect(files.filter((f) => f.startsWith("grade-8/")).length).toBeGreaterThanOrEqual(3);
  });
  it.each(files)("%s đúng cấu trúc và đúng tên file", (f) => {
    const r = unitSchema.safeParse(load(f));
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toEqual([]);
    if (r.success) expect(f).toBe(`grade-${r.data.grade}/unit-${String(r.data.unit).padStart(2, "0")}.json`);
  });
});

describe("bộ kiểm tra bắt được lỗi", () => {
  const base = () => load("grade-8/unit-01.json");

  it("câu hỏi trỏ tới khung câu không tồn tại", () => {
    const u = base();
    u.questions[0].frameId = "f99";
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
  it("khung câu thiếu chỗ trống ___", () => {
    const u = base();
    u.frames[0].text = "I like reading.";
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
  it("trùng id câu hỏi", () => {
    const u = base();
    u.questions[1].id = u.questions[0].id;
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
  it("câu ví dụ dài quá 35 từ", () => {
    const u = base();
    u.questions[0].exampleAnswer = Array(40).fill("word").join(" ") + ".";
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
  it("câu hỏi lý do nhưng không đánh dấu expectsReason", () => {
    const u = base();
    const q = u.questions.find((x: { kind: string }) => x.kind === "reason");
    q.expectsReason = false;
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
  it("thiếu hẳn một mức độ khó", () => {
    const u = base();
    for (const q of u.questions) if (q.difficulty === 3) q.difficulty = 2;
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
  it("khối lớp ngoài 6–12", () => {
    const u = base();
    u.grade = 13;
    expect(unitSchema.safeParse(u).success).toBe(false);
  });
});
