"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectOnsetMs, shouldAutoStop } from "@/lib/speaking/onset";

export type MicStatus = "idle" | "requesting" | "ready" | "recording" | "denied" | "nomic" | "unsupported" | "error";
export type Recording = { blob: Blob; mime: string; onsetMs: number | null; durationMs: number; endedAt: number; startedAt: number };

const FRAME_MS = 50;
const MAX_MS = 60_000;
const SILENCE_STOP_MS = 2500;
const ONSET = { frameMs: FRAME_MS, calibrationMs: 300, minSpeechMs: 150, floor: 0.02 };

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return null;
}

/**
 * Ghi âm một câu trả lời. Micro được xin một lần và giữ cho cả buổi (không hỏi lại mỗi câu).
 * Mức âm đo mỗi 50ms để: hiện thanh âm lượng, ước lượng lúc bắt đầu nói, tự dừng khi im lặng 2,5 giây sau khi đã nói.
 */
export function useRecorder() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const levelsRef = useRef<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const autoStopRef = useRef<(() => void) | null>(null);

  const ensureMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current) return true;
    if (!navigator.mediaDevices?.getUserMedia || !pickMime()) {
      setStatus("unsupported");
      return false;
    }
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      ctx.createMediaStreamSource(stream).connect(analyser);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      setStatus("ready");
      return true;
    } catch (e) {
      const name = (e as DOMException)?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "nomic" : "error");
      return false;
    }
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const start = useCallback(
    async (onAutoStop: () => void): Promise<boolean> => {
      if (!(await ensureMic())) return false;
      const stream = streamRef.current!;
      await ctxRef.current?.resume();
      const mime = pickMime()!;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      levelsRef.current = [];
      rec.ondataavailable = (ev) => ev.data.size > 0 && chunksRef.current.push(ev.data);
      rec.start(250);
      recRef.current = rec;
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
    const blob = await new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType }));
      rec.stop();
    });
    recRef.current = null;
    setStatus("ready");
    setLevel(0);
    return {
      blob,
      mime: rec.mimeType.split(";")[0],
      onsetMs: detectOnsetMs(levelsRef.current, ONSET),
      durationMs: endedAt - startedAtRef.current,
      startedAt: startedAtRef.current,
      endedAt,
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

  return { status, level, speaking, ensureMic, start, stop };
}
