"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectOnsetMs, shouldAutoStop } from "@/lib/speaking/onset";
import { concat, downsample, encodeWav } from "@/lib/speaking/wav";

export type MicStatus = "idle" | "requesting" | "ready" | "recording" | "denied" | "nomic" | "unsupported" | "error";
/** wav: bản WAV 16 kHz đã lọc ồn (cho chấm phát âm), chỉ có khi máy chạy được bộ thu mẫu và bản ghi ≤ 30 giây. */
/** raw: bản ghi thô từ micro (chưa lọc RNNoise), chỉ có khi đang lọc ồn; dùng để gửi lại nếu bản đã lọc bị từ chối. */
export type Recording = { blob: Blob; mime: string; onsetMs: number | null; durationMs: number; endedAt: number; startedAt: number; wav?: Blob; raw?: Blob };
/** rnnoise: lọc ồn RNNoise đang chạy; browser: chỉ bộ lọc có sẵn của trình duyệt (máy không chạy được RNNoise). */
export type NoiseFilter = "rnnoise" | "browser";

const FRAME_MS = 50;
const MAX_MS = 60_000;
const SILENCE_STOP_MS = 2500;
const WAV_MAX_MS = 30_000; // Azure chấm phát âm nhận tối đa 30 giây
const ONSET = { frameMs: FRAME_MS, calibrationMs: 300, minSpeechMs: 150, floor: 0.02 };
const RNNOISE_RATE = 48_000; // RNNoise chỉ chạy ở 48 kHz

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

const canWorklet = () => typeof AudioWorkletNode !== "undefined" && typeof WebAssembly !== "undefined";
/**
 * RNNoise chỉ dùng khi trình duyệt ghi được WebM (Chrome, Edge, Firefox, Android). Safari (iPhone, iPad, Mac) ghi MP4 từ luồng
 * Web Audio không ổn định (file hỏng, dịch vụ chép lời từ chối) nên dùng bộ lọc có sẵn của máy.
 */
const canRnnoise = () => canWorklet() && (pickMime() ?? "").startsWith("audio/webm");

/** Tạo AudioContext 48 kHz cho RNNoise; trình duyệt không cho chọn tần số thì dùng mặc định. */
function makeContext(): AudioContext {
  try {
    return new AudioContext({ sampleRate: RNNOISE_RATE });
  } catch {
    return new AudioContext();
  }
}

/**
 * Ghi âm một câu trả lời. Micro được xin một lần và giữ cho cả buổi (không hỏi lại mỗi câu).
 * Mức âm đo mỗi 50ms để: hiện thanh âm lượng, ước lượng lúc bắt đầu nói, tự dừng khi im lặng 2,5 giây sau khi đã nói.
 *
 * Lọc ồn: micro → RNNoise (xiph, chạy bằng WebAssembly trong AudioWorklet) → bản ghi gửi máy chủ và thanh âm lượng. Khi đó tắt
 * bộ lọc của trình duyệt để không lọc hai lần làm méo giọng. Máy không chạy được RNNoise (trình duyệt cũ, AudioContext chưa
 * được mở) thì ghi thẳng từ micro với bộ lọc của trình duyệt như trước. Chỉ dùng cho luyện tập; bài kiểm tra nghiên cứu
 * (lib/research/testRecorder.ts) giữ nguyên cách ghi để lần đầu và lần sau đo giống hệt nhau.
 */
