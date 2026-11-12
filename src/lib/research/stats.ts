/**
 * Thống kê mô tả cho trang nghiên cứu. Chỉ MÔ TẢ (trung bình, trung vị, độ lệch chuẩn, kappa, alpha).
 * Phép kiểm định chính (ANCOVA) làm trên Colab/JASP theo kế hoạch phân tích đã khóa, không làm ở đây.
 */

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Độ lệch chuẩn mẫu (chia n − 1). */
export function sd(xs: number[]): number | null {
  if (xs.length < 2) return null;
  const m = mean(xs)!;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/**
 * Cohen's kappa (không trọng số) cho hai người chấm cùng một bộ câu, điểm 0/1/2 (Quy trình mục 3.6).
 * pairs: [điểm người 1, điểm người 2]. null nếu chưa có cặp nào.
 */
export function cohenKappa(pairs: [number, number][], categories: number[] = [0, 1, 2]): { kappa: number | null; agree: number | null; n: number } {
  const n = pairs.length;
  if (n === 0) return { kappa: null, agree: null, n };
  const po = pairs.filter(([a, b]) => a === b).length / n;
  let pe = 0;
  for (const c of categories) {
    const p1 = pairs.filter(([a]) => a === c).length / n;
    const p2 = pairs.filter(([, b]) => b === c).length / n;
    pe += p1 * p2;
  }
  return { kappa: pe === 1 ? (po === 1 ? 1 : null) : (po - pe) / (1 - pe), agree: po, n };
}

/** Cronbach's alpha. rows: mỗi người một mảng điểm các câu (cùng độ dài, không thiếu). */
export function cronbachAlpha(rows: number[][]): number | null {
  const k = rows[0]?.length ?? 0;
  if (rows.length < 2 || k < 2 || rows.some((r) => r.length !== k)) return null;
  const variance = (xs: number[]) => sd(xs)! ** 2;
  const itemVar = Array.from({ length: k }, (_, j) => variance(rows.map((r) => r[j]))).reduce((a, b) => a + b, 0);
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (totalVar === 0) return null;
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}

export function round(x: number | null, digits = 2): number | null {
  return x === null || !Number.isFinite(x) ? null : Math.round(x * 10 ** digits) / 10 ** digits;
}
