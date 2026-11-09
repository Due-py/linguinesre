"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canPractice } from "@/lib/research/server";
import { gamificationEnabled } from "@/lib/adventure/server";
import { MASCOT_SLOTS } from "@/lib/adventure/shop";

/**
 * Cửa hàng Penguin: mua và trang bị đồ trang trí. Mọi thứ kiểm tra ở máy chủ: giá, số dư, quyền sở hữu. Mua qua hàm
 * buy_item trong CSDL (một giao dịch, khóa theo học sinh) nên không âm tiền và không mua trùng. LC không mua được EXP
 * hay bất cứ thứ gì ảnh hưởng việc học.
 */

const KEY = z.string().regex(/^[a-z0-9_]{2,40}$/);
const SLOT = z.enum(MASCOT_SLOTS);

async function student() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role, onboarded_at").eq("id", user.id).maybeSingle();
  if (me?.role !== "student" || !me.onboarded_at) return null;
  if (!(await canPractice(user.id)) || !(await gamificationEnabled())) return null;
  return { supabase, userId: user.id };
}

export type BuyResult = { ok: true } | { ok: false; error: string };

const BUY_ERRORS: Record<string, string> = {
  no_item: "Món này không còn trong cửa hàng.",
  owned: "Em đã có món này rồi.",
  insufficient: "Em chưa đủ Lingua Coins cho món này. Học thêm rồi quay lại nhé, không vội.",
};

export async function buyItem(itemKey: string): Promise<BuyResult> {
  const key = KEY.safeParse(itemKey);
  if (!key.success) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const me = await student();
  if (!me) return { ok: false, error: "Cửa hàng chưa mở cho em." };
  const { data, error } = await createAdminClient().rpc("buy_item", { p_student: me.userId, p_item: key.data });
  if (error) return { ok: false, error: "Chưa mua được. Hãy thử lại sau." };
  if (data !== "ok") return { ok: false, error: BUY_ERRORS[String(data)] ?? "Chưa mua được." };
  revalidatePath("/student/cua-hang");
  revalidatePath("/student");
  return { ok: true };
}

export type EquipResult = { ok: true } | { ok: false; error: string };

/** Trang bị một món đã sở hữu (itemKey) hoặc bỏ trang bị một ô (itemKey = null). */
export async function equipItem(slot: string, itemKey: string | null): Promise<EquipResult> {
  const s = SLOT.safeParse(slot);
  if (!s.success || (itemKey !== null && !KEY.safeParse(itemKey).success)) return { ok: false, error: "Yêu cầu không hợp lệ." };
  const me = await student();
  if (!me) return { ok: false, error: "Cửa hàng chưa mở cho em." };
  if (itemKey) {
    // RLS: chỉ đọc được đồ của chính mình; kiểm tra món thuộc đúng ô.
    const [{ data: own }, { data: item }] = await Promise.all([
      me.supabase.from("owned_items").select("item_key").eq("student_id", me.userId).eq("item_key", itemKey).maybeSingle(),
      me.supabase.from("shop_items").select("slot").eq("key", itemKey).maybeSingle(),
    ]);
    if (!own || item?.slot !== s.data) return { ok: false, error: "Em chưa có món này." };
  }
  const { data: prof } = await me.supabase.from("adventure_profiles").select("cosmetics").eq("student_id", me.userId).maybeSingle();
  const cosmetics = { ...((prof?.cosmetics as Record<string, unknown> | null) ?? {}) };
  if (itemKey) cosmetics[`m_${s.data}`] = itemKey;
  else delete cosmetics[`m_${s.data}`];
  const { error } = await createAdminClient().from("adventure_profiles").upsert({ student_id: me.userId, cosmetics, updated_at: new Date().toISOString() }, { onConflict: "student_id" });
  if (error) return { ok: false, error: "Chưa lưu được. Hãy thử lại." };
  revalidatePath("/student/cua-hang");
  revalidatePath("/student");
  return { ok: true };
}
