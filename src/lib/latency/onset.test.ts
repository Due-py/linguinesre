import { describe, expect, it } from "vitest";
import { calibrateThreshold, createOnsetTracker, createSilenceTracker } from "./onset";

/** Feeds samples every 10 ms and returns the first non-null result. */
function feed<T>(push: (t: number, level: number) => T | null, levels: number[], startMs = 0) {
  for (let i = 0; i < levels.length; i++) {
    const out = push(startMs + i * 10, levels[i]);
    if (out !== null) return out;
  }
  return null;
}

describe("calibrateThreshold", () => {
  it("uses the minimum level in a very quiet room", () => {
    expect(calibrateThreshold([0.001, 0.002, 0.001])).toBe(0.015);
  });

  it("scales the noise p95 in a noisy room", () => {
    const noise = Array.from({ length: 100 }, (_, i) => (i < 95 ? 0.01 : 0.02));
    expect(calibrateThreshold(noise)).toBeCloseTo(0.06);
  });

  it("falls back to the minimum with no samples", () => {
    expect(calibrateThreshold([])).toBe(0.015);
  });
});

describe("createOnsetTracker", () => {
  it("reports the start of a sustained loud run", () => {
    const tracker = createOnsetTracker(0.05, 30);
    const levels = [0.01, 0.01, 0.01, 0.2, 0.2, 0.2, 0.2, 0.2];
    expect(feed(tracker.push, levels, 1000)).toEqual({ onsetMs: 1030, startedOnFirstSample: false });
  });

  it("ignores a short click", () => {
    const tracker = createOnsetTracker(0.05, 30);
    expect(feed(tracker.push, [0.01, 0.3, 0.01, 0.01, 0.3, 0.3, 0.01])).toBeNull();
  });

  it("flags a run that was already going on the first sample", () => {
    const tracker = createOnsetTracker(0.05, 30);
    expect(feed(tracker.push, [0.2, 0.2, 0.2, 0.2])).toEqual({ onsetMs: 0, startedOnFirstSample: true });
  });

  it("restarts the run after a dip", () => {
    const tracker = createOnsetTracker(0.05, 30);
    const levels = [0.01, 0.2, 0.2, 0.01, 0.2, 0.2, 0.2, 0.2];
    expect(feed(tracker.push, levels)?.onsetMs).toBe(40);
  });
});

describe("createSilenceTracker", () => {
  it("returns when the quiet stretch began once it is long enough", () => {
    const tracker = createSilenceTracker(0.05, 50);
    const levels = [0.2, 0.2, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
    expect(feed(tracker.push, levels)).toBe(20);
  });

  it("resets when the student speaks again", () => {
    const tracker = createSilenceTracker(0.05, 50);
    const levels = [0.01, 0.01, 0.01, 0.2, 0.01, 0.01, 0.01];
    expect(feed(tracker.push, levels)).toBeNull();
  });
});
