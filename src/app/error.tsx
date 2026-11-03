"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import Mascot from "@/components/Mascot";

/** Lỗi bất ngờ trong một trang. Nói rõ chuyện gì xảy ra và cách làm tiếp; bài đã lưu không mất. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="mx-auto grid min-h-[70dvh] w-full max-w-xl content-center gap-5 px-4 py-10 sm:px-6">
      <Mascot mood="think" className="size-28" />
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Trang này vừa gặp lỗi</h1>
      <p className="text-lg text-muted">
        Những câu trả lời đã lưu trước đó vẫn còn. Bấm “Thử lại”; nếu vẫn lỗi, kiểm tra mạng rồi mở lại trang sau ít phút.
      </p>
      {error.digest && <p className="text-sm text-muted">Mã lỗi để báo nhóm phụ trách: {error.digest}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn-3d inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-on-brand"
        >
          <RotateCcw className="size-5" aria-hidden />
          Thử lại
        </button>
        <Link href="/home" className="option-card inline-flex min-h-12 items-center px-6 font-extrabold text-sky-strong">
          Về trang chính
        </Link>
      </div>
    </main>
  );
}
