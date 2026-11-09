import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import Shop from "@/components/penguin/Shop";
import Mascot from "@/components/penguin/Mascot";
import { Highlight } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { adventureState } from "@/lib/adventure/server";

export const metadata: Metadata = { title: "Cửa hàng Penguin" };
export const dynamic = "force-dynamic";

/** Cửa hàng Penguin: tiêu Lingua Coins cho đồ trang trí của Linguine. Không bán EXP, không bán thứ gì ảnh hưởng việc học. */
export default async function ShopPage() {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const s = await adventureState(profile.id, profile.grade, null);

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/phieu-luu">
      <div className="grid gap-8">
        <div className="grid gap-3">
          <Link href="/student/phieu-luu/ho-so" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
            ← Hồ sơ phiêu lưu
          </Link>
          <h1 className="text-balance text-5xl font-semibold tracking-tight">
            Cửa hàng <Highlight tone="yellow">Penguin</Highlight>
          </h1>
          <p className="max-w-prose text-lg text-muted">
            Dùng Lingua Coins (LC) để trang trí Linguine. LC có được khi em học thật: xong nhiệm vụ, chơi đạt mini-game, lên cấp. LC không mua được EXP hay điểm.
          </p>
        </div>
        {!s.enabled ? (
          <Notice text="Phần trò chơi đang tạm tắt (trong thời gian nghiên cứu). Bài học vẫn dùng bình thường." />
        ) : !s.shopAvailable ? (
          <Notice text="Cửa hàng chưa bật: cần chạy file supabase/migrations/0014_shop.sql trong Supabase." />
        ) : (
          <Shop catalog={s.catalog} owned={s.owned.map((i) => i.key)} look={s.look} balance={s.coinBalance} />
        )}
      </div>
    </AppShell>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="flex max-w-prose items-center gap-4 rounded-3xl bg-sunken p-5">
      <Mascot state="sleeping" size={110} />
      <p className="flex items-start gap-2 font-medium text-muted">
        <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
        {text}
      </p>
    </div>
  );
}
