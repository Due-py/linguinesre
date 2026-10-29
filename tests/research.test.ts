import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeRl, isFiller, median, RL_LIMIT_MS } from "@/lib/research/latency";
import { codeEmail, normalizeCode } from "@/lib/research/code";
import { formFor, KIND_COUNTS, similarity, testFormSchema } from "@/lib/research/testForm";

const w = (word: string, start: number, end = start + 0.3) => ({ word, start, end });
const BEEP = 450; // hết tiếng bíp ở giây 0,45 của file

describe("thời gian phản xạ (mục 1.4)", () => {
  it("tính từ lúc hết bíp tới từ có nghĩa đầu tiên", () => {
    expect(computeRl([w("i", 1.65), w("like", 1.9)], BEEP)).toEqual({ rlMs: 1200, status: "ok", firstWord: "i" });
  });
  it("bỏ qua âm ngập ngừng uh/um/er/ah/hmm", () => {
    expect(computeRl([w("Um,", 0.8), w("uh", 1.2), w("hmm", 1.5), w("football", 2.45)], BEEP).rlMs).toBe(2000);
    for (const f of ["uh", "um", "er", "ah", "hmm", "Uhm.", "erm"]) expect(isFiller(f)).toBe(true);
  });
  it("'oh' và từ thật không bị coi là ngập ngừng", () => {
    expect(isFiller("oh")).toBe(false);
    expect(isFiller("I")).toBe(false);
  });
  it("không có từ nào hoặc chỉ toàn ngập ngừng thì ghi 10 giây, không trả lời", () => {
    expect(computeRl([], BEEP)).toEqual({ rlMs: RL_LIMIT_MS, status: "no_response", firstWord: null });
    expect(computeRl([w("um", 2), w("uh", 4)], BEEP).status).toBe("no_response");
  });
  it("bắt đầu nói sau 10 giây thì ghi 10 giây, không trả lời", () => {
    expect(computeRl([w("yes", 10.6)], BEEP)).toMatchObject({ rlMs: RL_LIMIT_MS, status: "no_response" });
  });
  it("bỏ đuôi giọng đọc câu hỏi lọt vào micro trước khi hết bíp", () => {
    expect(computeRl([w("time", 0.0, 0.3), w("I", 1.45)], BEEP).rlMs).toBe(1000);
  });
  it("nói chồng lên tiếng bíp thì tính 0, không âm", () => {
    expect(computeRl([w("I", 0.4, 0.6)], BEEP).rlMs).toBe(0);
  });
  it("trung vị của một học sinh", () => {
    expect(median([3000, 1000, 2000])).toBe(2000);
    expect(median([1000, 2000, 3000, 10000])).toBe(2500);
    expect(median([])).toBeNull();
  });
});

describe("mã học sinh", () => {
  it("chuẩn hóa cách gõ khác nhau", () => {
    expect(normalizeCode("hs 008")).toBe("HS008");
    expect(normalizeCode("Hs-0120")).toBe("HS0120");
    expect(normalizeCode("HS8")).toBeNull();
    expect(normalizeCode("H5008")).toBeNull();
  });
  it("địa chỉ nội bộ không nhận thư, không chứa tên", () => {
    expect(codeEmail("HS008")).toBe("hs008@hocsinh.lingua-reflex.invalid");
  });
});

describe("đề kiểm tra lớp 8 (mục 3.5)", () => {
  const form = testFormSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "content/tests/grade-8.json"), "utf8")));
  it("đúng cấu trúc: 15 câu, 6 cá nhân, 6 lý do, 3 tình huống, 2 câu làm mẫu", () => {
    expect(form.pairs).toHaveLength(15);
    expect(form.warmup).toHaveLength(2);
    for (const [k, n] of Object.entries(KIND_COUNTS)) expect(form.pairs.filter((p) => p.kind === k)).toHaveLength(n);
  });
  it("mỗi Unit có cùng số câu ở hai đề (đề A và B cân bằng)", () => {
    for (const u of form.units) expect(form.pairs.filter((p) => p.unit === u).length).toBe(5);
  });
  it("KHÔNG câu nào của đề trùng hoặc gần trùng câu trong ngân hàng câu luyện", () => {
    const dir = join(process.cwd(), "content/grade-8");
    const bank = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .flatMap((f) => (JSON.parse(readFileSync(join(dir, f), "utf8")).questions as { text: string }[]).map((q) => q.text));
    const test = [...form.warmup, ...form.pairs.flatMap((p) => [p.A, p.B])];
    const close = test.flatMap((t) => bank.filter((b) => similarity(t, b) >= 0.6).map((b) => `${t} ~ ${b}`));
    expect(close).toEqual([]);
  });
  it("thứ tự đề AB: đầu vào A, đầu ra B; BA ngược lại", () => {
    expect([formFor("AB", "pre"), formFor("AB", "post"), formFor("BA", "pre"), formFor("BA", "post")]).toEqual(["A", "B", "B", "A"]);
  });
});
