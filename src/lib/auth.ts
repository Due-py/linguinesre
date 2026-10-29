import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Role = "student" | "teacher";
export type Profile = {
  id: string;
  role: Role | null;
  displayName: string | null;
  grade: number | null;
  goal: string | null;
  onboarded: boolean;
};

/** Người đang đăng nhập và hồ sơ của họ. Gọi nhiều lần trong một request chỉ truy vấn một lần. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, display_name, grade, goal, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();
  return {
    id: user.id,
    role: (data?.role as Role | null) ?? null,
    displayName: data?.display_name ?? null,
    grade: data?.grade ?? null,
    goal: data?.goal ?? null,
    onboarded: Boolean(data?.onboarded_at),
  };
});

/** Trang nội bộ: phải đăng nhập, đã onboarding và đúng vai trò. Lớp quyết định thật là RLS; đây là chuyển hướng ở máy chủ. */
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.onboarded || !profile.role) redirect("/onboarding");
  if (profile.role !== role) redirect("/home");
  return profile;
}

export function homePathFor(role: Role | null): string {
  return role === "teacher" ? "/teacher" : role === "student" ? "/student" : "/onboarding";
}
