"use client";

// Phase 1 latency spike: plays a question, detects when the student starts
// speaking, and records the gap. See docs/latency-spike/README.md.

import { useRef, useState, useSyncExternalStore } from "react";
import { classifyTrial, afterPrompt, summarize, toCsv, type TrialMode, type TrialResult } from "@/lib/latency/measure";
import { calibrateThreshold } from "@/lib/latency/onset";
import { LAB_QUESTIONS } from "@/lib/latency/questions";
import {
  MicLevelMeter,
  isRecognitionSupported,
  loadAudio,
  playPrompt,
  sampleNoise,
  startRecognition,
  waitForOnset,
  waitForSilence,
} from "@/lib/latency/voice-detector";

const CALIBRATE_MS = 2000;
const MIN_SPEECH_RUN_MS = 60;
const LISTEN_TIMEOUT_MS = 8000;
const END_SILENCE_MS = 1000;
const MAX_ANSWER_MS = 10000;
const PAUSE_BETWEEN_MS = 1200;

type Phase = "idle" | "calibrating" | "playing" | "listening" | "pause" | "done" | "error";

interface LabEnvironment {
  startedAt: string;
  userAgent: string;
  sampleRate: number;
  baseLatencyMs: number | null;
  outputLatencyMs: number | null;
  threshold: number;
  recognitionSupported: boolean;
}

/** Each round visits every question once, in a new random order. */
function buildOrder(count: number): number[] {
  const order: number[] = [];
  while (order.length < count) {
    const round = LAB_QUESTIONS.map((_, i) => i).sort(() => Math.random() - 0.5);
    order.push(...round);
  }
  return order.slice(0, count);
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function describeError(err: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.mediaDevices) {
    return "Trình duyệt không cho dùng micro. Hãy mở trang bằng link https (Vercel) và dùng Chrome hoặc Safari.";
  }
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") return "Bạn chưa cho phép dùng micro. Bấm vào biểu tượng ổ khóa trên thanh địa chỉ để cho phép, rồi thử lại.";
    if (err.name === "NotFoundError") return "Không tìm thấy micro trên máy này.";
  }
  return `Có lỗi: ${err instanceof Error ? err.message : String(err)}`;
}

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fileStem(device: string) {
  const slug = device.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "thiet-bi";
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return `latency-${slug}-${stamp}`;
}

const noopSubscribe = () => () => {};

