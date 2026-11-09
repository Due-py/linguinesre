import { describe, expect, it } from "vitest";
import { matchReference, type AsrWordC } from "@/lib/module/measure";
import { offTarget, reconcile, type PronResult } from "@/lib/speaking/pron";
import { cropWav, encodeWav } from "@/lib/speaking/wav";

const w = (word: string, start: number, confidence = 0.95): AsrWordC => ({ word, start, end: start + 0.4, confidence });

describe("đối chiếu câu mẫu với lời máy chép lời nghe được", () => {
  it("tìm đúng đoạn em đọc câu mẫu, bỏ phần nói thêm", () => {
    const r = matchReference([w("um", 0.2), w("okay", 0.5), w("the", 1.2), w("woman", 1.6), w("put", 2.0), w("a", 2.3), w("good", 2.5), w("cookbook", 2.9), w("thanks", 4.5)], "The woman put a good cookbook.");
    expect(r.start).toBe(1.2);
    expect(r.end).toBeCloseTo(3.3);
    expect(r.words.every((x) => x.conf !== null)).toBe(true);
  });
  it("từ máy không nghe thấy có conf null; đọc lặp thì lấy lần cuối", () => {
    const r = matchReference([w("crazy", 0.5), w("crazy", 2.0, 0.7)], "crazy");
    expect(r.start).toBe(2.0);
    expect(r.words).toEqual([{ word: "crazy", conf: 0.7 }]);
    const miss = matchReference([w("the", 0.5), w("shelf", 1.0)], "the good shelf");
    expect(miss.words.map((x) => x.conf === null)).toEqual([false, true, false]);
    expect(matchReference([], "crazy")).toEqual({ start: null, end: null, words: [{ word: "crazy", conf: null }], all: { count: 0, start: null, end: null } });
  });
});

describe("cắt đoạn WAV đúng thời gian", () => {
  it("giữ tần số, cắt có lề, đoạn quá ngắn thì giữ nguyên", () => {
    const rate = 16000;
    const s = new Float32Array(rate * 5).map((_, i) => (i >= rate * 2 && i < rate * 3 ? 0.5 : 0));
    const wav = encodeWav(s, rate);
    const cut = cropWav(wav, 2, 3, 0.25);
    expect((cut.length - 44) / 2).toBe(rate * 1.5);
    expect(new DataView(cut.buffer).getUint32(24, true)).toBe(rate);
    expect(cropWav(wav, 2, 2.05, 0.1)).toBe(wav);
    expect(cropWav(new Uint8Array(10), 0, 1)).toHaveLength(10);
  });
});

describe("kết quả chấm phát âm khớp với máy chép lời", () => {
  const base: PronResult = {
    source: "open",
    words: [
      { word: "crazy", level: "work", score: 45, syllables: [], phonemes: [] },
      { word: "about", level: "good", score: 95, syllables: [], phonemes: [] },
      { word: "cartoons", level: "close", score: 70, syllables: [], phonemes: [] },
    ],
  };
  it("máy chép lời nghe rõ thì không 'cần luyện'; không nghe thấy thì không 'tốt'", () => {
    const r = reconcile(base, [
      { word: "crazy", conf: 0.98 },
      { word: "about", conf: null },
      { word: "cartoons", conf: 0.6 },
    ]);
    expect(r.words.map((x) => [x.word, x.level, x.asr])).toEqual([
      ["crazy", "close", "clear"],
      ["about", "work", "not_heard"],
      ["cartoons", "close", "unsure"],
    ]);
    expect(r.words[0].score).toBe(45); // giữ nguyên số đo của máy chấm
  });
  it("máy chép lời nghe rõ mà máy chấm cho gần 0: không đáng tin, bỏ điểm và chi tiết", () => {
    const r = reconcile({ source: "open", words: [{ word: "good", level: "work", score: 0, syllables: [{ text: "ɡʊd", score: 0 }], phonemes: [{ p: "ʊ", score: 0, heardAs: "", conf: 1 }] }] }, [{ word: "good", conf: 0.99 }]);
    expect(r.words[0]).toMatchObject({ level: "close", score: null, syllables: [], phonemes: [], unsure: true, asr: "clear" });
  });
  it("em nói câu khác hẳn câu mẫu, hoặc không nói gì: không chấm", () => {
    const say = (t: string) => matchReference(t.split(" ").map((x, i) => w(x, i * 0.4)), "extinction");
    expect(offTarget(say("i recycle plastic bottles because it helps protect the environment"))).toBe("off_target");
    expect(offTarget(matchReference([], "extinction"))).toBe("no_speech");
    // Đọc thành từ gần giống (sheep → ship): vẫn chấm để chỉ ra âm sai.
    expect(offTarget(matchReference([w("ship", 0.5)], "sheep"))).toBeNull();
    expect(offTarget(matchReference([w("crazy", 0.5)], "crazy"))).toBeNull();
    expect(offTarget(undefined)).toBeNull();
  });
  it("chưa có dữ liệu máy chép lời thì giữ nguyên", () => {
    expect(reconcile(base, undefined)).toBe(base);
  });
});
