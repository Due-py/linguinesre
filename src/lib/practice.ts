import "server-only";
import { createClient } from "@/lib/supabase/server";

export type UnitSummary = { id: string; unitNo: number; title: string; titleVi: string; topic: string };

/** Các Unit đã duyệt của khối (RLS chỉ trả Unit approved cho học sinh). */
export async function listUnitsForGrade(grade: number): Promise<UnitSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("units").select("id, unit_no, title, title_vi, topic").eq("grade", grade).order("unit_no");
  return (data ?? []).map((u) => ({ id: u.id, unitNo: u.unit_no, title: u.title, titleVi: u.title_vi, topic: u.topic }));
}
