"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getModule } from "@/lib/module/server";
import { moduleItems } from "@/lib/module/items";

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

/**
 * Duyệt TỪNG MỤC: một mục (nút Duyệt / Cần sửa) hoặc cả một phần (nút Duyệt cả phần). Mã băm nội dung lấy từ module trên
 * máy chủ, không tin giá trị trình duyệt gửi lên. Ghi bằng khóa máy chủ sau khi đã kiểm tra là giáo viên.
 */
export async function reviewItems(formData: FormData) {
  const id = z.uuid().safeParse(formData.get("moduleId"));
  if (!id.success) redirect("/teacher/modules");
  const back = (q: string): never => redirect(`/teacher/modules/${id.data}/tung-muc?${q}`);
  const status = z.enum(["approved", "needs_fix"]).safeParse(formData.get("status"));
  const refs = formData.getAll("ref").map(String);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  if (!status.success || refs.length === 0 || refs.length > 60) back("error=form");
  if (status.data === "needs_fix" && !note) back("error=note");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase.from("profiles").select("role, onboarded_at, display_name").eq("id", user.id).maybeSingle();
  if (me?.role !== "teacher" || !me.onboarded_at) redirect("/home");

  const mod = await getModule(id.data);
  if (!mod) redirect("/teacher/modules");
  const byRef = new Map(moduleItems(mod.content).map((x) => [x.ref, x]));
  const rows = refs
    .filter((r) => byRef.has(r))
    .map((r) => ({
      module_id: id.data,
      item_ref: r,
      item_hash: byRef.get(r)!.hash,
      status: status.data,
      note: status.data === "needs_fix" ? note : null,
      reviewer: (me.display_name ?? "Giáo viên").slice(0, 80).padEnd(2, "."),
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }));
  if (rows.length === 0) back("error=form");
  const { error } = await createAdminClient().from("module_item_reviews").upsert(rows, { onConflict: "module_id,item_ref" });
  if (error) back("error=table");
  revalidatePath(`/teacher/modules/${id.data}/tung-muc`);
  const anchor = String(formData.get("anchor") ?? "").replace(/[^a-z0-9-]/g, "");
  back(`ok=${rows.length}${anchor ? `#${anchor}` : ""}`);
}
