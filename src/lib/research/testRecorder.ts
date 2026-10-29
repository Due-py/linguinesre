"use client";

import { detectOnsetMs } from "@/lib/speaking/onset";

/**
 * Ghi âm MỘT câu kiểm tra theo mục 3.5: hết giọng đọc câu hỏi → tiếng bíp → ghi âm; tối đa 10 giây để bắt đầu nói,
 * tối đa 20 giây cả câu, rồi tự dừng. Không có đồng hồ đếm ngược trên màn hình.
 *
 * Tiếng bíp được trộn THẲNG vào bản ghi (cùng lúc phát ra loa), nên mốc hết bíp trong file (beepEndMs) là chính xác theo
 * đồng hồ âm thanh, và người đo tay bằng Audacity thấy đúng tiếng bíp đó. Micro không cần thu lại tiếng bíp từ loa.
 * Phát hiện tiếng nói bằng mức âm ở đây CHỈ để dừng sớm khi im lặng 10 giây; thời gian phản xạ chính thức đo ở máy chủ.
 */

export type Mic = { ctx: AudioContext; stream: MediaStream; source: MediaStreamAudioSourceNode; analyser: AnalyserNode };
export type MicError = "denied" | "nomic" | "unsupported" | "error";
export type TestRecording = { blob: Blob; mime: string; beepEndMs: number; durationMs: number };

export const BEEP_LEAD_S = 0.3; // khoảng lặng đầu file trước tiếng bíp
export const BEEP_S = 0.15;
export const START_LIMIT_MS = 10_000;
export const TOTAL_LIMIT_MS = 20_000;
const FRAME_MS = 50;
const ONSET = { frameMs: FRAME_MS, calibrationMs: 300, minSpeechMs: 200, floor: 0.02 };

export function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

/** Gọi trong lúc bấm nút (để trình duyệt điện thoại cho phép phát âm thanh và dùng micro). */
export async function openMic(): Promise<Mic | MicError> {
  if (!navigator.mediaDevices?.getUserMedia || !pickMime() || typeof AudioContext === "undefined") return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const ctx = new AudioContext();
    await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    return { ctx, stream, source, analyser };
  } catch (e) {
    const name = (e as DOMException)?.name;
    return name === "NotAllowedError" || name === "SecurityError" ? "denied" : name === "NotFoundError" ? "nomic" : "error";
  }
}

export function closeMic(mic: Mic | null) {
  mic?.stream.getTracks().forEach((t) => t.stop());
  void mic?.ctx.close();
}

export function micLevel(mic: Mic): number {
  const buf = new Float32Array(mic.analyser.fftSize);
  mic.analyser.getFloatTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += v * v;
  return Math.sqrt(sum / buf.length);
}

/** Phát giọng đọc câu hỏi qua cùng AudioContext (iPhone cho phép phát vì ctx đã bật bằng một lần bấm). */
export async function playAudio(mic: Mic, data: ArrayBuffer): Promise<void> {
  const buffer = await mic.ctx.decodeAudioData(data);
  await new Promise<void>((resolve) => {
    const src = mic.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(mic.ctx.destination);
    src.onended = () => resolve();
    src.start();
  });
}

export async function recordAnswer(mic: Mic, onLevel?: (v: number) => void): Promise<TestRecording> {
  const { ctx } = mic;
  const mime = pickMime()!;
  const dest = ctx.createMediaStreamDestination();
  mic.source.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: mime });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  await new Promise<void>((resolve) => {
    rec.onstart = () => resolve();
    rec.start(250);
  });
  const t0 = ctx.currentTime;

  // Tiếng bíp 880 Hz, 150 ms: vừa ra loa vừa vào bản ghi.
  const beepAt = t0 + BEEP_LEAD_S;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.3;
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.connect(dest);
  osc.start(beepAt);
  osc.stop(beepAt + BEEP_S);
  const beepEndMs = Math.round((beepAt + BEEP_S - t0) * 1000);

  const levels: number[] = [];
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const sinceBeep = (ctx.currentTime - t0) * 1000 - beepEndMs;
      if (sinceBeep < 0) return;
      const v = micLevel(mic);
      levels.push(v);
      onLevel?.(v);
      const silent = detectOnsetMs(levels, ONSET) === null;
      if (sinceBeep >= TOTAL_LIMIT_MS || (sinceBeep >= START_LIMIT_MS && silent)) {
        clearInterval(timer);
        resolve();
      }
    }, FRAME_MS);
  });

  const durationMs = Math.round((ctx.currentTime - t0) * 1000);
  const blob = await new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType }));
    rec.stop();
  });
  mic.source.disconnect(dest);
  gain.disconnect();
  return { blob, mime: rec.mimeType.split(";")[0], beepEndMs, durationMs };
}
