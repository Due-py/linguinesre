import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import OnboardingForm from "@/components/OnboardingForm";
import { homePathFor, getProfile } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Thiết lập tài khoản" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  // Người dùng cũ không phải làm lại onboarding.
  if (profile.onboarded) redirect(homePathFor(profile.role));

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <form action={signOut}>
          <button type="submit" className="min-h-11 rounded-full px-4 text-sm font-bold text-muted hover:text-ink">
            Đăng xuất
          </button>
        </form>
      </header>
      <main id="main" className="mx-auto grid max-w-2xl gap-8 px-4 pb-16 pt-6 sm:px-6">
        <div className="grid gap-2">
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">Cho chúng tôi biết đôi điều về bạn</h1>
          <p className="max-w-prose text-muted">Chỉ vài câu hỏi ngắn. Chúng tôi không hỏi gì ngoài những thứ cần cho việc học.</p>
        </div>
        <OnboardingForm />
      </main>
    </div>
  );
}
