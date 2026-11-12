import "server-only";
import { redirect } from "next/navigation";
import { getProfile, type Profile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Arm, FormKey, Raw } from "./analysis";
import { fetchSheet, sheetsConfigured, type SheetResult } from "./sheets";

/**
 * Quyền xem trang thống kê nghiên cứu. Bảng research_staff không có policy RLS: chỉ khóa máy chủ đọc được,
 * nên học sinh và giáo viên không tự thêm mình vào được. Mức "blind" không bao giờ nhận cột nhóm A/B
 * (trừ khi người giữ danh sách đã bật unblinded sau khi chấm mù xong).
 */
export type Access = { profile: Profile; level: "blind" | "key"; label: string | null; unblinded: boolean; showArms: boolean };

export async function getResearchAccess(): Promise<Access | null> {
  const profile = await getProfile();
  if (!profile || !profile.onboarded) return null;
  const admin = createAdminClient();
  const [{ data: staff }, { data: setting }] = await Promise.all([
    admin.from("research_staff").select("level, label").eq("user_id", profile.id).maybeSingle(),
    admin.from("research_settings").select("value").eq("key", "unblinded").maybeSingle(),
  ]);
  if (!staff) return null;
  const level = staff.level as Access["level"];
  const unblinded = setting?.value === true;
  return { profile, level, label: staff.label, unblinded, showArms: level === "key" || unblinded };
}

/** Dùng ở trang: chưa đăng nhập → /login; không thuộc nhóm nghiên cứu → /home (không tiết lộ trang có gì). */
export async function requireResearch(): Promise<Access> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  const access = await getResearchAccess();
  if (!access) redirect("/home");
  return access;
}

/** Đọc hết một bảng theo trang 1000 dòng; orderBy là (các) cột duy nhất, cách nhau bằng dấu phẩy, để phân trang ổn định. */
async function all<T>(table: string, cols: string, orderBy: string): Promise<T[]> {
  const admin = createAdminClient();
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    let q = admin.from(table).select(cols);
    for (const c of orderBy.split(",")) q = q.order(c.trim());
    const { data, error } = await q.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const SHEET_FORMS: FormKey[] = ["F1", "F2", "F3", "F5", "F6", "F7"];

export type LoadResult = { raw: Raw; sheetState: Record<FormKey, SheetResult["state"]>; sheetErrors: string[]; sheetsConfigured: boolean };

/** Tải toàn bộ dữ liệu thô. Cột nhóm (arm) luôn được đọc ở máy chủ nhưng analysis.ts chỉ trả ra khi showArms. */
export async function loadResearchData(): Promise<LoadResult> {
  const admin = createAdminClient();
  const [participants, consent, attempts, responses, scores, sessions, turns, post, ...sheets] = await Promise.all([
    all<Raw["participants"][number]>("research_participants", "student_id, code, grade, form_order, arm, pilot", "student_id"),
    all<Raw["consent"][number]>("research_consent", "student_id, parent_consent_on, student_consent_on, withdrawn_on, withdraw_data", "student_id"),
    all<Raw["attempts"][number]>("test_attempts", "id, student_id, phase, form, status, started_at", "id"),
    all<Raw["responses"][number]>("test_responses", "id, attempt_id, form, rl_ms, rl_status", "id"),
    all<Raw["scores"][number]>("test_scores", "response_id, rater, score", "response_id, rater"),
    all<Raw["sessions"][number]>("mode_sessions", "id, student_id, mode, session_no, day, status, active_ms", "id"),
    all<Raw["turns"][number]>("mode_turns", "id, session_id, activity, time_limit_ms, rl_ms, rl_status, in_limit, hint_level", "id"),
    admin.from("research_settings").select("value").eq("key", "post_test_open").maybeSingle(),
    ...SHEET_FORMS.map((f) => fetchSheet(f)),
  ]);
  const sheetState = {} as Record<FormKey, SheetResult["state"]>;
  const sheetErrors: string[] = [];
  const sheetData: Raw["sheets"] = {};
  SHEET_FORMS.forEach((f, i) => {
    const r = sheets[i] as SheetResult;
    sheetState[f] = r.state;
    if (r.state === "ok") sheetData[f] = r.data;
    else if (r.state === "error") sheetErrors.push(`${f}: ${r.message ?? "lỗi"}`);
  });
  return {
    raw: {
      participants,
      consent,
      attempts,
      responses,
      scores,
      sessions,
      turns,
      sheets: sheetData,
      postTestOpen: (post as { data: { value: unknown } | null }).data?.value === true,
    },
    sheetState,
    sheetErrors,
    sheetsConfigured: sheetsConfigured(),
  };
}

export const parseArm = (v: string | null | undefined): Arm | null => (v === "A" || v === "B" ? v : null);
export const parseDay = (v: string | null | undefined): string | null => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
