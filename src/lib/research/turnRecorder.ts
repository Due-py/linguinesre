"use client";

import { detectOnsetMs, shouldAutoStop } from "@/lib/speaking/onset";
import { BEEP_LEAD_S, BEEP_S, micLevel, pickMime, type Mic } from "@/lib/research/testRecorder";

/**
 * Ghi âm MỘT lượt nói trong buổi luyện (chế độ A và B), dùng chung micro và AudioContext với bài kiểm tra.
 *  - beep: trộn tiếng bíp vào đầu bản ghi như bài kiểm tra, để RL đo cùng một cách (từ lúc hết bíp).
 *  - Tự dừng khi: đã nói rồi im lặng endSilenceMs; chưa nói gì sau startLimitMs; hết maxMs; hoặc học sinh bấm "Xong".
 *  - Ghi âm 24 kbps (đủ cho giọng nói), để kho lưu trữ đủ cho cả đợt thực nghiệm.
 * onsetMs: ƯỚC LƯỢNG của trình duyệt (tính từ lúc hết bíp), chỉ để hiện đồng hồ Speed Q&A ngay lập tức.
 */
export type TurnRecording = { blob: Blob; mime: string; beepEndMs: number; durationMs: number; onsetMs: number | null };
export type TurnOptions = {
  beep: boolean;
  maxMs: number;
  endSilenceMs: number;
  startLimitMs: number;
  onLevel?: (v: number) => void;
  onOnset?: (ms: number) => void;
  /** Đặt stop.current = true để dừng ngay (nút "Xong"). */
  stop: { current: boolean };
};

const FRAME_MS = 50;
const ONSET = { frameMs: FRAME_MS, calibrationMs: 300, minSpeechMs: 200, floor: 0.02 };

export async function recordTurn(mic: Mic, o: TurnOptions): Promise<TurnRecording> {
  const { ctx } = mic;
  const mime = pickMime()!;
  const dest = ctx.createMediaStreamDestination();
  mic.source.connect(dest);
  const rec = new MediaRecorder(dest.stream, { mimeType: mime, audioBitsPerSecond: 24_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
  await new Promise<void>((resolve) => {
    rec.onstart = () => resolve();
    rec.start(250);
  });
  const t0 = ctx.currentTime;

  let gain: GainNode | null = null;
  let beepEndMs = 0;
  if (o.beep) {
    const beepAt = t0 + BEEP_LEAD_S;
    const osc = ctx.createOscillator();
    gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(dest);
    osc.start(beepAt);
    osc.stop(beepAt + BEEP_S);
    beepEndMs = Math.round((beepAt + BEEP_S - t0) * 1000);
  }

  const levels: number[] = [];
  let onsetMs: number | null = null;
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      const since = (ctx.currentTime - t0) * 1000 - beepEndMs;
      const done = () => {
        clearInterval(timer);
        resolve();
      };
      if (o.stop.current) return done();
      if (since < 0) return;
      const v = micLevel(mic);
      levels.push(v);
      o.onLevel?.(v);
      if (onsetMs === null) {
        const on = detectOnsetMs(levels, ONSET);
        if (on !== null) {
          onsetMs = on;
          o.onOnset?.(on);
        }
      }
      if (since >= o.maxMs) return done();
      if (onsetMs === null && since >= o.startLimitMs) return done();
      if (o.endSilenceMs > 0 && shouldAutoStop(levels, { ...ONSET, silenceStopMs: o.endSilenceMs })) return done();
    }, FRAME_MS);
  });

  const durationMs = Math.round((ctx.currentTime - t0) * 1000);
  const blob = await new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType }));
    rec.stop();
  });
  mic.source.disconnect(dest);
  gain?.disconnect();
  return { blob, mime: rec.mimeType.split(";")[0], beepEndMs, durationMs, onsetMs };
}
