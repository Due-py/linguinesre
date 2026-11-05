"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, siteUrl } from "@/lib/supabase/env";
import { fieldErrors, forgotSchema, loginSchema, resetSchema, signupSchema } from "@/lib/validation";
import { formValues, NOT_CONFIGURED, type FormState } from "@/lib/form";

/** Giá trị điền lại ô nhập khi có lỗi: không bao giờ trả mật khẩu về trình duyệt. */
const keep = (raw: Record<string, string>, ...names: string[]) => Object.fromEntries(names.map((n) => [n, raw[n] ?? ""]));
const keepEmail = (raw: Record<string, string>) => keep(raw, "email");

/**
 * Đăng nhập một ô: email, tên tài khoản hoặc mã học sinh (+ PIN) đều vào cùng biểu mẫu; lib/identity.ts nhận ra loại.
 * Cùng một thông báo cho "sai tên" và "sai mật khẩu" để không lộ tài khoản nào tồn tại.
 */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const values = keep(raw, "identifier");
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const { kind, email, password } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Nhập sai nhiều lần. Hãy đợi vài phút rồi thử lại."
          : error.code === "email_not_confirmed"
            ? "Email này chưa được xác nhận. Hãy mở thư xác nhận trong hộp thư của bạn."
            : kind === "code"
              ? "Mã học sinh hoặc PIN chưa đúng. Kiểm tra lại phiếu đăng nhập của bạn."
              : "Tên đăng nhập hoặc mật khẩu chưa đúng. Hãy kiểm tra lại.",
      values,
    };
  }
  redirect("/home");
}

/**
 * Đăng ký: họ và tên thật + email hoặc tên tài khoản + mật khẩu. Họ tên lưu trong user_metadata.full_name, trang thiết lập
 * tài khoản dùng nó làm tên hiển thị (không hỏi lại).
 */
export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const values = keep(raw, "fullName", "identifier");
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values };

  const { kind, email, password, fullName } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${siteUrl()}/auth/callback?next=/home` },
  });
  if (error) {
    if (error.code === "user_already_exists")
      return kind === "username"
        ? { fields: { identifier: "Tên tài khoản này đã có người dùng. Hãy chọn tên khác, hoặc đăng nhập nếu đây là tài khoản của bạn." }, values }
        : { error: "Email này đã có tài khoản. Hãy đăng nhập, hoặc bấm “Quên mật khẩu” nếu không nhớ mật khẩu.", values };
    return {
      error:
        error.code === "weak_password"
          ? "Mật khẩu quá dễ đoán. Hãy dùng mật khẩu dài hơn hoặc thêm chữ số."
          : error.code === "over_email_send_rate_limit"
            ? "Đã gửi quá nhiều email trong một thời gian ngắn. Hãy thử lại sau ít phút."
            : "Chưa tạo được tài khoản. Hãy thử lại sau.",
      values,
    };
  }
  // Có phiên ngay = Supabase đang tắt "Confirm email" → sang onboarding.
  if (data.session) redirect("/onboarding");
  // Tên tài khoản không có hộp thư: nếu Supabase bật lại "Confirm email" thì không xác nhận được, báo rõ thay vì chờ thư.
  if (kind === "username") return { error: "Chưa tạo được tài khoản bằng tên tài khoản lúc này. Hãy đăng ký bằng email.", values };
  // Email đã đăng ký: Supabase trả user không có identity để không lộ email tồn tại. Vẫn hướng dẫn như nhau.
  return {
    notice: `Chúng tôi đã gửi thư xác nhận tới ${email}. Mở thư và bấm vào liên kết để tiếp tục.`,
    values,
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
