import type { ReactNode } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import Logo from "@/components/Logo";

/**
 * Khung chung của đăng nhập / đăng ký / quên mật khẩu, theo kiểu trang đăng nhập Google: nền xám nhạt, một thẻ lớn bo tròn
 * ở giữa (từ 768px chia hai cột: tiêu đề bên trái, biểu mẫu bên phải). Trên điện thoại thẻ chiếm cả bề ngang, ô nhập và
 * nút nằm trong màn hình đầu.
 */
export default function AuthShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto] bg-tint">
      <header className="flex items-center px-3 py-2 sm:px-6 sm:py-4">
        <Link href="/" aria-label="Về trang chủ" className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink">
          <X className="size-6" aria-hidden />
        </Link>
      </header>

      <main id="main" className="flex items-start justify-center px-3 pb-8 sm:px-6 md:items-center">
        <div className="rise-in grid w-full max-w-4xl gap-8 rounded-[1.75rem] bg-surface p-6 sm:p-10 md:grid-cols-[1fr_1.1fr] md:gap-12">
          <div className="grid content-start gap-4">
            <Logo />
            <h1 className="text-balance text-4xl font-normal tracking-tight sm:text-[2.75rem] sm:leading-tight">{title}</h1>
            {lead && <p className="text-lg text-muted">{lead}</p>}
          </div>
          <div className="grid content-start gap-5">{children}</div>
        </div>
      </main>

      <footer className="flex justify-center gap-6 px-4 pb-6 text-sm text-muted">
        <Link href="/quyen-rieng-tu" className="min-h-11 content-center hover:text-ink">
          Quyền riêng tư
        </Link>
        <Link href="/" className="min-h-11 content-center hover:text-ink">
          Trang chủ
        </Link>
      </footer>
    </div>
  );
}
