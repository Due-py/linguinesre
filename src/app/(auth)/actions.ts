"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { fieldErrors, forgotSchema, loginSchema, resetSchema, signupSchema } from "@/lib/validation";
import { formValues, NOT_CONFIGURED, type FormState } from "@/lib/form";
import { codeEmail, normalizeCode, PIN_PATTERN } from "@/lib/research/code";

/** Giá trị điền lại ô nhập khi có lỗi: chỉ giữ email, không bao giờ trả mật khẩu về trình duyệt. */
const keepEmail = (raw: Record<string, string>) => ({ email: raw.email ?? "" });

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: keepEmail(raw) };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values: keepEmail(raw) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const unconfirmed = error.code === "email_not_confirmed";
    return {
      // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào đã đăng ký.
      error: unconfirmed
        ? "Email này chưa được xác nhận. Hãy mở thư xác nhận trong hộp thư của bạn."
        : "Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại.",
      values: keepEmail(raw),
    };
  }
  redirect("/home");
}

/**
 * Học sinh tham gia nghiên cứu: mã HS + PIN 6 số (nhóm nghiên cứu phát phiếu). Không có đăng ký hay quên PIN trên web:
 * quên PIN thì báo nhóm nghiên cứu cấp lại (scripts/research-students.mjs --reset).
 */
export async function signInWithCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const code = normalizeCode(raw.code ?? "");
  const keep = { code: raw.code ?? "" };
  const fields: Record<string, string> = {};
  if (!code) fields.code = "Mã học sinh có dạng HS008 (2 chữ cái và 2–4 chữ số).";
  if (!PIN_PATTERN.test(raw.pin ?? "")) fields.pin = "PIN gồm đúng 6 chữ số.";
  if (Object.keys(fields).length) return { fields, values: keep };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values: keep };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: codeEmail(code!), password: raw.pin });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Nhập sai nhiều lần. Hãy đợi vài phút rồi thử lại."
          : "Mã học sinh hoặc PIN chưa đúng. Kiểm tra lại phiếu đăng nhập của bạn.",
      values: keep,
    };
  }
  redirect("/home");
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: keepEmail(raw) };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values: keepEmail(raw) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/home` },
  });
  if (error) {
    const weak = error.code === "weak_password";
    return {
      error: weak
        ? "Mật khẩu quá dễ đoán. Hãy dùng mật khẩu dài hơn hoặc thêm chữ số."
        : error.code === "over_email_send_rate_limit"
          ? "Đã gửi quá nhiều email trong một thời gian ngắn. Hãy thử lại sau ít phút."
          : "Chưa tạo được tài khoản. Hãy thử lại sau.",
      values: keepEmail(raw),
    };
  }
  // Có phiên ngay = Supabase đang tắt "Confirm email" → sang onboarding.
  if (data.session) redirect("/onboarding");
  // Email đã đăng ký: Supabase trả user không có identity để không lộ email tồn tại. Vẫn hướng dẫn như nhau.
  return {
    notice: `Chúng tôi đã gửi thư xác nhận tới ${parsed.data.email}. Mở thư và bấm vào liên kết để tiếp tục.`,
    values: keepEmail(raw),
  };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = forgotSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: keepEmail(raw) };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values: keepEmail(raw) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error?.code === "over_email_send_rate_limit")
    return { error: "Đã gửi quá nhiều email trong một thời gian ngắn. Hãy thử lại sau ít phút.", values: keepEmail(raw) };
  // Luôn trả cùng một thông báo, dù email có tồn tại hay không.
  return {
    notice: `Nếu ${parsed.data.email} đã có tài khoản, chúng tôi vừa gửi liên kết đặt lại mật khẩu tới đó.`,
    values: keepEmail(raw),
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(formValues(formData));
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Liên kết đặt lại mật khẩu đã hết hạn. Hãy yêu cầu liên kết mới." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      error:
        error.code === "same_password"
          ? "Mật khẩu mới phải khác mật khẩu cũ."
          : error.code === "weak_password"
            ? "Mật khẩu quá dễ đoán. Hãy dùng mật khẩu dài hơn hoặc thêm chữ số."
            : "Chưa đổi được mật khẩu. Hãy thử lại.",
    };
  }
  redirect("/home");
}
