import { z } from "zod";
import { checkFullName, checkUsername, parseLoginId, usernameEmail } from "@/lib/identity";

/** Thông báo lỗi tiếng Việt, nói rõ cách sửa. Dùng chung cho mọi biểu mẫu đăng nhập/đăng ký/onboarding. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Hãy nhập email.")
  .pipe(z.email("Email chưa đúng dạng, ví dụ ten@truong.edu.vn."));

const password = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự.")
  .max(72, "Mật khẩu tối đa 72 ký tự.");

/** Đăng nhập: một ô cho email, tên tài khoản hoặc mã học sinh (xem lib/identity.ts) và một ô mật khẩu/PIN. */
export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, "Hãy nhập email, tên tài khoản hoặc mã học sinh."),
    password: z.string().min(1, "Hãy nhập mật khẩu hoặc PIN."),
  })
  .transform((v, ctx) => {
    const id = parseLoginId(v.identifier);
    if (!id) {
      ctx.addIssue({ code: "custom", path: ["identifier"], message: "Chưa đúng dạng. Nhập email (có @), tên tài khoản hoặc mã học sinh như HS008." });
      return z.NEVER;
    }
    return { ...id, password: v.password };
  });

/**
 * Đăng ký: họ và tên thật, một ô "email hoặc tên tài khoản", mật khẩu (có nút hiện mật khẩu nên không cần nhập lại).
 * Có "@" thì là email, không thì là tên tài khoản.
 */
export const signupSchema = z
  .object({ fullName: z.string(), identifier: z.string(), password })
  .transform((v, ctx) => {
    const name = checkFullName(v.fullName);
    if (!name.ok) ctx.addIssue({ code: "custom", path: ["fullName"], message: name.message });
    const raw = v.identifier.trim();
    let kind: "email" | "username" = "email";
    let address = "";
    if (raw.includes("@")) {
      const e = email.safeParse(raw);
      if (e.success) address = e.data;
      else ctx.addIssue({ code: "custom", path: ["identifier"], message: "Email chưa đúng dạng, ví dụ ten@truong.edu.vn." });
    } else {
      const u = checkUsername(raw);
      if (u.ok) {
        kind = "username";
        address = usernameEmail(u.username);
      } else ctx.addIssue({ code: "custom", path: ["identifier"], message: u.message });
    }
    if (!name.ok || !address) return z.NEVER;
    return { fullName: name.name, kind, email: address, password: v.password };
  });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Hai mật khẩu chưa giống nhau." });

export const onboardingSchema = z
  .object({
    role: z.enum(["student", "teacher"], { error: "Hãy chọn bạn là học sinh hay giáo viên." }),
    displayName: z.string().trim().min(1, "Hãy nhập tên hiển thị.").max(40, "Tên hiển thị tối đa 40 ký tự."),
    grade: z.coerce.number().int().min(6).max(12).optional(),
    classCode: z.string().trim().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "student" && v.grade === undefined)
      ctx.addIssue({ code: "custom", path: ["grade"], message: "Hãy chọn khối lớp của bạn." });
  });

export const classSchema = z.object({
  name: z.string().trim().min(1, "Hãy đặt tên lớp.").max(60, "Tên lớp tối đa 60 ký tự."),
  grade: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().min(6).max(12).nullable()),
});

/** Gom lỗi zod thành { tênTrường: thông báo đầu tiên }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
