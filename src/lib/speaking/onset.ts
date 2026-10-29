/**
 * Phát hiện lúc học sinh bắt đầu nói và lúc ngừng nói, từ chuỗi mức năng lượng (RMS) đo đều đặn trong trình duyệt.
 * Đây là ƯỚC LƯỢNG: tiếng ồn, tiếng ho hay tiếng "ừm" có thể bị tính là bắt đầu nói. Giao diện phải ghi rõ như vậy.
 *
 * Quy tắc:
 *  - Mức nền ồn = trung vị các khung đầu (lúc học sinh còn im lặng suy nghĩ).
 *  - Ngưỡng nói = max(nền × 3, sàn tuyệt đối) để micro rất nhạy vẫn không bắt nhầm tiếng thở.
 *  - "Bắt đầu nói" khi vượt ngưỡng liên tiếp ≥ minSpeechMs; mốc tính từ khung đầu tiên của đoạn đó.
 *  - "Ngừng nói" (để tự dừng ghi) khi đã nói và im lặng liên tiếp ≥ silenceStopMs.
 */
export type OnsetOptions = { frameMs: number; calibrationMs?: number; minSpeechMs?: number; floor?: number; ratio?: number };

const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

export function speechThreshold(levels: number[], opts: OnsetOptions): number {
  const calFrames = Math.max(1, Math.round((opts.calibrationMs ?? 300) / opts.frameMs));
  return Math.max(median(levels.slice(0, calFrames)) * (opts.ratio ?? 3), opts.floor ?? 0.02);
}

/** Trả số mili giây từ đầu bản ghi tới lúc bắt đầu nói, hoặc null nếu không thấy tiếng nói. */
export function detectOnsetMs(levels: number[], opts: OnsetOptions): number | null {
  const threshold = speechThreshold(levels, opts);
  const need = Math.max(1, Math.round((opts.minSpeechMs ?? 150) / opts.frameMs));
  let run = 0;
  for (let i = 0; i < levels.length; i++) {
    run = levels[i] >= threshold ? run + 1 : 0;
    if (run >= need) return (i - need + 1) * opts.frameMs;
  }
  return null;
}

/** Đã nói rồi im lặng đủ lâu chưa (dùng để tự dừng ghi). */
export function shouldAutoStop(levels: number[], opts: OnsetOptions & { silenceStopMs: number }): boolean {
  const onset = detectOnsetMs(levels, opts);
  if (onset === null) return false;
  const threshold = speechThreshold(levels, opts);
  const need = Math.round(opts.silenceStopMs / opts.frameMs);
  let quiet = 0;
  for (let i = levels.length - 1; i >= 0 && levels[i] < threshold; i--) quiet++;
  return quiet >= need && levels.length * opts.frameMs - quiet * opts.frameMs > onset;
}

export const countWords = (s: string) => (s.trim().match(/[A-Za-z']+/g) ?? []).length;
