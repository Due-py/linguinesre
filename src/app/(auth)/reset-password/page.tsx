import type { Metadata } from "next";
import Link from "next/link";
import AuthShell from "@/components/AuthShell";
import { ResetForm } from "@/components/AuthForms";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Đặt lại mật khẩu" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  // Trang này chỉ dùng được sau khi bấm liên kết trong email (đã có phiên tạm).
  const profile = await getProfile();
  if (!profile) {
    return (
      <AuthShell title="Liên kết đã hết hạn" lead="Liên kết đặt lại mật khẩu chỉ dùng được một lần và hết hạn sau một thời gian ngắn.">
        <Link href="/forgot-password" className="font-bold text-brand-strong underline underline-offset-4">
          Yêu cầu liên kết mới
        </Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Đặt mật khẩu mới">
      <ResetForm />
    </AuthShell>
  );
}
