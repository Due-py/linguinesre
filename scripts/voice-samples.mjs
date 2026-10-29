// Tạo giọng đọc mẫu để nghe và chọn (có tính tiền, rất nhỏ: mỗi file vài giây).
// Chạy: npm run voice:samples   → files/giao-dien/giong-mau-2/*.mp3
// Mỗi file = một cách đọc (mô hình + giọng + chỉ dẫn). Tên file bắt đầu bằng số để nghe theo thứ tự trong bảng in ra.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv, ROOT } from "./lib.mjs";
import { TTS_INSTRUCTIONS as NATURAL } from "../src/lib/speaking/tts-style.ts";

const env = loadEnv();
const TEXTS = {
  test: "Do you like reading books in your free time? Why or why not?",
  practice: "What do you usually do in your free time?",
};

// Chỉ dẫn cũ (trước 29/10), để so sánh. Chỉ dẫn đang dùng (NATURAL) lấy từ tts-style.ts.
const OLD =
  "You are a warm, encouraging English teacher talking to a 13-year-old Vietnamese student. " +
  "Speak naturally, like a real person asking a friendly question in class, not like a news reader. " +
  "Use a calm, slightly slower than normal pace with clear pronunciation and natural rising or falling intonation at the end of the question. " +
  "Do not add any words.";

const VARIANTS = [
  { name: "01-cu-coral", model: "gpt-4o-mini-tts", voice: "coral", instructions: OLD },
  { name: "02-moi-coral", model: "gpt-4o-mini-tts-2025-12-15", voice: "coral", instructions: NATURAL },
  { name: "03-moi-marin", model: "gpt-4o-mini-tts-2025-12-15", voice: "marin", instructions: NATURAL },
  { name: "04-moi-cedar-dang-dung", model: "gpt-4o-mini-tts-2025-12-15", voice: "cedar", instructions: NATURAL },
  { name: "05-moi-sage", model: "gpt-4o-mini-tts-2025-12-15", voice: "sage", instructions: NATURAL },
];

const out = join(ROOT, "files", "giao-dien", "giong-mau-2");
mkdirSync(out, { recursive: true });

for (const v of VARIANTS) {
  for (const [key, text] of Object.entries(TEXTS)) {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: v.model, voice: v.voice, input: text, instructions: v.instructions, response_format: "mp3" }),
    });
    const file = `${v.name}-${key}.mp3`;
    if (!res.ok) {
      console.log(`HỎNG ${file}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(join(out, file), buf);
    console.log(`ĐẠT  ${file} (${Math.round(buf.length / 1024)} KB)`);
  }
}
console.log(`Nghe ở: files/giao-dien/giong-mau-2/`);
