// Pure voice-onset logic, fed with (time, level) samples from the mic meter.
// Kept free of browser APIs so it can be unit-tested.

export interface ThresholdOptions {
  /** Threshold = noise p95 x multiplier ... */
  multiplier?: number;
  /** ... but never below this RMS level. */
  minLevel?: number;
}

/** Pick a speech threshold from levels recorded while the student is silent. */
export function calibrateThreshold(
  noiseLevels: number[],
  { multiplier = 3, minLevel = 0.015 }: ThresholdOptions = {},
): number {
  if (noiseLevels.length === 0) return minLevel;
  const sorted = [...noiseLevels].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return Math.max(minLevel, p95 * multiplier);
}

export interface OnsetResult {
  /** Time of the first sample of the loud run. */
  onsetMs: number;
  /** The run began on the very first sample, i.e. the student was already talking when we started listening. */
  startedOnFirstSample: boolean;
}

/**
 * Detects speech onset: the level must stay at or above `threshold` for at
 * least `minRunMs` so that a single click or bump does not count.
 */
export function createOnsetTracker(threshold: number, minRunMs: number) {
  let firstSampleMs: number | null = null;
  let runStartMs: number | null = null;

  return {
    push(timeMs: number, level: number): OnsetResult | null {
      if (firstSampleMs === null) firstSampleMs = timeMs;
      if (level < threshold) {
        runStartMs = null;
        return null;
      }
      if (runStartMs === null) runStartMs = timeMs;
      if (timeMs - runStartMs < minRunMs) return null;
      return { onsetMs: runStartMs, startedOnFirstSample: runStartMs === firstSampleMs };
    },
  };
}

/** Detects the end of an answer: level below `threshold` for at least `silenceMs`. */
export function createSilenceTracker(threshold: number, silenceMs: number) {
  let quietStartMs: number | null = null;

  return {
    /** Returns the time the silence began once it has lasted long enough. */
    push(timeMs: number, level: number): number | null {
      if (level >= threshold) {
        quietStartMs = null;
        return null;
      }
      if (quietStartMs === null) quietStartMs = timeMs;
      return timeMs - quietStartMs >= silenceMs ? quietStartMs : null;
    },
  };
}
