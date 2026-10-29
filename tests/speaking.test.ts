import { describe, expect, it } from "vitest";
import { pickQuestions, type Candidate } from "@/lib/speaking/select";
import { buildHints, nextHintLevel } from "@/lib/speaking/hints";
import { countWords, detectOnsetMs, shouldAutoStop } from "@/lib/speaking/onset";

const qs: Candidate[] = [
  ...Array.from({ length: 4 }, (_, i) => ({ id: `e${i}`, difficulty: 1 as const })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, difficulty: 2 as const })),
  ...Array.from({ length: 5 }, (_, i) => ({ id: `h${i}`, difficulty: 3 as const })),
];

describe("chọn câu hỏi", () => {
  it("lấy 5 câu khác nhau theo tỉ lệ 2 dễ, 2 vừa, 1 khó, sắp tăng dần", () => {
    const r = pickQuestions(qs, new Map(), 42);
    expect(r).toHaveLength(5);
    expect(new Set(r.map((q) => q.id)).size).toBe(5);
    expect(r.map((q) => q.difficulty)).toEqual([1, 1, 2, 2, 3]);
  });
  it("ưu tiên câu chưa trả lời", () => {
    const answered = new Map(["e0", "e1", "e2"].map((id) => [id, 1]));
    const r = pickQuestions(qs, answered, 1);
    const easy = r.filter((q) => q.difficulty === 1).map((q) => q.id);
    expect(easy).toContain("e3");
    expect(easy.filter((id) => answered.has(id))).toHaveLength(1);
  });
  it("cùng hạt giống thì cùng kết quả", () => {
    expect(pickQuestions(qs, new Map(), 7)).toEqual(pickQuestions(qs, new Map(), 7));
  });
  it("Unit thiếu câu khó thì lấy bù câu khác, vẫn đủ 5", () => {
    const r = pickQuestions(qs.filter((q) => q.difficulty !== 3), new Map(), 3);
    expect(r).toHaveLength(5);
  });
});

describe("gợi ý 4 mức", () => {
  const src = {
    hintDirectionVi: "Nghĩ về thói quen.",
    keywords: ["a", "b"],
    frame: { text: "I like ___.", vi: "Mình thích ..." },
    exampleAnswer: "I like reading.",
  };
  it("đủ 4 mức theo đúng thứ tự", () => {
    expect(buildHints(src).map((h) => h.level)).toEqual([1, 2, 3, 4]);
  });
  it("không có khung câu thì bỏ mức 3", () => {
    expect(buildHints({ ...src, frame: null }).map((h) => h.level)).toEqual([1, 2, 4]);
  });
  it("mức đã dùng không giảm khi đóng gợi ý", () => {
    expect(nextHintLevel(3, 1)).toBe(3);
    expect(nextHintLevel(1, 2)).toBe(2);
    expect(nextHintLevel(0, 9)).toBe(4);
  });
});

describe("phát hiện bắt đầu nói (ước lượng)", () => {
  const opts = { frameMs: 50, calibrationMs: 300, minSpeechMs: 150, floor: 0.02 };
  const silence = (n: number, v = 0.005) => Array(n).fill(v);
  const speech = (n: number, v = 0.2) => Array(n).fill(v);

  it("tìm đúng mốc bắt đầu nói sau 2 giây im lặng", () => {
    expect(detectOnsetMs([...silence(40), ...speech(20)], opts)).toBe(2000);
  });
  it("tiếng động ngắn (100ms) không bị tính là nói", () => {
    expect(detectOnsetMs([...silence(20), ...speech(2), ...silence(20)], opts)).toBeNull();
  });
  it("im lặng hoàn toàn thì trả null", () => {
    expect(detectOnsetMs(silence(100), opts)).toBeNull();
  });
  it("phòng ồn: ngưỡng tăng theo nền, không bắt nhầm tiếng ồn đều", () => {
    expect(detectOnsetMs(silence(60, 0.05), opts)).toBeNull();
    expect(detectOnsetMs([...silence(20, 0.05), ...speech(10, 0.3)], opts)).toBe(1000);
  });
  it("tự dừng khi đã nói rồi im lặng đủ lâu, không dừng khi chưa nói", () => {
    const o = { ...opts, silenceStopMs: 2500 };
    expect(shouldAutoStop([...silence(20), ...speech(20), ...silence(50)], o)).toBe(true);
    expect(shouldAutoStop([...silence(20), ...speech(20), ...silence(10)], o)).toBe(false);
    expect(shouldAutoStop(silence(200), o)).toBe(false);
  });
  it("đếm từ tiếng Anh", () => {
    expect(countWords("I don't like it, because it's boring.")).toBe(7);
    expect(countWords("   ")).toBe(0);
  });
});
