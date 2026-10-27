// Response latency = time from the end of the question audio to the first
// detected voice. All times are performance.now() milliseconds.

export type TrialMode = "A" | "A+B";
export type TrialStatus = "ok" | "early" | "timeout" | "error";

export interface TrialResult {
  index: number;
  questionId: string;
  mode: TrialMode;
  promptEndMs: number;
  onsetMs: number | null;
  latencyMs: number | null;
  status: TrialStatus;
  /** Mode B only: Web Speech events, measured from promptEndMs. */
  recAudioStartAfterMs?: number | null;
  recSpeechStartAfterMs?: number | null;
  recFirstResultAfterMs?: number | null;
  transcript?: string;
  error?: string;
}

/**
 * Nobody can hear the end of a question and start answering faster than this,
 * so quicker onsets mean the student talked over the question or anticipated it.
 */
export const MIN_PLAUSIBLE_LATENCY_MS = 150;

export function classifyTrial(input: {
  promptEndMs: number;
  onset: { onsetMs: number; startedOnFirstSample: boolean } | null;
}): Pick<TrialResult, "onsetMs" | "latencyMs" | "status"> {
  const { promptEndMs, onset } = input;
  if (onset === null) return { onsetMs: null, latencyMs: null, status: "timeout" };
  const latencyMs = Math.round(onset.onsetMs - promptEndMs);
  if (onset.startedOnFirstSample || latencyMs < MIN_PLAUSIBLE_LATENCY_MS) {
    // Not a real reaction time, so it must not count towards the statistics.
    return { onsetMs: onset.onsetMs, latencyMs: null, status: "early" };
  }
  return { onsetMs: onset.onsetMs, latencyMs, status: "ok" };
}

/** Converts an event time to "ms after the question ended", or null. */
export function afterPrompt(promptEndMs: number, eventMs: number | null | undefined): number | null {
  return eventMs == null ? null : Math.round(eventMs - promptEndMs);
}

export interface LatencySummary {
  trials: number;
  ok: number;
  early: number;
  timeouts: number;
  errors: number;
  medianMs: number | null;
  meanMs: number | null;
  p90Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
}

/** Nearest-rank percentile of an ascending array. */
function percentile(sorted: number[], p: number): number {
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

export function summarize(results: TrialResult[]): LatencySummary {
  const values = results
    .filter((r) => r.status === "ok" && r.latencyMs !== null)
    .map((r) => r.latencyMs as number)
    .sort((a, b) => a - b);
  const count = (s: TrialStatus) => results.filter((r) => r.status === s).length;
  const has = values.length > 0;

  return {
    trials: results.length,
    ok: values.length,
    early: count("early"),
    timeouts: count("timeout"),
    errors: count("error"),
    medianMs: has ? percentile(values, 50) : null,
    meanMs: has ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null,
    p90Ms: has ? percentile(values, 90) : null,
    minMs: has ? values[0] : null,
    maxMs: has ? values[values.length - 1] : null,
  };
}

const CSV_COLUMNS = [
  "device",
  "index",
  "questionId",
  "mode",
  "status",
  "latencyMs",
  "recAudioStartAfterMs",
  "recSpeechStartAfterMs",
  "recFirstResultAfterMs",
  "transcript",
  "error",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(results: TrialResult[], device: string): string {
  const rows = results.map((r) =>
    CSV_COLUMNS.map((col) => csvCell(col === "device" ? device : r[col])).join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}
