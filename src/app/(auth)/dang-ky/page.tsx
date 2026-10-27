import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Đăng ký · LinguaReflex" };

export default function RegisterPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Tạo tài khoản</h1>
        <p className="text-muted">Chỉ cần mã lớp, một biệt danh và mã PIN 6 số. Không cần email, không cần tên thật.</p>
      </div>
      <AuthForm mode="register" configured={isSupabaseConfigured()} />
    </>
  );
}