export function useRecorder() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [filter, setFilter] = useState<NoiseFilter | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const cleanRef = useRef<MediaStream | null>(null); // luồng đã lọc RNNoise
  const tapRef = useRef<AudioWorkletNode | null>(null);
  const pcmRef = useRef<Float32Array[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rawRecRef = useRef<MediaRecorder | null>(null);
  const rawChunksRef = useRef<Blob[]>([]);
  const levelsRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const autoStopRef = useRef<(() => void) | null>(null);

  /**
   * Gọi NGAY trong cú bấm (trước mọi await): tạo/mở AudioContext trong lúc trình duyệt còn coi là thao tác của người dùng.
   * Safari trên iPhone chỉ cho AudioContext chạy nếu được mở trong cú bấm; không có bước này thì bản ghi qua bộ lọc sẽ im lặng.
   */
  const unlock = useCallback(() => {
    if (typeof AudioContext === "undefined") return;
    ctxRef.current ??= makeContext();
    void ctxRef.current.resume().catch(() => {});
  }, []);

  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia || !pickMime()) {
      setStatus("unsupported");
      return false;
    }
    setStatus("requesting");
    const tryRnnoise = canRnnoise();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: !tryRnnoise, autoGainControl: true, channelCount: 1 },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "nomic" : "error");
      return false;
    }
    streamRef.current = stream;

    let ctx = ctxRef.current ?? makeContext();
    let source: MediaStreamAudioSourceNode;
    try {
      source = ctx.createMediaStreamSource(stream);
    } catch {
      // Firefox: micro khác tần số với AudioContext 48 kHz → dùng AudioContext mặc định, không RNNoise.
      void ctx.close();
      ctx = new AudioContext();
      source = ctx.createMediaStreamSource(stream);
    }
    ctxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyserRef.current = analyser;

    let out: AudioNode = source;
    let used: NoiseFilter = "browser";
    if (tryRnnoise && ctx.sampleRate === RNNOISE_RATE) {
      try {
        const { loadRnnoise, RnnoiseWorkletNode } = await import("@sapphi-red/web-noise-suppressor");
        const [wasmBinary] = await Promise.all([
          loadRnnoise({ url: "/noise/rnnoise.wasm", simdUrl: "/noise/rnnoise_simd.wasm" }),
          ctx.audioWorklet.addModule("/noise/rnnoise-worklet.js"),
        ]);
        const rnn = new RnnoiseWorkletNode(ctx, { wasmBinary, maxChannels: 1 });
        source.connect(rnn);
        out = rnn;
        used = "rnnoise";
      } catch {
        // không tải được RNNoise: bật lại bộ lọc của trình duyệt
      }
    }
    if (used === "browser" && tryRnnoise) await stream.getAudioTracks()[0]?.applyConstraints({ noiseSuppression: true }).catch(() => {});

    out.connect(analyser);
    if (used === "rnnoise") {
      const dest = ctx.createMediaStreamDestination();
      out.connect(dest);
      cleanRef.current = dest.stream;
    }
    // Bộ thu mẫu cho bản WAV 16 kHz (chấm phát âm). Không chạy được thì chỉ thiếu phần chấm phát âm chi tiết.
    if (canWorklet()) {
      try {
        await ctx.audioWorklet.addModule("/noise/pcm-tap.js");
        const tap = new AudioWorkletNode(ctx, "pcm-tap");
        tap.port.onmessage = (e: MessageEvent<Float32Array>) => pcmRef.current.push(e.data);
        out.connect(tap);
        tapRef.current = tap;
      } catch {
        tapRef.current = null;
      }
    }
    setFilter(used);
    setStatus("ready");
    return true;
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = useCallback(
    async (onAutoStop: () => void): Promise<boolean> => {
      if (!(await ensureMic())) return false;
      const ctx = ctxRef.current!;
      await ctx.resume().catch(() => {});
      // AudioContext chưa chạy (Safari chặn) thì luồng đã lọc sẽ im lặng: ghi thẳng từ micro cho chắc.
      const graphOn = ctx.state === "running";
      const stream = graphOn && cleanRef.current ? cleanRef.current : streamRef.current!;
      const mime = pickMime()!;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      levelsRef.current = [];
      pcmRef.current = [];
      tapRef.current?.port.postMessage({ on: graphOn });
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data);
      rec.start(250);
      recRef.current = rec;
      // Đang ghi qua bộ lọc: ghi thêm bản thô song song để gửi lại nếu bản đã lọc bị dịch vụ chép lời từ chối.
      rawChunksRef.current = [];
      rawRecRef.current = null;
      if (stream !== streamRef.current) {
        try {
          const raw = new MediaRecorder(streamRef.current!, { mimeType: mime });
          raw.ondataavailable = (ev) => ev.data.size > 0 && rawChunksRef.current.push(ev.data);
          raw.start(250);
          rawRecRef.current = raw;
        } catch {
          rawRecRef.current = null;
        }
      }
      startedAtRef.current = Date.now();
      autoStopRef.current = onAutoStop;
      setSpeaking(false);
      setStatus("recording");

      const buf = new Float32Array(analyserRef.current!.fftSize);
      timerRef.current = setInterval(() => {
        analyserRef.current!.getFloatTimeDomainData(buf);
        let sum = 0;
        for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        levelsRef.current.push(rms);
        setLevel(rms);
        if (detectOnsetMs(levelsRef.current, ONSET) !== null) setSpeaking(true);
        const elapsed = Date.now() - startedAtRef.current;
        if (elapsed >= MAX_MS || shouldAutoStop(levelsRef.current, { ...ONSET, silenceStopMs: SILENCE_STOP_MS })) {
          clearTimer();
          autoStopRef.current?.();
        }
      }, FRAME_MS);
      return true;
    },
    [ensureMic],
  );

  const stop = useCallback(async (): Promise<Recording | null> => {
    clearTimer();
    const rec = recRef.current;
    if (!rec || rec.state === "inactive") return null;
    const endedAt = Date.now();
    const rawRec = rawRecRef.current;
    rawRecRef.current = null;
    const [blob, raw] = await Promise.all([
      new Promise<Blob>((resolve) => {
        rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
        rec.stop();
      }),
      rawRec && rawRec.state !== "inactive"
        ? new Promise<Blob | undefined>((resolve) => {
            rawRec.onstop = () => resolve(rawChunksRef.current.length ? new Blob(rawChunksRef.current, { type: rawRec.mimeType }) : undefined);
            rawRec.stop();
          })
        : Promise.resolve(undefined),
    ]);
    tapRef.current?.port.postMessage({ on: false });
    recRef.current = null;
    setStatus("ready");
    setLevel(0);
    const durationMs = endedAt - startedAtRef.current;
    let wav: Blob | undefined;
    const pcm = pcmRef.current;
    pcmRef.current = [];
    if (pcm.length > 0 && durationMs <= WAV_MAX_MS && ctxRef.current) {
      const bytes = encodeWav(downsample(concat(pcm), ctxRef.current.sampleRate));
      wav = new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
    }
    return {
      blob,
      mime: rec.mimeType.split(";")[0],
      onsetMs: detectOnsetMs(levelsRef.current, ONSET),
      durationMs,
      startedAt: startedAtRef.current,
      endedAt,
      wav,
      raw,
    };
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close();
    },
    [],
  );

  return { status, level, speaking, filter, unlock, ensureMic, start, stop };
}
