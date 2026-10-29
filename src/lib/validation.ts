import { z } from "zod";

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

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Hãy nhập mật khẩu."),
});

export const signupSchema = z
  .object({ email, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Hai mật khẩu chưa giống nhau." });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Hai mật khẩu chưa giống nhau." });

export const GOALS = {
  reflex: "Trả lời nhanh hơn",
  express: "Diễn đạt ý tưởng",
  vocab: "Dùng từ vựng tốt hơn",
  grammar: "Nói đúng ngữ pháp hơn",
} as const;

export const onboardingSchema = z
  .object({
    role: z.enum(["student", "teacher"], { error: "Hãy chọn bạn là học sinh hay giáo viên." }),
    displayName: z.string().trim().min(1, "Hãy nhập tên hiển thị.").max(40, "Tên hiển thị tối đa 40 ký tự."),
    grade: z.coerce.number().int().min(6).max(12).optional(),
    goal: z.enum(["reflex", "express", "vocab", "grammar"]).optional(),
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
