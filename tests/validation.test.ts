import { describe, expect, it } from "vitest";
import { classSchema, fieldErrors, loginSchema, onboardingSchema, signupSchema } from "@/lib/validation";

const errs = (r: { success: boolean; error?: import("zod").ZodError }) => (r.success ? {} : fieldErrors(r.error!));

describe("đăng ký", () => {
  it("chuẩn hóa email về chữ thường", () => {
    const r = signupSchema.safeParse({ email: " Ten@Truong.VN ", password: "matkhau123", confirm: "matkhau123" });
    expect(r.success && r.data.email).toBe("ten@truong.vn");
  });
  it("báo lỗi email sai dạng, mật khẩu ngắn, mật khẩu không khớp", () => {
    expect(errs(signupSchema.safeParse({ email: "abc", password: "matkhau123", confirm: "matkhau123" })).email).toMatch(/Email/);
    expect(errs(signupSchema.safeParse({ email: "a@b.vn", password: "123", confirm: "123" })).password).toMatch(/8 ký tự/);
    expect(errs(signupSchema.safeParse({ email: "a@b.vn", password: "matkhau123", confirm: "khac" })).confirm).toMatch(/giống/);
  });
});

describe("đăng nhập", () => {
  it("cần email và mật khẩu", () => {
    const e = errs(loginSchema.safeParse({ email: "", password: "" }));
    expect(e.email).toBeTruthy();
    expect(e.password).toBeTruthy();
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
