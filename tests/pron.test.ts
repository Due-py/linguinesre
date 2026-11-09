import { describe, expect, it } from "vitest";
import { azureLevel, parseAzure, parseOpen, weakest } from "@/lib/speaking/pron";

// Dạng SDK (điểm trong PronunciationAssessment), theo ví dụ "hello" trong tài liệu Azure.
const sdk = {
  RecognitionStatus: 0,
  NBest: [
    {
      Words: [
        {
          Word: "hello",
          PronunciationAssessment: { AccuracyScore: 75, ErrorType: "None" },
          Syllables: [
            { Syllable: "hɛ", PronunciationAssessment: { AccuracyScore: 91 } },
            { Syllable: "loʊ", PronunciationAssessment: { AccuracyScore: 59 } },
          ],
          Phonemes: [
            { Phoneme: "h", PronunciationAssessment: { AccuracyScore: 98, NBestPhonemes: [{ Phoneme: "h", Score: 98 }] } },
            { Phoneme: "oʊ", PronunciationAssessment: { AccuracyScore: 40, NBestPhonemes: [{ Phoneme: "ɔ", Score: 70 }] } },
          ],
        },
      ],
    },
  ],
};

// Dạng REST (điểm thẳng trong mục), có từ bị bỏ sót và từ nói thừa.
const rest = {
  RecognitionStatus: "Success",
  NBest: [
    {
      Words: [
        { Word: "good", AccuracyScore: 100, ErrorType: "None" },
        { Word: "uh", AccuracyScore: 0, ErrorType: "Insertion" },
        { Word: "morning", AccuracyScore: 0, ErrorType: "Omission" },
      ],
    },
  ],
};

// Đúng dạng services/pron-modal/scoring.py trả về.
const open = {
  status: "ok",
  words: [
    { word: "air", score: 91, missing: false, syllables: [{ text: "ɛɹ", score: 91 }], phones: [{ p: "ɛɹ", score: 91, heard: null }] },
    {
      word: "pollution",
      score: 64,
      missing: false,
      syllables: [
        { text: "pə", score: 93 },
        { text: "luː", score: 88 },
        { text: "ʃən", score: 31 },
      ],
      phones: [
        { p: "p", score: 95, heard: null },
        { p: "ə", score: 90, heard: null },
        { p: "l", score: 92, heard: null },
        { p: "uː", score: 84, heard: null },
        { p: "ʃ", score: 12, heard: "s" },
        { p: "ə", score: 55, heard: null },
        { p: "n", score: 26, heard: "" },
      ],
    },
    { word: "makes", score: 72, missing: false, syllables: [{ text: "meɪks", score: 72 }], phones: [{ p: "m", score: 96, heard: null }, { p: "eɪ", score: 90, heard: null }, { p: "k", score: 88, heard: null }, { p: "s", score: 14, heard: "" }] },
    { word: "it", score: 3, missing: true, syllables: [{ text: "ɪt", score: 3 }], phones: [{ p: "ɪ", score: 2, heard: "" }, { p: "t", score: 4, heard: "" }] },
  ],
};

describe("chấm phát âm: Azure", () => {
  it("dạng SDK: điểm từ, âm tiết, âm và âm em đọc nghe giống", () => {
    const w = parseAzure(sdk)!.words[0];
    expect(w).toMatchObject({ word: "hello", score: 75, level: "close" });
    expect(w.syllables).toEqual([
      { text: "hɛ", score: 91 },
      { text: "loʊ", score: 59 },
    ]);
    expect(w.phonemes[1]).toMatchObject({ p: "oʊ", score: 40, heardAs: "ɔ" });
    expect(weakest(w).syllable?.text).toBe("loʊ");
    expect(weakest(w).phoneme?.p).toBe("oʊ");
  });
  it("dạng REST: từ bỏ sót không có điểm, từ nói thừa bị bỏ qua", () => {
    const r = parseAzure(rest)!;
    expect(r.words.map((w) => [w.word, w.level, w.score])).toEqual([
      ["good", "good", 100],
      ["morning", "missing", null],
    ]);
  });
  it("không nhận ra lời nói thì trả null, không bịa điểm", () => {
    expect(parseAzure({ RecognitionStatus: "NoMatch" })).toBeNull();
    expect(parseAzure({ RecognitionStatus: "Success", NBest: [] })).toBeNull();
    expect([azureLevel(59), azureLevel(60), azureLevel(80), azureLevel(null)]).toEqual(["work", "close", "good", "work"]);
  });
});

describe("chấm phát âm: máy chấm mã nguồn mở", () => {
  const r = parseOpen(open)!;
  it("điểm và mức từng từ, cùng ngưỡng với Azure; từ bỏ sót không có điểm", () => {
    expect(r.source).toBe("open");
    expect(r.words.map((w) => [w.word, w.level, w.score])).toEqual([
      ["air", "good", 91],
      ["pollution", "close", 64],
      ["makes", "close", 72],
      ["it", "missing", null],
    ]);
  });
  it("điểm từ cao nhưng có một âm nghe thành âm khác rõ: gần đúng, không phải tốt (cũng không đỏ)", () => {
    const one = (score: number) => parseOpen({ status: "ok", words: [{ word: "woman", score, syllables: [], phones: [{ p: "ʊ", score: 32, heard: "ʌ" }] }] })!.words[0].level;
    expect([one(85), one(70), one(50)]).toEqual(["close", "close", "work"]);
  });
  it("âm chỉ hơi yếu (không nghe thành âm khác) thì không kéo cả từ xuống", () => {
    const w = parseOpen({ status: "ok", words: [{ word: "hard", score: 89, syllables: [], phones: [{ p: "ɑːɹ", score: 30, heard: null }] }] })!.words[0];
    expect(w.level).toBe("good");
  });
  it("âm tiết yếu nhất và âm nghe thành âm khác, âm bị thiếu", () => {
    const w = weakest(r.words[1]);
    expect(w.syllable).toEqual({ text: "ʃən", score: 31 });
    expect(w.phoneme).toMatchObject({ p: "ʃ", heardAs: "s", score: 12 });
    expect(weakest(r.words[2]).phoneme).toMatchObject({ p: "s", heardAs: "" });
    expect(weakest(r.words[0]).phoneme).toBeNull();
  });
  it("không nghe ra lời hoặc sai dạng thì null", () => {
    expect(parseOpen({ status: "no_speech" })).toBeNull();
    expect(parseOpen({ status: "ok", words: [] })).toBeNull();
    expect(parseOpen("rác")).toBeNull();
  });
});
