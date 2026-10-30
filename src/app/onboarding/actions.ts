"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizeJoinCode } from "@/lib/classes";
import { fieldErrors, onboardingSchema } from "@/lib/validation";
import { formValues, NOT_CONFIGURED, type FormState } from "@/lib/form";

/** Hoàn tất onboarding: lưu vai trò + hồ sơ (một lần), rồi vào lớp nếu học sinh nhập mã. */
export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: raw };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values: raw };
  const v = parsed.data;

  // Kiểm tra dạng mã lớp trước khi ghi hồ sơ, để lỗi gõ sai không để lại hồ sơ làm dở.
  const code = v.role === "student" && v.classCode ? normalizeJoinCode(v.classCode) : null;
  if (v.role === "student" && v.classCode && !code)
    return { fields: { classCode: "Mã lớp gồm 6 chữ cái và chữ số. Hãy kiểm tra lại hoặc để trống." }, values: raw };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: v.role,
    p_display_name: v.displayName,
    p_grade: v.role === "student" ? (v.grade ?? null) : null,
    p_goal: null, // câu hỏi "muốn cải thiện" đã bỏ (30/10); cột goal giữ nguyên trong CSDL
  });
  if (error) {
    if (error.message.includes("already_onboarded")) redirect("/home");
    return { error: "Chưa lưu được hồ sơ. Hãy thử lại.", values: raw };
  }

  if (code) {
    const { data } = await supabase.rpc("join_class", { code });
    if (!Array.isArray(data) || data.length === 0) {
      // Hồ sơ đã lưu; học sinh vào lớp sau ở trang chính. Báo qua tham số để trang chính nhắc.
      redirect("/student?join=failed");
    }
  }
  redirect("/home");
}
