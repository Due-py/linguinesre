import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import OnboardingForm from "@/components/OnboardingForm";
import { homePathFor, getProfile } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import { checkFullName } from "@/lib/identity";

export const metadata: Metadata = { title: "Thiết lập tài khoản" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  // Người dùng cũ không phải làm lại onboarding.
  if (profile.onboarded) redirect(homePathFor(profile.role));
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const name = checkFullName(String(user?.user_metadata?.full_name ?? ""));

  return (
    <div className="min-h-dvh bg-tint">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <form action={signOut}>
          <button type="submit" className="min-h-11 rounded-full px-4 text-sm font-medium text-muted hover:bg-sunken hover:text-ink">
            Đăng xuất
          </button>
        </form>
      </header>
      <main id="main" className="mx-auto grid max-w-3xl px-3 pb-16 pt-2 sm:px-6">
        <div className="rise-in grid gap-8 rounded-[1.75rem] bg-surface p-6 sm:p-10">
          <div className="grid gap-2">
            <h1 className="text-balance text-4xl font-normal tracking-tight sm:text-[2.75rem] sm:leading-tight">Cho chúng tôi biết đôi điều về bạn</h1>
            <p className="text-lg text-muted">Chỉ vài câu hỏi ngắn. Chúng tôi không hỏi gì ngoài những thứ cần cho việc học.</p>
          </div>
          <OnboardingForm fullName={name.ok ? name.name : null} />
        </div>
      </main>
    </div>
  );
}
