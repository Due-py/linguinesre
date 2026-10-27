import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Đăng nhập · LinguaReflex" };

export default function LoginPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Đăng nhập</h1>
        <p className="text-muted">Nhập mã lớp, biệt danh và PIN bạn đã tạo.</p>
      </div>
      <AuthForm mode="login" configured={isSupabaseConfigured()} />
    </>
  );
}
