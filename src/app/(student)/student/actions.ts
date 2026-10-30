"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizeJoinCode } from "@/lib/classes";
import { formValues, NOT_CONFIGURED, type FormState } from "@/lib/form";

/** Học sinh nhập mã lớp. Mã sai, lớp đã lưu trữ, khác khối đều cho cùng một thông báo. */
export async function joinClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const notFound: FormState = {
    fields: { code: "Không tìm thấy lớp với mã này. Hãy hỏi lại thầy cô mã lớp của bạn." },
    values: { code: raw.code ?? "" },
  };
  const code = normalizeJoinCode(raw.code ?? "");
  if (!code) return notFound;
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { data, error } = await supabase.rpc("join_class", { code });
  if (error) return { error: "Chưa vào được lớp. Hãy thử lại." };
  if (!Array.isArray(data) || data.length === 0) return notFound;

  revalidatePath("/student");
  revalidatePath("/account");
  return { notice: `Bạn đã vào lớp ${String(data[0].class_name)}.` };
}
