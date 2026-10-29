"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

/** Lỗi bất ngờ trong một trang. Nói rõ chuyện gì xảy ra và cách làm tiếp; bài đã lưu không mất. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto grid min-h-[70dvh] w-full max-w-xl content-center gap-5 px-4 py-10 sm:px-6">
      <CircleAlert className="size-10 text-warn" aria-hidden />
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Trang này vừa gặp lỗi</h1>
      <p className="text-lg text-muted">
        Những câu trả lời đã lưu trước đó vẫn còn. Bấm “Thử lại”; nếu vẫn lỗi, kiểm tra mạng rồi mở lại trang sau ít phút.
      </p>
      {error.digest && <p className="text-sm text-muted">Mã lỗi để báo nhóm phụ trách: {error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-semibold text-on-brand shadow-button hover:bg-brand-strong"
        >
          <RotateCcw className="size-5" aria-hidden />
          Thử lại
        </button>
        <Link href="/home" className="inline-flex min-h-12 items-center rounded-full border border-line-strong bg-surface px-6 font-semibold hover:bg-sunken">
          Về trang chính
        </Link>
      </div>
    </main>
  );
}
