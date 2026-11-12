/**
 * Đăng nhập bằng mã học sinh (VD: FBG20124) + PIN 6 số. Supabase Auth cần email, nên mỗi mã gắn với một địa chỉ nội bộ
 * không nhận thư (đuôi .invalid là tên miền dành riêng, không bao giờ tồn tại). Không lưu họ tên học sinh.
 * Không import gì để script Node (tạo tài khoản hàng loạt) dùng lại được.
 */

/** Mã học sinh FPT Bắc Giang (VD: FBG20124); vẫn nhận dạng cũ 2 chữ + 2–4 số (VD: FBG20124) cho tài khoản đã tạo. */
export const CODE_PATTERN = /^(?:FBG[0-9]{4,6}|[A-Z]{2}[0-9]{2,4})$/;
export const PIN_PATTERN = /^[0-9]{6}$/;
export const CODE_EMAIL_DOMAIN = "hocsinh.lingua-reflex.invalid";

/** "fbg 20124", "Fbg-20124" → "FBG20124". Trả null nếu không đúng dạng. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, "");
  return CODE_PATTERN.test(code) ? code : null;
}

export const codeEmail = (code: string) => `${code.toLowerCase()}@${CODE_EMAIL_DOMAIN}`;
export const isCodeEmail = (email: string | null | undefined) => !!email && email.endsWith(`@${CODE_EMAIL_DOMAIN}`);
