import "server-only";
import { mockAi } from "@/lib/usage";
import type { AsrWordC } from "./measure";

/**
 * Chép lời một lượt nói của module, có mốc thời gian và độ tin cậy từng từ (Deepgram). Giữ "uh/um" trong bản chép để quy
 * tắc tự bỏ qua khi tính thời gian bắt đầu nói. Lỗi mạng hoặc chưa cấu hình → null (giao diện mời nói lại).
 * MOCK_AI=1: đọc lại đúng câu mẫu (mockText) để kiểm thử luồng, không gọi dịch vụ.
 */
const DG_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&smart_format=false&filler_words=true";

export async function transcribeModule(audio: ArrayBuffer, mime: string, mockText: string): Promise<{ transcript: string; words: AsrWordC[] } | null> {
  if (mockAi()) {
    const words = mockText.split(/\s+/).filter(Boolean).map((w, i) => ({ word: w.toLowerCase().replace(/[^a-z'-]/g, ""), start: 0.8 + i * 0.35, end: 1.1 + i * 0.35, confidence: 0.95 }));
    return { transcript: mockText, words };
  }
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(DG_URL, { method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": mime }, body: audio });
    if (!res.ok) return null;
    const alt = (await res.json()).results?.channels?.[0]?.alternatives?.[0];
    const words: AsrWordC[] = (alt?.words ?? []).map((w: { word: string; start: number; end: number; confidence?: number }) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: typeof w.confidence === "number" ? w.confidence : 0,
    }));
    return { transcript: typeof alt?.transcript === "string" ? alt.transcript.trim() : "", words };
  } catch {
    return null;
  }
}
