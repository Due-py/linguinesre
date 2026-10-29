// Thử nhanh các dịch vụ AI THẬT (có tính tiền, rất nhỏ): OpenAI đọc một câu hỏi → Deepgram chép lại.
// Dùng đúng tham số như src/app/api/tts và src/app/api/transcribe. Không in khóa ra màn hình.
// Chạy: npm run smoke:ai
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, ROOT } from "./lib.mjs";

const env = loadEnv();
const TEXT = "What do you usually do in your free time?"; // câu q01, lớp 8 Unit 1
let fail = 0;
const t = (n, ok, extra = "") => {
  console.log((ok ? "ĐẠT " : "HỎNG ") + n + (extra ? ` (${extra})` : ""));
  if (!ok) fail++;
};
const words = (s) => s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);

// 1. Tên mô hình có tồn tại không (miễn phí).
for (const key of ["OPENAI_TTS_MODEL", "OPENAI_FEEDBACK_MODEL"]) {
  const model = env[key];
  if (!model) {
    t(`${key} đã điền`, false);
    continue;
  }
  // Không bao giờ in giá trị trông giống khóa bí mật (dán nhầm khóa vào ô tên mô hình).
  if (/^sk-|^[A-Za-z0-9_-]{40,}$/.test(model)) {
    t(`${key} là tên mô hình`, false, "giá trị trông giống KHÓA API, không phải tên mô hình; đã ẩn");
    continue;
  }
  const r = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, { headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` } });
  t(`${key} = "${model}" có trên tài khoản OpenAI`, r.ok, r.ok ? "" : `HTTP ${r.status}`);
}

// 2. OpenAI đọc câu hỏi.
const tts = await fetch("https://api.openai.com/v1/audio/speech", {
  method: "POST",
  headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model: env.OPENAI_TTS_MODEL, voice: env.OPENAI_TTS_VOICE || "alloy", input: TEXT, response_format: "mp3" }),
});
let audio = null;
if (tts.ok) {
  audio = await tts.arrayBuffer();
  const out = join(ROOT, "files", "giao-dien", "thu-giong-doc-openai.mp3");
  writeFileSync(out, Buffer.from(audio));
  t("OpenAI tạo giọng đọc câu hỏi", audio.byteLength > 5000, `${Math.round(audio.byteLength / 1024)} KB, lưu ở files/giao-dien/thu-giong-doc-openai.mp3`);
} else {
  t("OpenAI tạo giọng đọc câu hỏi", false, `HTTP ${tts.status}: ${(await tts.text()).slice(0, 160)}`);
}

// 3. Deepgram chép lại chính file đó (cùng tham số với /api/transcribe).
if (audio) {
  const dg = await fetch("https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&smart_format=false&filler_words=false", {
    method: "POST",
    headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": "audio/mpeg" },
    body: audio,
  });
  if (!dg.ok) {
    t("Deepgram chép lời", false, `HTTP ${dg.status}: ${(await dg.text()).slice(0, 160)}`);
  } else {
    const alt = (await dg.json()).results?.channels?.[0]?.alternatives?.[0];
    const got = alt?.transcript ?? "";
    const expected = words(TEXT);
    const heard = new Set(words(got));
    const hit = expected.filter((w) => heard.has(w)).length;
    console.log(`     Câu gốc:     ${TEXT}`);
    console.log(`     Deepgram nghe: ${got}`);
    t("Deepgram chép lời", got.length > 0, `độ tin cậy ${alt?.confidence?.toFixed(2)}`);
    t("chép đúng ít nhất 90% số từ", hit / expected.length >= 0.9, `${hit}/${expected.length} từ`);
  }
}

console.log(fail ? `${fail} hỏng` : "Tất cả đạt");
process.exit(fail ? 1 : 0);
