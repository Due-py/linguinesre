import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import { CodeLoginForm, LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Đăng nhập" };

/**
 * Hai cách đăng nhập, chọn bằng tab (là liên kết thường nên chạy cả khi JavaScript chưa tải):
 *  - "Mã học sinh" (mặc định): mã HS + PIN trên phiếu của nhóm nghiên cứu.
 *  - "Email" (?as=email, giữ cho liên kết cũ): mọi tài khoản đăng ký bằng email (học sinh tự đăng ký, giáo viên).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ link?: string; as?: string }> }) {
  const { link, as } = await searchParams;
  const email = as === "email" || link === "invalid";
  return (
    <AuthShell
      title="Đăng nhập"
      lead={email ? "Dùng email và mật khẩu bạn đã đăng ký." : "Nhập mã học sinh và PIN trên phiếu đăng nhập của bạn."}
    >
      <nav aria-label="Cách đăng nhập" className="grid grid-cols-2 overflow-hidden rounded-full border border-line-strong">
        <Tab href="/login" current={!email}>
          Mã học sinh
        </Tab>
        <Tab href="/login?as=email" current={email}>
          Email
        </Tab>
      </nav>
      {email ? <LoginForm linkInvalid={link === "invalid"} /> : <CodeLoginForm />}
    </AuthShell>
  );
}

function Tab({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-12 items-center justify-center gap-2 px-3 font-medium transition-colors [&+&]:border-l [&+&]:border-line-strong ${
        current ? "bg-brand-tonal text-brand-strong" : "text-ink hover:bg-sunken"
      }`}
    >
      {current && <Check className="size-4" aria-hidden />}
      {children}
    </Link>
  );
}
