import { codeEmail, normalizeCode } from "@/lib/research/code";

/**
 * Ba loại tên đăng nhập, gõ chung vào một ô:
 *  - email thật (có "@");
 *  - mã học sinh nghiên cứu (HS008, PIN 6 số): giữ nguyên như phiếu của nhóm nghiên cứu;
 *  - tên tài khoản (không cần email): lưu trong Supabase dưới dạng email nội bộ <tên>@taikhoan.lingua-reflex.invalid.
 *    Đuôi .invalid là tên miền dành riêng, không bao giờ gửi thư được, nên không ai nhận nhầm thư.
 *    Quên mật khẩu thì giáo viên của lớp đặt lại (không có email để gửi liên kết).
 */
export const USERNAME_DOMAIN = "taikhoan.lingua-reflex.invalid";
export const USERNAME_PATTERN = /^[a-z][a-z0-9._]{2,19}$/;

export const usernameEmail = (username: string) => `${username}@${USERNAME_DOMAIN}`;
export const isUsernameEmail = (email: string | null | undefined) => !!email && email.toLowerCase().endsWith(`@${USERNAME_DOMAIN}`);
export const usernameOf = (email: string | null | undefined) => (isUsernameEmail(email) ? email!.slice(0, email!.indexOf("@")) : null);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Kiểm tra tên tài khoản khi đăng ký. Trả tên đã chuẩn hóa (chữ thường) hoặc lời nhắc cách sửa. */
export function checkUsername(input: string): { ok: true; username: string } | { ok: false; message: string } {
  const u = input.trim().toLowerCase();
  if (!u) return { ok: false, message: "Hãy nhập email hoặc tên tài khoản." };
  if (/[^a-z0-9._]/.test(u))
    return { ok: false, message: "Tên tài khoản chỉ gồm chữ không dấu, chữ số, dấu chấm hoặc gạch dưới, ví dụ minhanh_8a." };
  if (u.length < 3 || u.length > 20) return { ok: false, message: "Tên tài khoản dài từ 3 đến 20 ký tự." };
  if (!/^[a-z]/.test(u)) return { ok: false, message: "Tên tài khoản phải bắt đầu bằng một chữ cái." };
  if (/[._]$/.test(u) || /[._]{2}/.test(u)) return { ok: false, message: "Không để dấu chấm hoặc gạch dưới ở cuối hay đứng liền nhau." };
  if (normalizeCode(u)) return { ok: false, message: "Tên này giống mã học sinh (như HS008). Hãy thêm vài chữ cái." };
  return { ok: true, username: u };
}

export type LoginId = { kind: "email" | "username" | "code"; email: string };

/** Ô đăng nhập chung: nhận ra email, mã học sinh hay tên tài khoản. null nếu không giống loại nào. */
export function parseLoginId(input: string): LoginId | null {
  const t = input.trim();
  if (!t) return null;
  if (t.includes("@")) return EMAIL.test(t) ? { kind: "email", email: t.toLowerCase() } : null;
  const code = normalizeCode(t);
  if (code) return { kind: "code", email: codeEmail(code) };
  const u = t.toLowerCase();
  return USERNAME_PATTERN.test(u) ? { kind: "username", email: usernameEmail(u) } : null;
}

/** Họ và tên thật: gộp khoảng trắng, cần ít nhất hai chữ (họ và tên). Giới hạn 40 ký tự theo cột display_name. */
export function checkFullName(input: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = input.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, message: "Hãy nhập họ và tên." };
  if (name.length > 40) return { ok: false, message: "Họ và tên tối đa 40 ký tự." };
  if (name.split(" ").length < 2) return { ok: false, message: "Hãy nhập cả họ và tên, ví dụ Nguyễn Minh Anh." };
  if (/[0-9@_<>]/.test(name)) return { ok: false, message: "Họ và tên chỉ gồm chữ cái, ví dụ Nguyễn Minh Anh." };
  return { ok: true, name };
}

/** Mật khẩu tạm khi giáo viên đặt lại: 10 ký tự dễ đọc (không có 0/O, 1/l/I), dạng xxxxx-xxxxx. */
export function tempPassword(random: (n: number) => Uint8Array): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = random(10);
  const s = Array.from(bytes, (b) => abc[b % abc.length]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
