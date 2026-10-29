"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { makeJoinCode } from "@/lib/classes";
import { classSchema, fieldErrors } from "@/lib/validation";
import { formValues, NOT_CONFIGURED, type FormState } from "@/lib/form";

const UUID = /^[0-9a-f-]{36}$/;

/** Người gọi phải là giáo viên đã onboarding. Quyền ghi thật do RLS bảo đảm; đây là kiểm tra thêm ở máy chủ. */
async function teacherContext() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role, onboarded_at").eq("id", user.id).maybeSingle();
  return me?.role === "teacher" && me.onboarded_at ? { supabase, userId: user.id } : null;
}

export async function createClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = classSchema.safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: raw };
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED, values: raw };
  const ctx = await teacherContext();
  if (!ctx) return { error: "Chỉ giáo viên mới tạo được lớp.", values: raw };

  // Mã lớp ngẫu nhiên; trùng thì thử lại (ràng buộc unique ở cơ sở dữ liệu quyết định).
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await ctx.supabase
      .from("classes")
      .insert({ teacher_id: ctx.userId, name: parsed.data.name, grade: parsed.data.grade, join_code: makeJoinCode() })
      .select("id")
      .single();
    if (!error && data) redirect(`/teacher/classes/${data.id}`);
    if (error?.code !== "23505") return { error: "Chưa tạo được lớp. Hãy thử lại.", values: raw };
  }
  return { error: "Chưa tạo được mã lớp. Hãy thử lại.", values: raw };
}

export async function renameClass(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const parsed = classSchema.pick({ name: true }).safeParse(raw);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values: raw };
  const id = raw.id ?? "";
  if (!UUID.test(id)) return { error: "Lớp không hợp lệ." };
  const ctx = await teacherContext();
  if (!ctx) return { error: "Chỉ giáo viên mới sửa được lớp." };

  const { data, error } = await ctx.supabase.from("classes").update({ name: parsed.data.name }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Chưa lưu được. Hãy thử lại.", values: raw };
  revalidatePath(`/teacher/classes/${id}`);
  revalidatePath("/teacher");
  return { notice: "Đã lưu tên lớp." };
}

export async function setClassStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const id = raw.id ?? "";
  const status = raw.status;
  if (!UUID.test(id) || (status !== "active" && status !== "archived")) return { error: "Dữ liệu không hợp lệ." };
  const ctx = await teacherContext();
  if (!ctx) return { error: "Chỉ giáo viên mới sửa được lớp." };

  const { data, error } = await ctx.supabase.from("classes").update({ status }).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Chưa lưu được. Hãy thử lại." };
  revalidatePath(`/teacher/classes/${id}`);
  revalidatePath("/teacher");
  return { notice: status === "archived" ? "Đã lưu trữ lớp." : "Đã mở lại lớp." };
}

/** Đưa một học sinh ra khỏi lớp. Không xóa tài khoản hay dữ liệu luyện của bạn ấy. */
export async function removeMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formValues(formData);
  const classId = raw.classId ?? "";
  const studentId = raw.studentId ?? "";
  if (!UUID.test(classId) || !UUID.test(studentId)) return { error: "Dữ liệu không hợp lệ." };
  const ctx = await teacherContext();
  if (!ctx) return { error: "Chỉ giáo viên mới sửa được lớp." };

  const { error } = await ctx.supabase.from("class_members").delete().eq("class_id", classId).eq("student_id", studentId);
  if (error) return { error: "Chưa đưa được học sinh ra khỏi lớp." };
  revalidatePath(`/teacher/classes/${classId}`);
  return { notice: "Đã đưa học sinh ra khỏi lớp." };
}
