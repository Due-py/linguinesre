import { redirect } from "next/navigation";
import { getProfile, homePathFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Điểm vào sau đăng nhập: chuyển học sinh/giáo viên về đúng trang tổng quan, người mới về onboarding. */
export default async function HomeRedirect() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  redirect(profile.onboarded ? homePathFor(profile.role) : "/onboarding");
}
