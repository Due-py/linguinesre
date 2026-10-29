import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Liên kết trong email xác nhận / đặt lại mật khẩu trỏ về đây: đổi `code` lấy phiên rồi chuyển tiếp. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  // Chỉ cho chuyển tới đường dẫn nội bộ, tránh bị lợi dụng để chuyển hướng ra trang ngoài.
  const rawNext = searchParams.get("next") ?? "/home";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/home";

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?link=invalid`);
}
