import type { Metadata } from "next";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Không tìm thấy trang" };

export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-xl content-start gap-10 px-4 py-6 sm:px-6">
      <Logo />
      <main id="main" className="grid gap-4">
        <p aria-hidden className="text-7xl font-semibold tracking-tight text-brand">404</p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Không tìm thấy trang này</h1>
        <p className="text-lg text-muted">Đường dẫn có thể đã sai, hoặc trang này không thuộc tài khoản của bạn.</p>
        <ButtonLink href="/home" className="w-fit">
          Về trang chính
        </ButtonLink>
      </main>
    </div>
  );
}
