import { describe, expect, it } from "vitest";
import { checkFullName, checkUsername, isUsernameEmail, parseLoginId, tempPassword, usernameOf } from "@/lib/identity";

describe("tên tài khoản", () => {
  it("nhận chữ không dấu, số, dấu chấm, gạch dưới; trả chữ thường", () => {
    expect(checkUsername(" Minh.Anh_8a ")).toEqual({ ok: true, username: "minh.anh_8a" });
  });
  it("từ chối tên quá ngắn, bắt đầu bằng số, dấu chấm ở cuối hoặc liền nhau, giống mã học sinh", () => {
    for (const bad of ["ab", "8anh", "anh.", "an..h", "a".repeat(21), "hs008", "AB1234"]) expect(checkUsername(bad).ok).toBe(false);
  });
  it("đọc lại tên từ email nội bộ", () => {
    expect(usernameOf("minhanh@taikhoan.lingua-reflex.invalid")).toBe("minhanh");
    expect(isUsernameEmail("a@gmail.com")).toBe(false);
    expect(usernameOf("hs008@hocsinh.lingua-reflex.invalid")).toBeNull();
  });
  it("tên hợp lệ khi đăng ký thì đăng nhập cũng nhận ra đúng tài khoản đó", () => {
    const u = checkUsername("Minh.Anh_8a");
    expect(u.ok && parseLoginId("Minh.Anh_8a")?.email).toBe("minh.anh_8a@taikhoan.lingua-reflex.invalid");
  });
});

describe("họ và tên", () => {
  it("cần hai chữ trở lên, không có số", () => {
    expect(checkFullName("Lê   Văn  An")).toEqual({ ok: true, name: "Lê Văn An" });
    expect(checkFullName("An").ok).toBe(false);
    expect(checkFullName("Lê An 2").ok).toBe(false);
  });
});

describe("mật khẩu tạm", () => {
  it("dạng xxxxx-xxxxx, không có ký tự dễ nhầm", () => {
    const p = tempPassword((n) => Uint8Array.from({ length: n }, (_, i) => i * 37));
    expect(p).toMatch(/^[a-z2-9]{5}-[a-z2-9]{5}$/);
    expect(p).not.toMatch(/[01ilo]/);
  });
});
