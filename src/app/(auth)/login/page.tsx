import type { Metadata } from "next";
import Link from "next/link";
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
      <nav aria-label="Cách đăng nhập" className="grid grid-cols-2 gap-2">
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
      className={`option-card inline-flex min-h-12 items-center justify-center px-3 font-extrabold ${
        current ? "border-sky! bg-sky-soft! text-sky-strong" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
