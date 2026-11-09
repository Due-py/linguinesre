/**
 * Thử cả chuỗi chấm phát âm với DỊCH VỤ THẬT (tốn rất ít: vài lần gọi Deepgram và máy chấm Modal). Bỏ qua mặc định.
 * Chạy: REAL_PRON=<thư mục có ctx-*.wav> npx vitest run tests/pron-real.test.ts
 * Mỗi file: Deepgram chép lời → đối chiếu câu mẫu → cắt đúng đoạn → máy chấm Modal → đối chiếu kết quả với lời đã nghe.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchReference } from "@/lib/module/measure";
import { parseOpen, reconcile } from "@/lib/speaking/pron";
import { cropWav } from "@/lib/speaking/wav";

const DIR = process.env.REAL_PRON;
const env = Object.fromEntries(
  readFileSync(join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);

async function run(file: string, reference: string) {
  const wav = new Uint8Array(readFileSync(join(DIR!, file)));
  const dg = await (
    await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&filler_words=true", { method: "POST", headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": "audio/wav" }, body: Buffer.from(wav) })
  ).json();
  const alt = dg.results.channels[0].alternatives[0];
  const ref = matchReference(alt.words, reference);
  const cut = ref.start !== null && ref.end !== null ? cropWav(wav, ref.start, ref.end) : wav;
  const res = await fetch(`${env.PRON_SERVER_URL}/assess?text=${encodeURIComponent(reference)}`, { method: "POST", headers: { Authorization: `Bearer ${env.PRON_SECRET}`, "Content-Type": "audio/wav" }, body: Buffer.from(cut), signal: AbortSignal.timeout(120_000) });
  const parsed = parseOpen(await res.json());
  const final = parsed ? reconcile(parsed, ref.words) : null;
  console.log(`${file}: nghe "${alt.transcript}" | đoạn ${ref.start}–${ref.end}s (${cut.length} / ${wav.length} byte)`);
  console.log("  " + (final?.words ?? []).map((w) => `${w.word}:${w.level}(${w.score},${w.asr})`).join(" "));
  return final!;
}

describe.skipIf(!DIR)("chấm phát âm thật: khớp với lời máy đã nghe", () => {
  it("một từ giữa lời nói thêm: chấm đúng đoạn, từ máy nghe rõ không bị 'cần luyện'", async () => {
    const r = await run("ctx-crazy.wav", "crazy");
    expect(r.words[0].asr).toBe("clear");
    expect(r.words[0].level === "good" || r.words[0].level === "close").toBe(true);
  }, 180_000);
  it("cả câu giữa lời nói thêm", async () => {
    const r = await run("ctx-woman.wav", "The woman put a good cookbook on the shelf.");
    expect(r.words.every((w) => w.asr === "clear" || w.asr === "unsure")).toBe(true);
    expect(r.words.every((w) => w.level !== "work" || w.asr !== "clear")).toBe(true);
  }, 180_000);
  it("đọc sai câu: từ máy không nghe thấy thì không được 'tốt'", async () => {
    const r = await run("ctx-wrong.wav", "The woman put a good cookbook on the shelf.");
    const cook = r.words.find((w) => w.word.toLowerCase() === "cookbook")!;
    const shelf = r.words.find((w) => w.word.toLowerCase() === "shelf")!;
    expect(cook.asr).toBe("not_heard");
    expect(cook.level).not.toBe("good");
    expect(shelf.level).not.toBe("good");
  }, 180_000);
});
