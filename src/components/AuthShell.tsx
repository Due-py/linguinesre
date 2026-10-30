import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import Waveform from "@/components/Waveform";

/**
 * Khung chung của đăng nhập / đăng ký / quên mật khẩu.
 * Từ 768px: nửa trái là dải màu chuyển (điểm nhấn duy nhất của giao diện) với sóng âm và một câu hỏi cỡ lớn,
 * nửa phải là biểu mẫu. Trên điện thoại: dải màu thấp (chỉ logo và sóng âm) để ô nhập và nút đăng nhập nằm trong màn hình đầu.
 */
export default function AuthShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-1">
      <aside className="stripe-gradient relative flex flex-col justify-between gap-3 overflow-hidden px-4 py-3 text-white md:gap-10 md:px-10 md:py-10">
        <div className="[&_a]:text-white">
          <Logo />
        </div>
        <div className="hidden gap-5 md:grid">
          <p lang="en" className="max-w-[16ch] text-balance text-3xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
            What would you say first?
          </p>
          <p className="hidden max-w-sm text-white/85 md:block">
            Mỗi ngày một vài câu trả lời bằng giọng nói. Nói được rồi, nói hay sẽ đến sau.
          </p>
        </div>
        <Waveform className="h-6 md:h-36" color="rgb(255 255 255 / 0.75)" />
      </aside>

      <main id="main" className="flex items-start justify-center px-4 pb-10 pt-6 sm:px-8 md:items-center md:py-10">
        <div className="grid w-full max-w-md gap-5 md:gap-7">
          <div className="grid gap-2">
            <h1 className="text-balance text-3xl font-extrabold tracking-tight">{title}</h1>
            {lead && <p className="text-muted">{lead}</p>}
          </div>
          {children}
          <Link href="/quyen-rieng-tu" className="w-fit text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Quyền riêng tư
          </Link>
        </div>
      </main>
    </div>
  );
}
