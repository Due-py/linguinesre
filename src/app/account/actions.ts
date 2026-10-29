"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteAccount } from "@/lib/account";

export type DeleteState = { error?: string } | null;

/** Xóa tài khoản của chính người đang đăng nhập. Phải gõ đúng chữ xác nhận để tránh bấm nhầm. */
export async function deleteMyAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const confirm = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  if (confirm !== "xoa") return { error: "Gõ đúng chữ xoa (không dấu) vào ô xác nhận." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await deleteAccount(user.id))) return { error: "Chưa xóa được. Thử lại sau ít phút; nếu vẫn lỗi, báo thầy cô hoặc nhóm phụ trách." };
  await supabase.auth.signOut({ scope: "local" }); // tài khoản đã xóa: chỉ cần xóa phiên trên trình duyệt
  redirect("/da-xoa");
}
