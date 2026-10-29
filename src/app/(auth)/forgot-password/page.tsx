import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import { ForgotForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Quên mật khẩu?" lead="Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới.">
      <ForgotForm />
    </AuthShell>
  );
}
