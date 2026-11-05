import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Đăng nhập" };

/**
 * Một cách đăng nhập cho mọi người: email, tên tài khoản, hoặc mã học sinh + PIN (phiếu của nhóm nghiên cứu).
 * Liên kết cũ /login?as=email vẫn dùng được (tham số bị bỏ qua).
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  const { link } = await searchParams;
  return (
    <AuthShell title="Đăng nhập" lead="Nhập email, tên tài khoản hoặc mã học sinh, rồi mật khẩu.">
      <LoginForm linkInvalid={link === "invalid"} />
    </AuthShell>
  );
}
