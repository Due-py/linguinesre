import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockAi } from "@/lib/usage";
import { computeRl, type AsrWord } from "@/lib/research/latency";

/**
 * Chép lời có mốc thời gian từng từ rồi tính thời gian phản xạ cho MỘT câu trả lời kiểm tra.
 * filler_words=true: giữ lại "uh/um" trong bản chép để quy tắc tự bỏ qua (nếu Deepgram tự lọc thì không biết chúng ở đâu).
 */
export const DG_TEST_URL =
  "https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&smart_format=false&filler_words=true";

export async function transcribeWords(audio: ArrayBuffer, mime: string, beepEndMs: number): Promise<{ words: AsrWord[]; transcript: string } | null> {
  if (mockAi()) {
    // Bản giả: "um" ngay sau tiếng bíp, từ có nghĩa đầu tiên sau 1,2 giây (RL = 1200 ms).
    const b = beepEndMs / 1000;
    return {
      transcript: "um I usually read books",
      words: [
        { word: "um", start: b + 0.3, end: b + 0.6 },
        { word: "i", start: b + 1.2, end: b + 1.3 },
        { word: "usually", start: b + 1.3, end: b + 1.8 },
        { word: "read", start: b + 1.8, end: b + 2.1 },
        { word: "books", start: b + 2.1, end: b + 2.5 },
      ],
    };
  }
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(DG_TEST_URL, { method: "POST", headers: { Authorization: `Token ${key}`, "Content-Type": mime }, body: audio });
    if (!res.ok) return null;
    const alt = (await res.json()).results?.channels?.[0]?.alternatives?.[0];
    const words: AsrWord[] = (alt?.words ?? []).map((w: { word: string; start: number; end: number }) => ({ word: w.word, start: w.start, end: w.end }));
    return { words, transcript: typeof alt?.transcript === "string" ? alt.transcript : "" };
  } catch {
    return null;
  }
}

export async function scoreResponse(responseId: string, audio: ArrayBuffer, mime: string, beepEndMs: number): Promise<void> {
  const admin = createAdminClient();
  const asr = await transcribeWords(audio, mime, beepEndMs);
  if (!asr) {
    await admin.from("test_responses").update({ rl_status: "failed" }).eq("id", responseId);
    return;
  }
  const rl = computeRl(asr.words, beepEndMs);
  await admin
    .from("test_responses")
    .update({ rl_ms: rl.rlMs, rl_status: rl.status, first_word: rl.firstWord, transcript: asr.transcript.slice(0, 2000), words: asr.words })
    .eq("id", responseId);
}
