import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Đã xóa tài khoản" };

export default function DeletedPage() {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-xl content-start gap-10 px-4 py-6 sm:px-6">
      <Logo />
      <main id="main" className="grid gap-4">
        <CircleCheck className="size-10 text-brand" aria-hidden />
        <h1 className="text-4xl font-extrabold tracking-tight">Đã xóa tài khoản</h1>
        <p className="text-lg text-muted">Tài khoản và toàn bộ dữ liệu của bạn đã được xóa khỏi LINGUA-REFLEX.</p>
        <ButtonLink href="/" variant="secondary" className="w-fit">
          Về trang chủ
        </ButtonLink>
      </main>
    </div>
  );
}
