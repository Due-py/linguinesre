import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client có khóa service_role: BỎ QUA RLS. Chỉ dùng ở máy chủ, sau khi đã kiểm tra quyền người gọi bằng client thường.
 * Dùng cho: bộ đếm api_usage, kho giọng đọc câu hỏi, ghi phản hồi AI. Không bao giờ trả dữ liệu đọc bằng client này
 * thẳng cho người dùng mà chưa lọc theo quyền.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
