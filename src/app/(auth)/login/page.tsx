import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";
import { CodeLoginForm, LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "Đăng nhập" };

/** Mặc định: học sinh đăng nhập bằng mã HS + PIN. ?as=email: giáo viên và nhóm nghiên cứu đăng nhập bằng email. */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ link?: string; as?: string }> }) {
  const { link, as } = await searchParams;
  if (as === "email" || link === "invalid") {
    return (
      <AuthShell title="Đăng nhập bằng email" lead="Dành cho giáo viên và nhóm nghiên cứu.">
        <LoginForm linkInvalid={link === "invalid"} />
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Chào mừng bạn quay lại" lead="Nhập mã học sinh và PIN trên phiếu đăng nhập của bạn.">
      <CodeLoginForm />
    </AuthShell>
  );
}
