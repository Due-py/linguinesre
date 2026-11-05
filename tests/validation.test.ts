import { describe, expect, it } from "vitest";
import { classSchema, fieldErrors, loginSchema, onboardingSchema, signupSchema } from "@/lib/validation";

const errs = (r: { success: boolean; error?: import("zod").ZodError }) => (r.success ? {} : fieldErrors(r.error!));

describe("đăng ký", () => {
  const ok = { fullName: "Nguyễn  Minh Anh ", password: "matkhau123" };
  it("email: chuẩn hóa về chữ thường, gộp khoảng trắng trong họ tên", () => {
    const r = signupSchema.safeParse({ ...ok, identifier: " Ten@Truong.VN " });
    expect(r.success && r.data).toMatchObject({ kind: "email", email: "ten@truong.vn", fullName: "Nguyễn Minh Anh" });
  });
  it("tên tài khoản: lưu bằng email nội bộ .invalid", () => {
    const r = signupSchema.safeParse({ ...ok, identifier: "MinhAnh_8a" });
    expect(r.success && r.data).toMatchObject({ kind: "username", email: "minhanh_8a@taikhoan.lingua-reflex.invalid" });
  });
  it("báo lỗi: thiếu họ hoặc tên, email sai, tên tài khoản có dấu, giống mã học sinh, mật khẩu ngắn", () => {
    expect(errs(signupSchema.safeParse({ ...ok, fullName: "Anh", identifier: "a@b.vn" })).fullName).toMatch(/họ và tên/);
    expect(errs(signupSchema.safeParse({ ...ok, identifier: "abc@" })).identifier).toMatch(/Email/);
    expect(errs(signupSchema.safeParse({ ...ok, identifier: "minh anh" })).identifier).toMatch(/không dấu/);
    expect(errs(signupSchema.safeParse({ ...ok, identifier: "hồng" })).identifier).toMatch(/không dấu/);
    expect(errs(signupSchema.safeParse({ ...ok, identifier: "hs008" })).identifier).toMatch(/mã học sinh/);
    expect(errs(signupSchema.safeParse({ ...ok, identifier: "a@b.vn", password: "123" })).password).toMatch(/8 ký tự/);
  });
});

describe("đăng nhập", () => {
  it("cần tên đăng nhập và mật khẩu", () => {
    const e = errs(loginSchema.safeParse({ identifier: "", password: "" }));
    expect(e.identifier).toBeTruthy();
    expect(e.password).toBeTruthy();
  });
  it("một ô nhận ra email, mã học sinh và tên tài khoản", () => {
    const p = (identifier: string) => loginSchema.safeParse({ identifier, password: "x" });
    expect(p("Co.Van@Truong.vn").data).toMatchObject({ kind: "email", email: "co.van@truong.vn" });
    expect(p("hs 008").data).toMatchObject({ kind: "code", email: "hs008@hocsinh.lingua-reflex.invalid" });
    expect(p("MinhAnh_8a").data).toMatchObject({ kind: "username", email: "minhanh_8a@taikhoan.lingua-reflex.invalid" });
    expect(errs(p("minh anh")).identifier).toMatch(/Chưa đúng dạng/);
  });
});

describe("onboarding", () => {
  it("học sinh bắt buộc có khối lớp", () => {
    expect(errs(onboardingSchema.safeParse({ role: "student", displayName: "An" })).grade).toMatch(/khối/);
  });
  it("giáo viên không cần khối lớp", () => {
    expect(onboardingSchema.safeParse({ role: "teacher", displayName: "Cô Vân" }).success).toBe(true);
  });
  it("từ chối vai trò lạ và khối ngoài 6–12", () => {
    expect(onboardingSchema.safeParse({ role: "admin", displayName: "An" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ role: "student", displayName: "An", grade: "13" }).success).toBe(false);
  });
  it("tên hiển thị không được rỗng hoặc quá 40 ký tự", () => {
    expect(onboardingSchema.safeParse({ role: "teacher", displayName: "   " }).success).toBe(false);
    expect(onboardingSchema.safeParse({ role: "teacher", displayName: "x".repeat(41) }).success).toBe(false);
  });
});

describe("lớp", () => {
  it("khối để trống nghĩa là nhiều khối", () => {
    const r = classSchema.safeParse({ name: "8A1", grade: "" });
    expect(r.success && r.data.grade).toBeNull();
  });
  it("khối hợp lệ (6–12) được đổi sang số", () => {
    expect(classSchema.safeParse({ name: "12A1", grade: "12" }).success).toBe(true);
    const r = classSchema.safeParse({ name: "8A1", grade: "8" });
    expect(r.success && r.data.grade).toBe(8);
  });
  it("từ chối tên rỗng và khối ngoài phạm vi", () => {
    expect(classSchema.safeParse({ name: " ", grade: "" }).success).toBe(false);
    expect(classSchema.safeParse({ name: "A", grade: "13" }).success).toBe(false);
  });
});
