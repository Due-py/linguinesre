import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import { SignupForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Đăng ký" };

export default function SignupPage() {
  return (
    <AuthShell title="Tạo tài khoản" lead="Mất chưa đến một phút. Bạn sẽ chọn là học sinh hay giáo viên ở bước tiếp theo.">
      <SignupForm />
    </AuthShell>
  );
}
