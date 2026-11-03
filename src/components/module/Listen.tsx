"use client";

import { useState } from "react";
import { LoaderCircle, Volume2 } from "lucide-react";
import { playAudio } from "./audio";

/** Nút nghe giọng đọc mẫu (giọng máy chủ, dự phòng bằng giọng trình duyệt). */
export default function ListenButton({ url, text, children }: { url: string; text: string; children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        await playAudio(url, text);
        setBusy(false);
      }}
      className="btn-3d inline-flex min-h-11 items-center gap-2 rounded-2xl bg-sky-strong px-4 font-extrabold text-white [--depth:var(--sky-shadow)]"
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {children}
    </button>
  );
}
