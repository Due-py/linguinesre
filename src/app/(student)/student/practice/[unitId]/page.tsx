import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Luyện tự do đã bỏ (09/11): đường dẫn cũ của một Unit chuyển về bản đồ của Unit đó (nếu có module). */
export default async function PracticeUnitGone({ params }: { params: Promise<{ unitId: string }> }) {
  const { unitId } = await params;
  if (/^[0-9a-f-]{36}$/.test(unitId)) {
    const supabase = await createClient();
    const { data } = await supabase.from("modules").select("id").eq("unit_id", unitId).maybeSingle();
    if (data) redirect(`/student/phieu-luu?m=${data.id}`);
  }
  redirect("/student/phieu-luu");
}
