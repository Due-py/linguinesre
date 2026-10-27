import { describe, expect, it } from "vitest";
import { afterPrompt, classifyTrial, summarize, toCsv, type TrialResult } from "./measure";

function trial(partial: Partial<TrialResult>): TrialResult {
  return {
    index: 1,
    questionId: "q1",
    mode: "A",
    promptEndMs: 0,
    onsetMs: null,
    latencyMs: null,
    status: "ok",
    ...partial,
  };
}

describe("classifyTrial", () => {
  it("measures from the end of the question to voice onset", () => {
    const out = classifyTrial({ promptEndMs: 5000, onset: { onsetMs: 6234.6, startedOnFirstSample: false } });
    expect(out).toEqual({ onsetMs: 6234.6, latencyMs: 1235, status: "ok" });
  });

  it("marks no voice as a timeout", () => {
    expect(classifyTrial({ promptEndMs: 5000, onset: null })).toEqual({
      onsetMs: null,
      latencyMs: null,
      status: "timeout",
    });
  });

  it("treats an impossibly fast answer as early", () => {
    const tooFast = classifyTrial({ promptEndMs: 5000, onset: { onsetMs: 5149, startedOnFirstSample: false } });
    expect(tooFast).toEqual({ onsetMs: 5149, latencyMs: null, status: "early" });
    const justOk = classifyTrial({ promptEndMs: 5000, onset: { onsetMs: 5150, startedOnFirstSample: false } });
    expect(justOk).toEqual({ onsetMs: 5150, latencyMs: 150, status: "ok" });
  });

  it("does not give a latency when the student was already talking", () => {
    const out = classifyTrial({ promptEndMs: 5000, onset: { onsetMs: 5010, startedOnFirstSample: true } });
    expect(out.status).toBe("early");
    expect(out.latencyMs).toBeNull();
  });
});

describe("afterPrompt", () => {
  it("rounds the gap and keeps missing events as null", () => {
    expect(afterPrompt(1000, 1499.6)).toBe(500);
    expect(afterPrompt(1000, null)).toBeNull();
    expect(afterPrompt(1000, undefined)).toBeNull();
  });
});

describe("summarize", () => {
  it("only uses ok trials for the statistics", () => {
    const results = [
      trial({ latencyMs: 900 }),
      trial({ latencyMs: 1100 }),
      trial({ latencyMs: 1500 }),
      trial({ latencyMs: 700 }),
      trial({ status: "timeout" }),
      trial({ status: "early", onsetMs: 10 }),
      trial({ status: "error", error: "mic" }),
    ];
    expect(summarize(results)).toEqual({
      trials: 7,
      ok: 4,
      early: 1,
      timeouts: 1,
      errors: 1,
      medianMs: 900,
      meanMs: 1050,
      p90Ms: 1500,
      minMs: 700,
      maxMs: 1500,
    });
  });

  it("returns nulls when nothing was measured", () => {
    const s = summarize([trial({ status: "timeout" })]);
    expect(s.ok).toBe(0);
    expect(s.medianMs).toBeNull();
    expect(s.meanMs).toBeNull();
  });
});

describe("toCsv", () => {
  it("writes a header and escapes commas and quotes", () => {
    const csv = toCsv(
      [trial({ latencyMs: 812, transcript: 'I like "reading", and cooking' })],
      "iPhone 13, Safari",
    );
    const [header, row] = csv.split("\n");
    expect(header.startsWith("device,index,questionId,mode,status,latencyMs")).toBe(true);
    expect(row).toBe('"iPhone 13, Safari",1,q1,A,ok,812,,,,"I like ""reading"", and cooking",');
  });
});