export default function LatencyLabPage() {
  const [device, setDevice] = useState("");
  const [mode, setMode] = useState<TrialMode>("A");
  const [trialCount, setTrialCount] = useState(20);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<TrialResult[]>([]);
  const [env, setEnv] = useState<LabEnvironment | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const levelBarRef = useRef<HTMLDivElement>(null);
  const recognitionSupported = useSyncExternalStore(noopSubscribe, isRecognitionSupported, () => false);

  const running = phase === "calibrating" || phase === "playing" || phase === "listening" || phase === "pause";
  const summary = summarize(results);

  async function run() {
    const controller = new AbortController();
    const { signal } = controller;
    abortRef.current = controller;
    setResults([]);
    setEnv(null);
    setPhase("calibrating");
    setMessage("Đang xin quyền dùng micro…");

    let ctx: AudioContext | undefined;
    let meter: MicLevelMeter | undefined;
    let raf = 0;
    try {
      ctx = new AudioContext();
      await ctx.resume();
      meter = await MicLevelMeter.open(ctx);
      const audioCtx = ctx;
      const buffers = await Promise.all(LAB_QUESTIONS.map((q) => loadAudio(audioCtx, q.audio)));

      const liveMeter = meter;
      const draw = () => {
        if (levelBarRef.current) {
          levelBarRef.current.style.width = `${Math.min(100, liveMeter.level() * 400)}%`;
        }
        raf = requestAnimationFrame(draw);
      };
      draw();

      setMessage("Giữ im lặng 2 giây để máy đo tiếng ồn xung quanh…");
      const threshold = calibrateThreshold(await sampleNoise(meter, CALIBRATE_MS));
      setEnv({
        startedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
        sampleRate: ctx.sampleRate,
        baseLatencyMs: ctx.baseLatency ? Math.round(ctx.baseLatency * 1000) : null,
        outputLatencyMs: ctx.outputLatency ? Math.round(ctx.outputLatency * 1000) : null,
        threshold: Number(threshold.toFixed(4)),
        recognitionSupported,
      });

      const order = buildOrder(trialCount);
      const collected: TrialResult[] = [];
      for (let i = 0; i < order.length && !signal.aborted; i++) {
        const q = LAB_QUESTIONS[order[i]];
        setPhase("playing");
        setMessage(`Câu ${i + 1}/${order.length}: nghe câu hỏi…`);
        const { promptEndMs } = await playPrompt(ctx, buffers[order[i]]);
        if (signal.aborted) break;

        setPhase("listening");
        setMessage(`Câu ${i + 1}/${order.length}: trả lời đi!`);
        const rec = mode === "A+B" ? startRecognition() : null;
        const onset = await waitForOnset(meter, {
          threshold,
          minRunMs: MIN_SPEECH_RUN_MS,
          timeoutMs: LISTEN_TIMEOUT_MS,
          signal,
        });
        if (onset && !signal.aborted) {
          await waitForSilence(meter, { threshold, silenceMs: END_SILENCE_MS, timeoutMs: MAX_ANSWER_MS, signal });
        }
        const times = rec ? await rec.stop() : null;
        if (signal.aborted) break;

        const result: TrialResult = {
          index: i + 1,
          questionId: q.id,
          mode,
          promptEndMs,
          ...classifyTrial({ promptEndMs, onset }),
          ...(times && {
            recAudioStartAfterMs: afterPrompt(promptEndMs, times.audioStartMs),
            recSpeechStartAfterMs: afterPrompt(promptEndMs, times.speechStartMs),
            recFirstResultAfterMs: afterPrompt(promptEndMs, times.firstResultMs),
            transcript: times.transcript,
            error: times.error ?? undefined,
          }),
        };
        collected.push(result);
        setResults([...collected]);

        setPhase("pause");
        await sleep(PAUSE_BETWEEN_MS, signal);
      }
      setPhase("done");
      setMessage(signal.aborted ? "Đã dừng. Kết quả đến lúc dừng vẫn được giữ lại." : "Xong! Tải kết quả bên dưới.");
    } catch (err) {
      setPhase("error");
      setMessage(describeError(err));
    } finally {
      cancelAnimationFrame(raf);
      if (levelBarRef.current) levelBarRef.current.style.width = "0%";
      meter?.close();
      await ctx?.close();
      abortRef.current = null;
    }
  }

  const deviceLabel = device.trim() || "không ghi tên";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent-ink">
          Phòng thử nghiệm · Giai đoạn 1
        </span>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Đo thời gian phản xạ</h1>
        <p className="text-muted">
          Máy đọc một câu hỏi tiếng Anh. Khi câu hỏi kết thúc, hãy trả lời to và rõ. Máy tự nghe lúc bạn{" "}
          <b>bắt đầu nói</b> và ghi lại thời gian, không cần bấm nút.
        </p>
      </header>

      <section className="grid gap-4 rounded-3xl bg-surface p-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-3">
          <span className="text-sm font-semibold">Tên thiết bị</span>
          <input
            value={device}
            onChange={(e) => setDevice(e.target.value)}
            disabled={running}
            placeholder="Ví dụ: iPhone 13 - Safari"
            className="rounded-2xl border border-line bg-background px-4 py-3 text-base"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-semibold">Cách đo</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as TrialMode)}
            disabled={running}
            className="rounded-2xl border border-line bg-background px-4 py-3 text-base"
          >
            <option value="A">A: chỉ đo độ to của tiếng</option>
            <option value="A+B" disabled={!recognitionSupported}>
              A + B: đo độ to và nhận dạng giọng nói{recognitionSupported ? "" : " (máy này không hỗ trợ)"}
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold">Số lần đo</span>
          <input
            type="number"
            min={1}
            max={50}
            value={trialCount}
            onChange={(e) => setTrialCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            disabled={running}
            className="rounded-2xl border border-line bg-background px-4 py-3 text-base"
          />
        </label>
        <div className="flex gap-3 sm:col-span-3">
          {running ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="rounded-full bg-foreground px-6 py-3 font-bold text-background"
            >
              Dừng
            </button>
          ) : (
            <button onClick={run} className="rounded-full bg-accent px-6 py-3 font-bold text-accent-ink">
              Bắt đầu
            </button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-level-1 p-5">
        <p className="text-lg font-bold" aria-live="polite">
          {message || "Bấm “Bắt đầu”. Dùng tai nghe hoặc để loa nhỏ vừa phải."}
        </p>
        <div className="h-3 overflow-hidden rounded-full bg-surface" aria-hidden>
          <div ref={levelBarRef} className="h-full w-0 rounded-full bg-accent" />
        </div>
        <p className="text-sm text-muted">Thanh xanh là độ to của tiếng micro đang nghe.</p>
      </section>

      {results.length > 0 && (
        <section className="flex flex-col gap-4 rounded-3xl bg-surface p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Trung vị" value={summary.medianMs} unit="ms" />
            <Stat label="Trung bình" value={summary.meanMs} unit="ms" />
            <Stat label="Hợp lệ" value={summary.ok} unit={`/ ${summary.trials}`} />
            <Stat label="Không trả lời / nói sớm" value={summary.timeouts + summary.early} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Câu</th>
                  <th className="py-2 pr-3">Kết quả</th>
                  <th className="py-2 pr-3">Phản xạ</th>
                  {mode === "A+B" && <th className="py-2 pr-3">Máy nghe được</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.index} className="border-t border-line">
                    <td className="py-2 pr-3">{r.index}</td>
                    <td className="py-2 pr-3">{r.questionId}</td>
                    <td className="py-2 pr-3">{STATUS_LABEL[r.status]}</td>
                    <td className="py-2 pr-3 font-bold">{r.latencyMs !== null ? `${r.latencyMs} ms` : "—"}</td>
                    {mode === "A+B" && (
                      <td className="py-2 pr-3">{r.transcript || (r.error ? `lỗi: ${r.error}` : "—")}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!running && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => download(`${fileStem(device)}.csv`, toCsv(results, deviceLabel), "text/csv")}
                className="rounded-full bg-accent px-5 py-2 font-bold text-accent-ink"
              >
                Tải CSV
              </button>
              <button
                onClick={() =>
                  download(
                    `${fileStem(device)}.json`,
                    JSON.stringify({ device: deviceLabel, environment: env, summary, results }, null, 2),
                    "application/json",
                  )
                }
                className="rounded-full border border-line px-5 py-2 font-bold"
              >
                Tải JSON
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

const STATUS_LABEL: Record<TrialResult["status"], string> = {
  ok: "Hợp lệ",
  early: "Nói sớm",
  timeout: "Không nghe thấy",
  error: "Lỗi",
};

function Stat({ label, value, unit }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">
        {value ?? "—"}
        {value !== null && unit && <span className="ml-1 text-sm font-semibold text-muted">{unit}</span>}
      </p>
    </div>
  );
}
