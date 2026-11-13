import "server-only";
import { mockAi } from "@/lib/usage";
import type { AsrWordC } from "./measure";

/**
 * Chép lời một lượt nói của module, có mốc thời gian và độ tin cậy từng từ (Deepgram). Giữ "uh/um" trong bản chép để quy
 * tắc tự bỏ qua khi tính thời gian bắt đầu nói. Lỗi mạng hoặc chưa cấu hình → null (giao diện mời nói lại).
 * MOCK_AI=1: đọc lại đúng câu mẫu (mockText) để kiểm thử luồng, không gọi dịch vụ.
 */
const DG_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&smart_format=false&filler_words=true";

/** Mô hình dự phòng cho lần thử cuối, khi nova-3 đang quá tải hoặc lỗi tạm thời. Cùng các tham số còn lại. */
const fallbackUrl = (url: string) => url.replace("model=nova-3", "model=nova-2");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Gọi Deepgram, thử tối đa 3 lần khi lỗi tạm thời (mạng, quá giờ, 408, 429, 5xx), chờ 0,5 rồi 1,5 giây giữa các lần; lần
 * cuối dùng mô hình dự phòng nova-2. Lỗi do file (400: file hỏng hoặc định dạng lạ) thì không thử lại: trình duyệt sẽ gửi lại
 * bản ghi thô. Mọi lỗi được ghi vào nhật ký máy chủ (Vercel) kèm mã và lời báo của Deepgram. Tổng thời gian tối đa ~38 giây,
 * dưới giới hạn 60 giây của đường gửi bài.
 */
export async function deepgram(key: string, audio: ArrayBuffer, mime: string, url = DG_URL): Promise<Response | null> {
  const plan = [
    { url, wait: 0, timeout: 12_000 },
    { url, wait: 500, timeout: 12_000 },
    { url: fallbackUrl(url), wait: 1500, timeout: 12_000 },
  ];
  for (let i = 0; i < plan.length; i++) {
    const { url: u, wait, timeout } = plan[i];
    if (wait) await sleep(wait);
    try {
      const res = await fetch(u, { method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": mime }, body: audio, signal: AbortSignal.timeout(timeout) });
      if (res.ok) {
        if (i > 0) console.warn("deepgram thành công sau khi thử lại", { attempt: i + 1, fallback: u !== url });
        return res;
      }
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      console.error("deepgram lỗi", { status: res.status, mime, bytes: audio.byteLength, attempt: i + 1, detail });
      if (res.status !== 408 && res.status !== 429 && res.status < 500) return null;
    } catch (e) {
      console.error("deepgram lỗi mạng", { mime, bytes: audio.byteLength, attempt: i + 1, error: String(e) });
    }
  }
  return null;
}

export async function transcribeModule(audio: ArrayBuffer, mime: string, mockText: string): Promise<{ transcript: string; words: AsrWordC[] } | null> {
  if (mockAi()) {
    const words = mockText.split(/\s+/).filter(Boolean).map((w, i) => ({ word: w.toLowerCase().replace(/[^a-z'-]/g, ""), start: 0.8 + i * 0.35, end: 1.1 + i * 0.35, confidence: 0.95 }));
    return { transcript: mockText, words };
  }
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    console.error("deepgram: DEEPGRAM_API_KEY chưa đặt");
    return null;
  }
  const res = await deepgram(key, audio, mime);
  if (!res) return null;
  try {
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
