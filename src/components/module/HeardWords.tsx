"use client";

import { useState } from "react";
import { Ear, LoaderCircle, Volume2 } from "lucide-react";
import { playAudio, speakText } from "./audio";

/**
 * "Từ máy nghe chưa rõ": thay cho chấm phát âm (không có dịch vụ chấm âm). Tô các từ Deepgram nghe chưa chắc trong câu
 * học sinh vừa nói, và (khi nói theo) các từ của câu mẫu máy không nghe thấy; mỗi từ có nút nghe mẫu để nói lại.
 * Luôn ghi rõ đây KHÔNG phải điểm phát âm: micro và tiếng ồn cũng làm máy nghe kém.
 *
 * audioFor: đường dẫn giọng đọc mẫu của máy chủ cho từ có trong Kho từ vựng; từ khác dùng giọng của trình duyệt.
 */
export default function HeardWords({
  transcript,
  lowWords = [],
  missed = [],
  audioFor,
}: {
  transcript: string;
  lowWords?: string[];
  missed?: string[];
  audioFor?: (word: string) => string | null;
}) {
  if (lowWords.length === 0 && missed.length === 0) return null;
  const low = new Set(lowWords);
  const parts = transcript.split(/(\s+)/);
  const clean = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z']/g, "");
  return (
    <section className="sheet-up grid gap-2 rounded-3xl bg-tint px-5 py-4">
      <h3 className="flex items-center gap-2 font-medium text-brand-strong">
        <Ear className="size-5" aria-hidden />
        Từ máy nghe chưa rõ
      </h3>
      {lowWords.length > 0 && (
        <p lang="en" className="text-lg">
          {parts.map((p, i) =>
            low.has(clean(p)) ? (
              <mark key={i} className="rounded bg-gold-soft px-0.5 font-bold text-ink underline decoration-gold-shadow decoration-dotted decoration-2 underline-offset-4">
                {p}
              </mark>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </p>
      )}
      {missed.length > 0 && (
        <p>
          Máy chưa nghe thấy trong câu mẫu: <span lang="en" className="font-bold">{missed.join(", ")}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {[...new Set([...missed, ...lowWords])].slice(0, 8).map((w) => (
          <WordButton key={w} word={w} url={audioFor?.(w) ?? null} />
        ))}
      </div>
      <p className="text-sm text-muted">
        Từ được tô là từ máy nghe chưa chắc, không phải điểm phát âm: micro, tiếng ồn hay nói nhỏ cũng làm máy nghe kém. Bấm để nghe mẫu, rồi nói lại nếu em muốn.
      </p>
    </section>
  );
}

function WordButton({ word, url }: { word: string; url: string | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        // Từ có trong Kho từ vựng: giọng máy chủ; từ khác: giọng của trình duyệt.
        await (url ? playAudio(url, word) : speakText(word));
        setBusy(false);
      }}
      className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-soft px-4 font-medium text-brand-strong hover:bg-brand-tonal"
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      <span lang="en">{word}</span>
    </button>
  );
}
