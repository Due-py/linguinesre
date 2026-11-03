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
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 font-semibold hover:bg-sunken"
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {children}
    </button>
  );
}
