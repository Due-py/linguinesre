/**
 * Tính điểm FLCAS (Horwitz, Horwitz & Cope, 1986) từ một dòng câu trả lời Google Forms.
 * - Thang 1–5. Câu nói về sự thoải mái được tính ngược: điểm = 6 − lựa chọn. Điểm cao = lo âu cao.
 * - Câu được nhận ra nhờ số ở đầu tiêu đề cột ("9. Em bắt đầu hoảng…"), do form tạo bởi FormFlcas.gs.
 * - Không tự "bù" câu bỏ trống: trung bình tính trên các câu đã trả lời và báo số câu thiếu để người phân tích quyết định
 *   theo kế hoạch phân tích đã khóa.
 * Phải khớp với research-system/google-apps-script/FormFlcas.gs (test tests/research-forms.test.ts kiểm tra).
 */

export const FLCAS_ITEMS = 33;
export const FLCAS_REVERSED = [2, 5, 8, 11, 14, 18, 22, 28, 32] as const;
/** Các câu về Nói (communication apprehension). Nhóm phải chốt trong kế hoạch phân tích trước khi thu dữ liệu. */
export const FLCAS_SPEAKING = [1, 9, 14, 18, 24, 27, 29, 32] as const;

export type FlcasScore = {
  /** Trung bình 33 câu (1–5) sau khi tính ngược. null nếu không có câu nào. */
  mean: number | null;
  /** Trung bình các câu về Nói (chỉ số chính theo Quy trình mục 1.4). */
  speakingMean: number | null;
  /** Tổng điểm 33–165 (chỉ khi trả lời đủ 33 câu, để so sánh với các nghiên cứu khác). */
  total: number | null;
  answered: number;
  missing: number[];
  /** Điểm từng câu sau khi tính ngược, theo số câu gốc. */
  items: Record<number, number>;
};

/** Số câu gốc từ tiêu đề cột "12. ...", null nếu không phải câu FLCAS. */
export function flcasItemNo(header: string): number | null {
  const m = /^\s*(\d{1,2})\.\s/.exec(header);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= FLCAS_ITEMS ? n : null;
}

export function scoreValue(n: number, raw: unknown): number | null {
  const v = typeof raw === "number" ? raw : Number(String(raw ?? "").trim().charAt(0));
  if (!Number.isInteger(v) || v < 1 || v > 5) return null;
  return (FLCAS_REVERSED as readonly number[]).includes(n) ? 6 - v : v;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function scoreFlcas(headers: string[], row: unknown[], expected: readonly number[] = range(FLCAS_ITEMS)): FlcasScore {
  const items: Record<number, number> = {};
  headers.forEach((h, i) => {
    const n = flcasItemNo(h);
    if (n === null) return;
    const v = scoreValue(n, row[i]);
    if (v !== null) items[n] = v;
  });
  const missing = expected.filter((n) => items[n] === undefined);
  const values = expected.filter((n) => items[n] !== undefined).map((n) => items[n]);
  const speaking = FLCAS_SPEAKING.filter((n) => items[n] !== undefined).map((n) => items[n]);
  return {
    mean: mean(values),
    speakingMean: mean(speaking),
    total: missing.length === 0 && expected.length === FLCAS_ITEMS ? values.reduce((a, b) => a + b, 0) : null,
    answered: values.length,
    missing,
    items,
  };
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}
