import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkUseWord, fillPhrase, parsePhrase } from "@/lib/module/useWord";

const P = "help somebody stay in shape";
const EX = "My mum goes jogging to stay in shape.";

describe("Từ vựng thành câu: tự đặt câu, không đọc lại cụm từ", () => {
  it("đọc nguyên cụm từ thì chưa đạt", () => {
    const r = checkUseWord("Help somebody stay in shape.", P, EX);
    expect(r.ok).toBe(false);
    expect(r.placeholderLeft).toBe(true);
  });
  it("thay chỗ trống bằng người cụ thể, đổi dạng động từ: đạt", () => {
    expect(checkUseWord("Swimming helps my brother stay in shape.", P, EX).ok).toBe(true);
    expect(checkUseWord("Last year my coach helped me stay in shape", P, EX).ok).toBe(true);
  });
  it("đọc lại câu ví dụ thì chưa đạt; thiếu cụm thì chưa đạt", () => {
    expect(checkUseWord("My mum goes jogging to stay in shape", "stay in shape", EX)).toMatchObject({ ok: false, copiedExample: true });
    expect(checkUseWord("I like playing football with my friends", P, EX)).toMatchObject({ ok: false, used: false });
  });
  it("câu quá ngắn chưa đạt; cụm có 'your', 'do something'", () => {
    expect(checkUseWord("Stay in shape", "stay in shape", null)).toMatchObject({ ok: false, tooShort: true });
    expect(checkUseWord("I always brush my teeth before bed", "brush your teeth", null).ok).toBe(true);
    expect(checkUseWord("We aim to recycle more plastic this year", "aim to do something", null).ok).toBe(true);
    expect(checkUseWord("I aim to do something", "aim to do something", null).ok).toBe(false);
    expect(parsePhrase("encourage somebody to do something").map((p) => p.kind)).toEqual(["word", "gap", "word", "gap"]);
  });
});

describe("cụm có giới từ cuối, lựa chọn a/b, yourself", () => {
  it("giới từ cuối cần người / vật đi sau", () => {
    expect(checkUseWord("Take responsibility for", "take responsibility for", null).ok).toBe(false);
    expect(checkUseWord("We should take responsibility for our actions", "take responsibility for", null).ok).toBe(true);
    expect(checkUseWord("I want to cheer my sister up today", "cheer somebody up", null).ok).toBe(true);
  });
  it("his/her: chọn một trong hai", () => {
    expect(checkUseWord("My grandfather was a soldier in his youth", "in his/her youth", null).ok).toBe(true);
    expect(checkUseWord("My mum was a dancer in her youth", "in his/her youth", null).ok).toBe(true);
  });
  it("yourself: đổi thành myself, herself…", () => {
    expect(checkUseWord("Drawing helps me express myself every day", "express yourself", null).ok).toBe(true);
  });
});

describe("mọi cụm từ trong nội dung thật đều đặt được câu hợp lệ", () => {
  it("câu có điền chỗ trống thì đạt, đọc nguyên cụm thì không", () => {
    let n = 0;
    for (const g of readdirSync(join(process.cwd(), "content/modules")))
      for (const f of readdirSync(join(process.cwd(), "content/modules", g)).filter((x) => x.endsWith(".json"))) {
        const m = JSON.parse(readFileSync(join(process.cwd(), "content/modules", g, f), "utf8"));
        for (const v of m.vocab) {
          const phrase = v.collocations[0];
          if (!phrase) continue;
          n++;
          const own = `I think we should ${fillPhrase(phrase)} every week.`;
          expect(checkUseWord(own, phrase, v.example).ok, `${g}/${f}: ${phrase}`).toBe(true);
          if (/somebody|someone|something/.test(phrase)) expect(checkUseWord(phrase, phrase, v.example).ok).toBe(false);
        }
      }
    expect(n).toBeGreaterThan(1000);
  });
});
