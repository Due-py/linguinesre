/**
 * Chấm phát âm chi tiết kiểu ELSA: từng từ, từng âm (và từng âm tiết nếu nguồn có). Hai nguồn:
 *  - "open": máy chấm mã nguồn mở tự chạy trên Modal (services/pron-modal): mô hình wav2vec2 nghe âm + espeak-ng, chấm
 *    0–100 cho từng âm, âm tiết, từ theo cách "Goodness of Pronunciation". Kém chính xác hơn Azure, nhất là giọng trẻ em.
 *  - "azure": Azure Pronunciation Assessment (nếu sau này có khóa): điểm 0–100 cho từ, âm tiết, âm.
 * Đây là MÁY ĐO so với giọng chuẩn, không phải điểm tổng: giao diện chỉ hiện mức theo từng từ và luôn nói rõ giới hạn.
 * File này không import gì để test được.
 */

export type PronLevel = "good" | "close" | "work" | "missing";
export type PronPhoneme = { p: string; score: number | null; heardAs: string | null; conf: number };
export type PronSyllable = { text: string; score: number };
export type PronWord = {
  word: string;
  level: PronLevel;
  score: number | null; // null khi em bỏ sót từ
  syllables: PronSyllable[];
  phonemes: PronPhoneme[];
};
export type PronResult = { source: "azure" | "open"; words: PronWord[] };

/** Azure: dưới 60 là Mispronunciation (theo Azure), 60–79 gần đúng, từ 80 tốt. */
export const azureLevel = (score: number | null): Exclude<PronLevel, "missing"> => (score === null || score < 60 ? "work" : score < 80 ? "close" : "good");

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});
const arr = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(obj) : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const round = (v: number | null) => (v === null ? null : Math.round(v));

// ---- Azure ---------------------------------------------------------------------------------------------------------
/** Điểm nằm thẳng trong mục (REST) hoặc trong mục con PronunciationAssessment (SDK): tài liệu Azure có cả hai dạng. */
const score = (x: Raw, key: string) => round(num(x[key]) ?? num(obj(x.PronunciationAssessment)[key]));
const errorType = (x: Raw) => String(x.ErrorType ?? obj(x.PronunciationAssessment).ErrorType ?? "None");

/** Đọc kết quả Azure. null nếu Azure không nhận ra lời nói hoặc không có từ nào (không bịa điểm). */
export function parseAzure(json: unknown): PronResult | null {
  const r = obj(json);
  if (r.RecognitionStatus !== "Success" && r.RecognitionStatus !== 0) return null;
  const best = arr(r.NBest)[0];
  if (!best) return null;
  const words = arr(best.Words)
    .filter((w) => errorType(w) !== "Insertion")
    .map((w): PronWord => {
      const omitted = errorType(w) === "Omission";
      const s = omitted ? null : score(w, "AccuracyScore");
      return {
        word: String(w.Word ?? ""),
        level: omitted ? "missing" : azureLevel(s),
        score: s,
        syllables: arr(w.Syllables).map((x) => ({ text: String(x.Grapheme ?? x.Syllable ?? ""), score: score(x, "AccuracyScore") ?? 0 })),
        phonemes: arr(w.Phonemes).map((p) => {
          const top = arr(obj(p.PronunciationAssessment).NBestPhonemes ?? p.NBestPhonemes)[0];
          const ph = String(p.Phoneme ?? "");
          const heard = top ? String(top.Phoneme ?? "") : "";
          const sc = score(p, "AccuracyScore") ?? 0;
          return { p: ph, score: sc, heardAs: heard && heard !== ph ? heard : null, conf: Math.max(0, (100 - sc) / 100) };
        }),
      };
    });
  return words.length ? { source: "azure", words } : null;
}

// ---- Máy chấm mã nguồn mở (services/pron-modal) --------------------------------------------------------------------
/** Đọc kết quả máy chấm mã nguồn mở (điểm 0–100 cho từng âm, âm tiết, từ; cùng ngưỡng với Azure). null nếu không nghe
 * ra lời hoặc dữ liệu sai dạng. heard: null = nghe đúng, "" = không nghe thấy, khác = nghe giống âm đó. */
export const OPEN_CLEAR_WRONG = 40;

export function parseOpen(json: unknown): PronResult | null {
  const r = obj(json);
  if (r.status !== "ok") return null;
  const words = arr(r.words).map((w): PronWord => {
    const missing = w.missing === true;
    const s = missing ? null : round(num(w.score));
    const phonemes = arr(w.phones).map((p) => {
      const sc = round(num(p.score)) ?? 0;
      const heard = typeof p.heard === "string" ? p.heard : null;
      return { p: String(p.p ?? ""), score: sc, heardAs: heard, conf: Math.max(0, (100 - sc) / 100) };
    });
    // Điểm từ là trung bình nên một âm sai rõ ("pollution" đọc thành "solution") bị che: có âm nghe thành âm khác hoặc mất
    // hẳn với điểm dưới OPEN_CLEAR_WRONG thì từ không được "tốt": điểm từ còn cao (từ 60) là "gần đúng", thấp hơn là "cần luyện".
    const clearlyWrong = phonemes.some((p) => p.heardAs !== null && (p.score ?? 100) < OPEN_CLEAR_WRONG);
    const base = azureLevel(s);
    return {
      word: String(w.word ?? ""),
      level: missing ? "missing" : clearlyWrong && base === "good" ? "close" : base,
      score: s,
      syllables: arr(w.syllables).map((x) => ({ text: String(x.text ?? ""), score: round(num(x.score)) ?? 0 })),
      phonemes,
    };
  });
  return words.length ? { source: "open", words } : null;
}

/** Âm tiết và âm đáng chú ý nhất của một từ, để nói "em đọc chưa đúng phần nào". */
export function weakest(w: PronWord): { syllable: PronSyllable | null; phoneme: PronPhoneme | null } {
  const syllable = w.syllables.filter((x) => x.score < 80).sort((a, b) => a.score - b.score)[0] ?? null;
  const phoneme = w.phonemes.filter((p) => p.conf >= 0.2 && (p.heardAs !== null || (p.score ?? 100) < 80)).sort((a, b) => b.conf - a.conf)[0] ?? null;
  return { syllable, phoneme };
}
