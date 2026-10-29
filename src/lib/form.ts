/** Trạng thái trả về từ Server Action cho biểu mẫu. Không bao giờ chứa mật khẩu. */
export type FormState = {
  /** Lỗi chung của cả biểu mẫu. */
  error?: string;
  /** Lỗi theo từng trường, khóa là `name` của ô nhập. */
  fields?: Record<string, string>;
  /** Thông báo thành công / hướng dẫn tiếp theo. */
  notice?: string;
  /** Giá trị đã nhập, để điền lại ô khi có lỗi. */
  values?: Record<string, string>;
} | null;

export const NOT_CONFIGURED =
  "Web chưa kết nối với cơ sở dữ liệu. Người quản trị cần điền khóa Supabase vào .env.local rồi khởi động lại.";

/** Lấy các trường chữ của FormData thành object thường (bỏ file). */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
