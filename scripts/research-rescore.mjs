// Đo lại thời gian phản xạ cho các câu chưa đo được (mất mạng, Deepgram lỗi lúc làm bài).
// Chạy: npm run research:rescore            (chỉ câu đang "pending" quá 2 phút hoặc "failed"; có tính tiền Deepgram, rất nhỏ)
//       npm run research:rescore -- --all   (đo lại TẤT CẢ, VD khi đổi quy tắc bỏ âm ngập ngừng; ghi rõ vào nhật ký)
import { admin, env } from "./research-lib.mjs";
import { computeRl } from "../src/lib/research/latency.ts";

const DG = "https://api.deepgram.com/v1/listen?model=nova-3&language=en&punctuate=true&smart_format=false&filler_words=true";
const all = process.argv.includes("--all");
const cutoff = new Date(Date.now() - 120_000).toISOString();

let q = admin.from("test_responses").select("id, audio_path, beep_end_ms, rl_status, created_at");
q = all ? q : q.or(`rl_status.eq.failed,and(rl_status.eq.pending,created_at.lt.${cutoff})`);
const { data: rows, error } = await q;
if (error) throw new Error(error.message);
console.log(`${rows.length} câu cần đo.`);

let ok = 0;
for (const r of rows) {
  const { data: file } = await admin.storage.from("test-recordings").download(r.audio_path);
  if (!file) {
    console.log(`LỖI không tải được ${r.audio_path}`);
    continue;
  }
  const res = await fetch(DG, { method: "POST", headers: { Authorization: `Token ${env.DEEPGRAM_API_KEY}`, "Content-Type": file.type || "audio/webm" }, body: await file.arrayBuffer() });
  if (!res.ok) {
    console.log(`LỖI Deepgram ${res.status} ở ${r.audio_path}`);
    await admin.from("test_responses").update({ rl_status: "failed" }).eq("id", r.id);
    continue;
  }
  const alt = (await res.json()).results?.channels?.[0]?.alternatives?.[0];
  const words = (alt?.words ?? []).map((w) => ({ word: w.word, start: w.start, end: w.end }));
  const rl = computeRl(words, r.beep_end_ms);
  await admin
    .from("test_responses")
    .update({ rl_ms: rl.rlMs, rl_status: rl.status, first_word: rl.firstWord, transcript: (alt?.transcript ?? "").slice(0, 2000), words })
    .eq("id", r.id);
  ok++;
}
console.log(`Đã đo ${ok}/${rows.length} câu.`);
