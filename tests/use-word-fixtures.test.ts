import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkUseWord } from "@/lib/module/useWord";

/**
 * Câu học sinh thật hay nói cho từng cụm từ của bước "Từ vựng thành câu" (tests/fixtures/use-word/grade-N.json).
 * good: câu tự nhiên có dùng cụm (đổi dạng từ, chen từ, đổi thứ tự, điền người/việc cụ thể) → phải ĐẠT.
 * bad: đọc nguyên cụm / để nguyên somebody, something / không dùng cụm → phải KHÔNG ĐẠT.
 * Lọc một khối: GRADE=8 npx vitest run tests/use-word-fixtures.test.ts
 */
type Item = { unit: string; phrase: string; good: string[]; bad: string[] };
const DIR = join(process.cwd(), "tests/fixtures/use-word");
const files = existsSync(DIR) ? readdirSync(DIR).filter((f) => f.endsWith(".json")) : [];
const only = process.env.GRADE;

describe("bộ câu thử phủ hết nội dung", () => {
  it("mọi cụm từ của bước Từ vựng thành câu (collocations[0]) đều có câu thử", () => {
    const covered = new Map<string, Set<string>>();
    for (const f of files) covered.set(f.replace(/\.json$/, ""), new Set((JSON.parse(readFileSync(join(DIR, f), "utf8")) as Item[]).map((x) => `${x.unit}|${x.phrase}`)));
    const missing: string[] = [];
    const root = join(process.cwd(), "content/modules");
    for (const g of readdirSync(root))
      for (const u of readdirSync(join(root, g)).filter((x) => x.endsWith(".json"))) {
        const m = JSON.parse(readFileSync(join(root, g, u), "utf8")) as { vocab: { collocations?: string[] }[] };
        for (const v of m.vocab) {
          const phrase = v.collocations?.[0];
          if (phrase && !covered.get(g)?.has(`${u.replace(/\.json$/, "")}|${phrase}`)) missing.push(`${g}/${u}: ${phrase}`);
        }
      }
    expect(missing).toEqual([]);
  });
});

describe("câu học sinh thật cho bước Từ vựng thành câu", () => {
  for (const f of files) {
    if (only && f !== `grade-${only}.json`) continue;
    it(f, () => {
      const items: Item[] = JSON.parse(readFileSync(join(DIR, f), "utf8"));
      const fails: string[] = [];
      for (const it of items) {
        for (const s of it.good) if (!checkUseWord(s, it.phrase, null).ok) fails.push(`GOOD-REJECTED | ${it.unit} | ${it.phrase} | ${s} | ${JSON.stringify(checkUseWord(s, it.phrase, null))}`);
        for (const s of it.bad) if (checkUseWord(s, it.phrase, null).ok) fails.push(`BAD-ACCEPTED | ${it.unit} | ${it.phrase} | ${s}`);
      }
      if (fails.length) console.log(fails.join("\n"));
      expect(fails, `${fails.length} câu chấm sai`).toEqual([]);
    });
  }
});
