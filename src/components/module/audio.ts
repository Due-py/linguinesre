"use client";

import type { Recording } from "@/lib/speaking/useRecorder";

/**
 * Một thẻ <audio> dùng chung cho mọi giọng đọc của module. Trình duyệt (nhất là Safari trên iPhone) chỉ cho phát tiếng nếu
 * thẻ đó đã được "mở khóa" bằng một lần phát ngay trong cú bấm của người dùng; sau đó phát lại trên cùng thẻ thì được,
 * kể cả khi phải chờ xin micro hay chờ máy chủ tạo giọng.
 */
let shared: HTMLAudioElement | null = null;
let silent: string | null = null;

/** 0,05 giây im lặng (WAV 8 kHz, 8 bit), tạo tại chỗ để không phải tải file. */
function silentWav(): string {
  if (silent) return silent;
  const n = 400;
  const bytes = new Uint8Array(44 + n);
  const view = new DataView(bytes.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, i) => bytes.set([c.charCodeAt(0)], o + i));
  str(0, "RIFF");
  view.setUint32(4, 36 + n, true);
  str(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  str(36, "data");
  view.setUint32(40, n, true);
  bytes.fill(128, 44); // 8 bit: 128 là im lặng
  silent = `data:audio/wav;base64,${btoa(String.fromCharCode(...bytes))}`;
  return silent;
}

/**
 * Gọi NGAY trong trình xử lý cú bấm (trước mọi await) để mở khóa âm thanh: phát đoạn im lặng trên thẻ dùng chung và
 * "đánh thức" giọng của trình duyệt. Không làm gì nếu đã mở khóa rồi thì vẫn an toàn.
 */
export function primeAudio() {
  if (typeof window === "undefined") return;
  shared ??= new Audio();
  shared.src = silentWav();
  shared.play().catch(() => {});
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
  } catch {
    // trình duyệt không có giọng đọc: bỏ qua
  }
}

/**
 * Phát giọng đọc mẫu từ máy chủ; không có, hoặc trình duyệt chặn phát, thì dùng giọng của trình duyệt (text);
 * không được nữa thì trả "none" để giao diện mời đọc chữ trên màn hình.
 * Trả về khi đọc xong, kèm nguồn giọng để giao diện báo khi phải dùng giọng dự phòng.
 */
export async function playAudio(url: string, text: string): Promise<"server" | "browser" | "none"> {
  shared?.pause();
  window.speechSynthesis?.cancel();
  try {
    const res = await fetch(url);
    if (res.ok) {
      const src = URL.createObjectURL(await res.blob());
      shared ??= new Audio();
      const audio = shared;
      audio.src = src;
      const played = await new Promise<boolean>((resolve) => {
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        audio.play().catch(() => resolve(false));
      });
      URL.revokeObjectURL(src);
      if (played) return "server";
    }
  } catch {
    // dùng giọng của trình duyệt
  }
  return speakText(text);
}

/** Đọc bằng giọng của trình duyệt (khi không có giọng máy chủ cho câu/từ đó, hoặc trình duyệt chặn phát). */
export async function speakText(text: string): Promise<"browser" | "none"> {
  if (!("speechSynthesis" in window)) return "none";
  shared?.pause();
  window.speechSynthesis.cancel();
  const ok = await new Promise<boolean>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    window.speechSynthesis.speak(u);
    setTimeout(() => resolve(true), 15_000);
  });
  return ok ? "browser" : "none";
}

export { moduleAudio } from "./audioUrl";

/** Gửi một bản ghi lên máy chủ. Lỗi mạng trả về { error } để giao diện mời nói lại. */
export async function postAudio(url: string, r: Recording): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": r.mime }, body: r.blob });
    const data = await res.json().catch(() => ({}));
    return res.ok ? data : { error: data.error ?? "Chưa gửi được bản ghi. Hãy nói lại." };
  } catch {
    return { error: "Mất kết nối khi gửi bản ghi. Kiểm tra mạng rồi nói lại." };
  }
}
