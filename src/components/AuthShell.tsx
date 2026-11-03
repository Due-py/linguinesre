import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Mascot, { Bubble } from "@/components/Mascot";

/**
 * Khung chung của đăng nhập / đăng ký / quên mật khẩu, kiểu Duolingo: nền trắng, nút đóng ở góc, biểu mẫu ở giữa.
 * Linh vật và câu hỏi lớn chỉ hiện từ 768px; trên điện thoại chỉ còn linh vật nhỏ để ô nhập và nút nằm trong màn hình đầu.
 */
export default function AuthShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr]">
      <header className="flex items-center px-3 py-2 sm:px-6 sm:py-4">
        <Link
          href="/"
          aria-label="Về trang chủ"
          className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <X className="size-7" aria-hidden />
        </Link>
      </header>

      <main id="main" className="flex items-start justify-center gap-16 px-4 pb-10 pt-2 sm:px-8 md:items-center md:pb-20">
        <div aria-hidden className="hidden w-72 shrink-0 justify-items-center gap-4 md:grid">
          <Bubble tail="bottom" className="text-2xl">
            <span lang="en">What would you say first?</span>
          </Bubble>
          <Mascot mood="happy" className="size-44" />
        </div>

        <div className="grid w-full max-w-md gap-5 md:gap-7">
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <Mascot mood="happy" still className="size-14 shrink-0 md:hidden" />
              <h1 className="text-balance text-3xl font-extrabold">{title}</h1>
            </div>
            {lead && <p className="text-muted">{lead}</p>}
          </div>
          {children}
          <Link href="/quyen-rieng-tu" className="w-fit text-sm font-bold text-muted underline-offset-4 hover:text-ink hover:underline">
            Quyền riêng tư
          </Link>
        </div>
      </main>
    </div>
  );
}
