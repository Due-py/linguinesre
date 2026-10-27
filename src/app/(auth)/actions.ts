"use server";

import { redirect } from "next/navigation";
import {
  applyFailedLogin,
  cleanNickname,
  hiddenEmail,
  isLocked,
  isValidClassCode,
  isValidPin,
  MAX_FAILED_LOGINS,
  minutesLeft,
  nicknameError,
  nicknameKey,
  normalizeClassCode,
  PIN_LENGTH,
  type LoginAttemptState,
} from "@/lib/auth/identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, NOT_CONFIGURED_MESSAGE } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthFormState {
  error?: string;
  /** Echoed back so the form keeps what the student typed (never the PIN). */
  fields?: { classCode: string; nickname: string };
}

const CONNECTION_ERROR = "Có lỗi kết nối. Bạn thử lại sau ít phút nhé.";
const WRONG_LOGIN = "Mã lớp, biệt danh hoặc PIN chưa đúng.";

function readForm(formData: FormData) {
  return {
    classCode: normalizeClassCode(String(formData.get("classCode") ?? "")),
    nickname: cleanNickname(String(formData.get("nickname") ?? "")),
    pin: String(formData.get("pin") ?? ""),
  };
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE };
  const { classCode, nickname, pin } = readForm(formData);
  const fields = { classCode, nickname };

  if (!isValidClassCode(classCode)) return { error: "Mã lớp chưa đúng dạng. Hỏi lại thầy cô nhé.", fields };
  const badNickname = nicknameError(nickname);
  if (badNickname) return { error: badNickname, fields };
  if (!isValidPin(pin)) return { error: `PIN phải gồm đúng ${PIN_LENGTH} chữ số.`, fields };
  if (pin !== String(formData.get("pinConfirm") ?? "")) return { error: "Hai lần nhập PIN không giống nhau.", fields };

  const admin = createSupabaseAdminClient();
  const { data: klass, error: classError } = await admin
    .from("classes")
    .select("id, is_open")
    .eq("code", classCode)
    .maybeSingle();
  if (classError) return { error: CONNECTION_ERROR, fields };
  if (!klass || !klass.is_open) {
    return { error: "Mã lớp không tồn tại hoặc đã đóng đăng ký. Hỏi lại thầy cô nhé.", fields };
  }

  const key = nicknameKey(nickname);
  const takenMessage = "Biệt danh này đã có bạn trong lớp dùng rồi. Chọn biệt danh khác nhé.";
  const { data: taken } = await admin
    .from("students")
    .select("id")
    .eq("class_id", klass.id)
    .eq("nickname_key", key)
    .maybeSingle();
  if (taken) return { error: takenMessage, fields };

  const email = hiddenEmail(klass.id, key);
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
  });
  if (createError || !created.user) {
    console.error("register: createUser failed", createError?.message);
    return { error: CONNECTION_ERROR, fields };
  }

  const { error: insertError } = await admin
    .from("students")
    .insert({ id: created.user.id, class_id: klass.id, nickname, nickname_key: key });
  if (insertError) {
    // Undo the auth account so the nickname can be tried again.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: insertError.code === "23505" ? takenMessage : CONNECTION_ERROR, fields };
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: pin });
  if (signInError) return { error: "Đã tạo tài khoản nhưng chưa đăng nhập được. Bạn đăng nhập lại nhé.", fields };

  redirect("/hoc");
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED_MESSAGE };
  const { classCode, nickname, pin } = readForm(formData);
  const fields = { classCode, nickname };
  if (!isValidClassCode(classCode) || nicknameError(nickname) || !isValidPin(pin)) {
    return { error: WRONG_LOGIN, fields };
  }

  const admin = createSupabaseAdminClient();
  const { data: klass, error: classError } = await admin.from("classes").select("id").eq("code", classCode).maybeSingle();
  if (classError) return { error: CONNECTION_ERROR, fields };
  if (!klass) return { error: WRONG_LOGIN, fields };

  const key = nicknameKey(nickname);
  const attemptKey = { class_id: klass.id, nickname_key: key };
  const { data: attempt } = await admin
    .from("login_attempts")
    .select("failed_count, locked_until")
    .match(attemptKey)
    .maybeSingle();
  const state: LoginAttemptState | null = attempt
    ? { failedCount: attempt.failed_count, lockedUntil: attempt.locked_until ? new Date(attempt.locked_until) : null }
    : null;
  const now = new Date();
  const lockedMessage = (s: LoginAttemptState) =>
    `Bạn đã nhập sai quá nhiều lần. Thử lại sau ${minutesLeft(s, now)} phút nhé.`;
  if (state && isLocked(state, now)) return { error: lockedMessage(state), fields };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: hiddenEmail(klass.id, key), password: pin });
  if (error) {
    if (error.code !== "invalid_credentials") return { error: CONNECTION_ERROR, fields };
    const next = applyFailedLogin(state, now);
    await admin.from("login_attempts").upsert({
      ...attemptKey,
      failed_count: next.failedCount,
      locked_until: next.lockedUntil?.toISOString() ?? null,
      updated_at: now.toISOString(),
    });
    if (isLocked(next, now)) return { error: lockedMessage(next), fields };
    const left = MAX_FAILED_LOGINS - next.failedCount;
    return { error: `${WRONG_LOGIN} Bạn còn ${left} lần thử.`, fields };
  }

  await admin.from("login_attempts").delete().match(attemptKey);
  redirect("/hoc");
}

export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
