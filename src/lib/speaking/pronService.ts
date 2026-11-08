import "server-only";
import { mockAi } from "@/lib/usage";
import { parseAzure, parseOpen, type PronResult } from "@/lib/speaking/pron";

/**
 * Chấm phát âm chi tiết cho một bản WAV 16 kHz mono và câu mẫu. Chọn nguồn theo cấu hình (chỉ ở máy chủ):
 *  1. Azure (AZURE_SPEECH_KEY + AZURE_SPEECH_REGION) nếu có: chính xác nhất, có điểm âm tiết.
 *  2. Máy chấm mã nguồn mở tự chạy trên Modal (PRON_SERVER_URL + PRON_SECRET): miễn phí trong hạn mức, kém chính xác hơn.
 *  3. Không có gì: "not_configured", giao diện nói thật là chưa bật, không bịa kết quả.
 */
export type PronOutcome =
  | { status: "ok"; result: PronResult; mock: boolean }
  | { status: "not_configured" }
  | { status: "no_speech" }
  | { status: "waking" } // máy chấm đang khởi động lại sau khi nghỉ
  | { status: "error" };

const azure = () => (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION ? { key: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION } : null);
const server = () => (process.env.PRON_SERVER_URL && process.env.PRON_SECRET ? { url: process.env.PRON_SERVER_URL.replace(/\/+$/, ""), secret: process.env.PRON_SECRET } : null);

export const pronConfigured = () => mockAi() || !!azure() || !!server();

/** Bản giả cho test tự động (dạng máy chấm mã nguồn mở): từ dài nhất có âm tiết cuối yếu, âm /ʃ/ nghe thành /s/. Có nhãn mô phỏng. */
function mock(referenceText: string): PronResult {
  const words = referenceText.split(/\s+/).map((w) => w.replace(/[^A-Za-z']/g, "")).filter(Boolean);
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  return parseOpen({
    status: "ok",
    words: words.map((w) =>
      w === longest
        ? {
            word: w,
            score: 55,
            syllables: [
              { text: "pə", score: 90 },
              { text: "ʃən", score: 20 },
            ],
            phones: [
              { p: "p", score: 95, heard: null },
              { p: "ə", score: 85, heard: null },
              { p: "ʃ", score: 10, heard: "s" },
              { p: "ə", score: 30, heard: null },
              { p: "n", score: 20, heard: "" },
            ],
          }
        : { word: w, score: 92, syllables: [{ text: w.toLowerCase(), score: 92 }], phones: [{ p: "ə", score: 92, heard: null }] },
    ),
  })!;
}

async function viaAzure(cfg: { key: string; region: string }, wav: ArrayBuffer, referenceText: string): Promise<PronOutcome> {
  const url = `https://${cfg.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed`;
  const params = (ipa: boolean) => {
    const p: Record<string, unknown> = { ReferenceText: referenceText, GradingSystem: "HundredMark", Granularity: "Phoneme", Dimension: "Comprehensive", EnableMiscue: true };
    if (ipa) Object.assign(p, { PhonemeAlphabet: "IPA", NBestPhonemeCount: 3 });
    return Buffer.from(JSON.stringify(p), "utf8").toString("base64");
  };
  // IPA có trong tài liệu SDK, REST chưa ghi rõ: Azure từ chối (400) thì gọi lại không có IPA.
  for (const ipa of [true, false]) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": cfg.key, "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000", Accept: "application/json", "Pronunciation-Assessment": params(ipa) },
        body: wav,
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 400 && ipa) continue;
      if (!res.ok) return { status: "error" };
      const result = parseAzure(await res.json());
      return result ? { status: "ok", result, mock: false } : { status: "no_speech" };
    } catch {
      return { status: "error" };
    }
  }
  return { status: "error" };
}

async function viaServer(cfg: { url: string; secret: string }, wav: ArrayBuffer, referenceText: string): Promise<PronOutcome> {
  try {
    const res = await fetch(`${cfg.url}/assess?text=${encodeURIComponent(referenceText)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.secret}`, "Content-Type": "audio/wav" },
      body: wav,
      signal: AbortSignal.timeout(25_000),
    });
    // Máy chấm tắt khi không ai dùng: lần đầu phải bật máy và nạp mô hình (quá 25 giây thì báo "đang khởi động").
    if (res.status === 503 || !(res.headers.get("content-type") ?? "").includes("application/json")) return { status: "waking" };
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    if (data?.status === "no_speech") return { status: "no_speech" };
    const result = parseOpen(data);
    return result ? { status: "ok", result, mock: false } : { status: "error" };
  } catch (e) {
    return (e as Error)?.name === "TimeoutError" ? { status: "waking" } : { status: "error" };
  }
}

export async function assessPronunciation(wav: ArrayBuffer, referenceText: string): Promise<PronOutcome> {
  if (mockAi()) return { status: "ok", result: mock(referenceText), mock: true };
  const a = azure();
  if (a) return viaAzure(a, wav, referenceText);
  const s = server();
  if (s) return viaServer(s, wav, referenceText);
  return { status: "not_configured" };
}
