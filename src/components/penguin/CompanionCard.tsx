import Link from "next/link";
import { Coins, ShoppingBag } from "lucide-react";
import Mascot from "./Mascot";
import { levelTitle } from "@/lib/adventure/game";
import { greeting } from "@/lib/adventure/shop";
import type { AdventureState } from "@/lib/adventure/server";

/**
 * Khối nhỏ trên trang tổng quan: Linguine chào (theo việc học thật hôm nay), cấp, EXP, Lingua Coins và lối vào cửa hàng.
 * Cố ý nhỏ hơn thẻ "bài hôm nay": trò chơi hỗ trợ việc học, không tranh chỗ với việc học.
 */
export default function CompanionCard({ s, name, nextVi, doneToday, hour }: { s: AdventureState; name: string; nextVi: string | null; doneToday: boolean; hour: number }) {
  const g = greeting({ name, hour, nextVi, doneToday });
  const state = s.enabled && s.leveledUp ? "levelup" : g.state;
  const text = s.enabled && s.leveledUp ? `Chúc mừng ${name}, em vừa lên cấp ${s.level.level}! Cấp này ghi nhận việc em đã luyện đều.` : g.textVi;
  return (
    <section aria-labelledby="companion" className="grid items-center gap-4 rounded-[2rem] bg-tint p-5 sm:grid-cols-[auto_1fr_auto] sm:p-6">
      <Mascot state={state} look={s.look} size={120} />
      <div className="grid gap-3">
        <h2 id="companion" className="sr-only">
          Linguine và tiến trình phiêu lưu
        </h2>
        <p className="relative w-fit max-w-prose rounded-2xl bg-surface px-4 py-3 shadow-card">
          <span className="sr-only">Linguine: </span>
          {text}
        </p>
        {s.enabled && s.available && (
          <div className="grid max-w-md gap-1.5">
            <p className="flex flex-wrap justify-between gap-x-4 text-sm font-medium">
              <span>
                Cấp {s.level.level} · {levelTitle(s.level.level)}
              </span>
              <span className="tabular-nums text-muted">
                {s.level.into}/{s.level.need} EXP
              </span>
            </p>
            <div role="progressbar" aria-label="EXP tới cấp tiếp theo" aria-valuemin={0} aria-valuemax={s.level.need} aria-valuenow={s.level.into} className="h-2 overflow-hidden rounded-full bg-surface">
              <span className="grow-x block h-full rounded-full bg-gold" style={{ width: `${Math.max(s.level.into > 0 ? 3 : 0, Math.round((s.level.into / s.level.need) * 100))}%` }} />
            </div>
          </div>
        )}
      </div>
      {s.enabled && s.available && (
        <div className="flex flex-wrap items-center gap-2 sm:grid sm:justify-items-end">
          {s.shopAvailable && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1.5 text-sm font-semibold text-warn">
              <Coins className="size-4" aria-hidden />
              {s.coinBalance} LC
            </p>
          )}
          <Link href={s.shopAvailable ? "/student/cua-hang" : "/student/phieu-luu/ho-so"} className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium shadow-card hover:bg-brand-soft">
            <ShoppingBag className="size-4" aria-hidden />
            {s.shopAvailable ? "Cửa hàng Penguin" : "Hồ sơ phiêu lưu"}
          </Link>
        </div>
      )}
    </section>
  );
}
