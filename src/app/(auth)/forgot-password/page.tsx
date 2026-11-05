import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import { ForgotForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Quên mật khẩu?" lead="Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới.">
      <ForgotForm />
      <p className="rounded-2xl bg-tint px-4 py-3 text-sm text-muted">
        Đăng ký bằng tên tài khoản (không có email)? Nhờ thầy cô đặt lại mật khẩu ở trang lớp. Quên PIN trên phiếu đăng nhập? Báo nhóm
        nghiên cứu để được cấp lại.
      </p>
    </AuthShell>
  );
}
