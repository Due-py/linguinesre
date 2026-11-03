"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Bước "Thầy cô duyệt" trong quy trình nội dung: giáo viên đã đọc kỹ module thì ghi nhận duyệt (tên người duyệt, thời điểm).
 * Chỉ giáo viên đã onboarding mới gọi được; ghi bằng khóa máy chủ vì bảng modules không có policy ghi cho người dùng.
 */
export async function approveModule(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("moduleId"));
  const reviewer = z.string().trim().min(2).max(80).safeParse(formData.get("reviewer"));
  const confirmed = formData.get("confirm") === "on";
  if (!id.success) redirect("/teacher/modules");
  if (!reviewer.success || !confirmed) redirect(`/teacher/modules/${id.data}?error=form`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, onboarded_at").eq("id", user.id).maybeSingle();
  if (me?.role !== "teacher" || !me.onboarded_at) redirect("/home");

  const revoke = formData.get("revoke") === "1";
  await createAdminClient()
    .from("modules")
    .update(revoke ? { status: "team_checked", reviewed_by: null, reviewed_at: null } : { status: "teacher_approved", reviewed_by: reviewer.data, reviewed_at: new Date().toISOString() })
    .eq("id", id.data)
    .neq("status", "draft");
  revalidatePath(`/teacher/modules/${id.data}`);
  redirect(`/teacher/modules/${id.data}?ok=${revoke ? "revoked" : "approved"}`);
}
