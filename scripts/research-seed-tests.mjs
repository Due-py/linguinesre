// Nạp đề kiểm tra (content/tests/grade-<khối>.json) vào CSDL và tạo sẵn giọng đọc cho mọi câu.
// Chạy: npm run research:seed-tests            (nạp đề lớp 8 + tạo giọng đọc còn thiếu; có tính tiền OpenAI TTS, rất nhỏ)
//       npm run research:seed-tests -- --no-tts
// An toàn: KHÔNG sửa câu đã có học sinh làm (để dữ liệu đo không bị lệch), trừ khi thêm --force.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";
import { admin, env } from "./research-lib.mjs";
import { testFormSchema } from "../src/lib/research/testForm.ts";
import { DEFAULT_TTS_VOICE, TTS_INSTRUCTIONS } from "../src/lib/speaking/tts-style.ts";

const args = process.argv.slice(2);
const grade = Number(args.find((a) => /^\d+$/.test(a)) ?? 8);
const form = testFormSchema.parse(JSON.parse(readFileSync(join(ROOT, "content", "tests", `grade-${grade}.json`), "utf8")));

const rows = [
  ...form.warmup.map((text, i) => ({ grade, form: "W", position: i + 1, unit_no: null, kind: null, text })),
  ...form.pairs.flatMap((p, i) => [
    { grade, form: "A", position: i + 1, unit_no: p.unit, kind: p.kind, text: p.A },
    { grade, form: "B", position: i + 1, unit_no: p.unit, kind: p.kind, text: p.B },
  ]),
];

const { data: current } = await admin.from("test_items").select("id, form, position, text").eq("grade", grade);
const { data: used } = await admin.from("test_responses").select("item_id");
const usedIds = new Set((used ?? []).map((u) => u.item_id));
let changed = 0;
for (const r of rows) {
  const old = current?.find((c) => c.form === r.form && c.position === r.position);
  if (old && old.text === r.text) continue;
  if (old && usedIds.has(old.id) && !args.includes("--force")) {
    console.log(`BỎ QUA ${r.form}${r.position}: câu đã có học sinh làm, không sửa (dùng --force nếu thật sự cần)`);
    continue;
  }
  const { error } = await admin.from("test_items").upsert(r, { onConflict: "grade,form,position" });
  if (error) throw new Error(error.message);
  changed++;
}
console.log(`Đề lớp ${grade}: ${rows.length} câu, cập nhật ${changed}.`);

if (!args.includes("--no-tts")) {
  // Cùng cách đặt tên file với src/lib/speaking/tts.ts, để web dùng lại đúng file đã tạo.
  const model = env.OPENAI_TTS_MODEL;
  const voice = env.OPENAI_TTS_VOICE || DEFAULT_TTS_VOICE;
  if (!env.OPENAI_API_KEY || !model) throw new Error("Thiếu OPENAI_API_KEY hoặc OPENAI_TTS_MODEL");
  const { data: items } = await admin.from("test_items").select("id, text").eq("grade", grade);
  let made = 0;
  for (const it of items ?? []) {
    const hash = createHash("sha256").update([model, voice, TTS_INSTRUCTIONS, it.text].join("|")).digest("hex").slice(0, 16);
    const path = `test-${it.id}-${hash}.mp3`;
    const { data: exists } = await admin.storage.from("question-audio").download(path);
    if (exists) continue;
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, voice, input: it.text, instructions: TTS_INSTRUCTIONS, response_format: "mp3" }),
    });
    if (!res.ok) throw new Error(`Giọng đọc "${it.text}": HTTP ${res.status}`);
    await admin.storage.from("question-audio").upload(path, await res.arrayBuffer(), { contentType: "audio/mpeg", upsert: true });
    made++;
  }
  console.log(`Giọng đọc: tạo mới ${made}, đã có sẵn ${(items?.length ?? 0) - made}.`);
}
