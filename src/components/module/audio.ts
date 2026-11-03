"use client";

import type { Recording } from "@/lib/speaking/useRecorder";

let current: HTMLAudioElement | null = null;

/**
 * Phát giọng đọc mẫu từ máy chủ; không có thì dùng giọng của trình duyệt (text); không được nữa thì im lặng.
 * Trả về khi đọc xong, kèm nguồn giọng để giao diện báo khi phải dùng giọng dự phòng.
 */
export async function playAudio(url: string, text: string): Promise<"server" | "browser" | "none"> {
  current?.pause();
  window.speechSynthesis?.cancel();
  try {
    const res = await fetch(url);
    if (res.ok) {
      const src = URL.createObjectURL(await res.blob());
      const audio = new Audio(src);
      current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(src);
      return "server";
    }
  } catch {
    // dùng giọng của trình duyệt
  }
  return speakText(text);
}

/** Đọc bằng giọng của trình duyệt (khi không có giọng máy chủ cho câu/từ đó). */
export async function speakText(text: string): Promise<"browser" | "none"> {
  if (!("speechSynthesis" in window)) return "none";
  current?.pause();
  window.speechSynthesis.cancel();
  await new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
    setTimeout(resolve, 15_000);
  });
  return "browser";
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
