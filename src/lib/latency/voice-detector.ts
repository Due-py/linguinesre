// Browser-only audio helpers for the latency lab. Every timestamp returned
// here is a performance.now() value so it can be compared with the others.

import { createOnsetTracker, createSilenceTracker, type OnsetResult } from "./onset";

const POLL_MS = 10;

/** Reads the current microphone loudness (RMS of the latest frame). */
export class MicLevelMeter {
  private constructor(
    private readonly stream: MediaStream,
    private readonly analyser: AnalyserNode,
    private readonly buffer: Float32Array<ArrayBuffer>,
  ) {}

  static async open(ctx: AudioContext): Promise<MicLevelMeter> {
    const stream = await navigator.mediaDevices.getUserMedia({
      // Echo cancellation keeps the question audio from the speaker from
      // being mistaken for the student's voice.
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    // Muted path to the destination: some browsers only process nodes that
    // end up connected to the output.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(analyser).connect(mute).connect(ctx.destination);
    return new MicLevelMeter(stream, analyser, new Float32Array(analyser.fftSize));
  }

  level(): number {
    this.analyser.getFloatTimeDomainData(this.buffer);
    let sum = 0;
    for (const sample of this.buffer) sum += sample * sample;
    return Math.sqrt(sum / this.buffer.length);
  }

  close() {
    this.stream.getTracks().forEach((track) => track.stop());
  }
}

/** Polls the meter every 10 ms until `onSample` returns a value or `timeoutMs` passes. */
function poll<T>(
  meter: MicLevelMeter,
  timeoutMs: number,
  onSample: (timeMs: number, level: number) => T | null,
  signal?: AbortSignal,
): Promise<T | null> {
  return new Promise((resolve) => {
    const startMs = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const out = onSample(now, meter.level());
      if (out !== null || now - startMs >= timeoutMs || signal?.aborted) {
        clearInterval(timer);
        resolve(out);
      }
    }, POLL_MS);
  });
}

/** Records levels while the student stays silent, for calibrateThreshold(). */
export async function sampleNoise(meter: MicLevelMeter, durationMs: number): Promise<number[]> {
  const levels: number[] = [];
  await poll(meter, durationMs, (_t, level) => {
    levels.push(level);
    return null;
  });
  return levels;
}

export function waitForOnset(
  meter: MicLevelMeter,
  opts: { threshold: number; minRunMs: number; timeoutMs: number; signal?: AbortSignal },
): Promise<OnsetResult | null> {
  const tracker = createOnsetTracker(opts.threshold, opts.minRunMs);
  return poll(meter, opts.timeoutMs, tracker.push, opts.signal);
}

export function waitForSilence(
  meter: MicLevelMeter,
  opts: { threshold: number; silenceMs: number; timeoutMs: number; signal?: AbortSignal },
): Promise<number | null> {
  const tracker = createSilenceTracker(opts.threshold, opts.silenceMs);
  return poll(meter, opts.timeoutMs, tracker.push, opts.signal);
}

export async function loadAudio(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được âm thanh ${url} (${res.status})`);
  return ctx.decodeAudioData(await res.arrayBuffer());
}

/**
 * Plays a question and resolves once it has finished. `promptEndMs` is computed
 * from the audio clock (scheduled start + duration + output latency), which is
 * more precise than the time the `ended` event happens to fire.
 */
export function playPrompt(ctx: AudioContext, buffer: AudioBuffer): Promise<{ promptEndMs: number }> {
  const anchorPerf = performance.now();
  const anchorCtx = ctx.currentTime;
  const startAt = anchorCtx + 0.05;
  const outputLatencyS = ctx.outputLatency || ctx.baseLatency || 0;
  const promptEndMs = anchorPerf + (startAt + buffer.duration - anchorCtx + outputLatencyS) * 1000;

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  return new Promise((resolve) => {
    source.onended = () => resolve({ promptEndMs });
    source.start(startAt);
  });
}

// --- Mode B: browser speech recognition (Web Speech API) ---

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isRecognitionSupported(): boolean {
  return typeof window !== "undefined" && getRecognitionCtor() !== null;
}

export interface RecognitionTimes {
  audioStartMs: number | null;
  speechStartMs: number | null;
  firstResultMs: number | null;
  transcript: string;
  error: string | null;
}

/** Starts English recognition and records when each event arrives. */
export function startRecognition() {
  const Ctor = getRecognitionCtor();
  const times: RecognitionTimes = {
    audioStartMs: null,
    speechStartMs: null,
    firstResultMs: null,
    transcript: "",
    error: Ctor ? null : "unsupported",
  };
  if (!Ctor) return { times, stop: async () => times };

  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;

  let finished: () => void = () => {};
  const done = new Promise<void>((resolve) => (finished = resolve));

  rec.addEventListener("audiostart", () => (times.audioStartMs ??= performance.now()));
  rec.addEventListener("speechstart", () => (times.speechStartMs ??= performance.now()));
  rec.addEventListener("result", (event) => {
    times.firstResultMs ??= performance.now();
    const results = (event as unknown as { results: ArrayLike<ArrayLike<{ transcript: string }>> }).results;
    times.transcript = Array.from(results, (r) => r[0].transcript).join(" ").trim();
  });
  rec.addEventListener("error", (event) => {
    times.error = (event as unknown as { error?: string }).error ?? "error";
  });
  rec.addEventListener("end", () => finished());

  try {
    rec.start();
  } catch (err) {
    times.error = err instanceof Error ? err.message : String(err);
    finished();
  }

  return {
    times,
    /** Stops listening and waits (max 2 s) for the final transcript. */
    async stop(): Promise<RecognitionTimes> {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
      await Promise.race([done, new Promise((r) => setTimeout(r, 2000))]);
      return times;
    },
  };
}
