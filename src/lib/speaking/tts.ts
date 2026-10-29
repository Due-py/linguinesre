import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockAi } from "@/lib/usage";
import { DEFAULT_TTS_VOICE, TTS_INSTRUCTIONS } from "@/lib/speaking/tts-style";

/**
 * Giọng đọc một câu: lấy từ kho "question-audio" nếu đã tạo, chưa có thì tạo bằng OpenAI TTS rồi lưu.
 * Tên file gắn với nội dung câu, mô hình, giọng và chỉ dẫn cách đọc, nên đổi bất kỳ thứ nào cũng tự tạo giọng mới.
 * allowGenerate = false: chỉ phát file đã có (dùng khi đã hết lượt). Trả null nếu không có giọng đọc.
 */
export async function speech(prefix: string, text: string, allowGenerate = true): Promise<ArrayBuffer | Blob | null> {
  const admin = createAdminClient();
  const model = process.env.OPENAI_TTS_MODEL;
  const voice = process.env.OPENAI_TTS_VOICE || DEFAULT_TTS_VOICE;
  const style = [model, voice, TTS_INSTRUCTIONS, text].join("|");
  const path = `${prefix}-${createHash("sha256").update(style).digest("hex").slice(0, 16)}.mp3`;

  const cached = await admin.storage.from("question-audio").download(path);
  if (cached.data) return cached.data;

  const key = process.env.OPENAI_API_KEY;
  if (!allowGenerate || mockAi() || !key || !model) return null;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, voice, input: text, instructions: TTS_INSTRUCTIONS, response_format: "mp3" }),
  });
  if (!res.ok) return null;
  const audio = await res.arrayBuffer();
  await admin.storage.from("question-audio").upload(path, audio, { contentType: "audio/mpeg", upsert: true });
  return audio;
}

export const AUDIO_HEADERS = { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" };
