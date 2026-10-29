"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Mã lớp cỡ lớn, dễ đọc to cho cả lớp, kèm nút sao chép. Trình duyệt chặn sao chép thì người dùng tự bôi đen mã. */
export default function CopyCode({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Người dùng tự bôi đen mã.
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`select-all rounded-xl border-2 border-dashed border-ink/40 bg-surface font-extrabold tabular-nums ${
          size === "lg" ? "px-5 py-2 text-4xl tracking-[0.3em] sm:text-5xl" : "px-3 py-1 text-xl tracking-[0.22em]"
        }`}
        aria-label={`Mã lớp: ${code.split("").join(" ")}`}
      >
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-ink/80 bg-surface px-4 text-sm font-bold transition-colors hover:bg-sunken"
      >
        {copied ? <Check className="size-4 text-brand-strong" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        {copied ? "Đã chép" : "Chép mã"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Đã sao chép mã lớp" : ""}
      </span>
    </span>
  );
}
