import type { Metadata } from "next";
import Link from "next/link";
import { Award, Check, CircleAlert, Lock } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { Highlight } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { adventureState } from "@/lib/adventure/server";
import { ACHIEVEMENTS, COSMETICS, levelTitle, unlocked, XP, type AchievementKey, type CosmeticSlot } from "@/lib/adventure/game";
import { setCosmetic } from "../actions";

export const metadata: Metadata = { title: "Hồ sơ phiêu lưu" };
export const dynamic = "force-dynamic";

const SLOT_VI: Record<CosmeticSlot, string> = { flag: "Cờ trên nhiệm vụ đã xong", season: "Mùa của bản đồ", trail: "Kiểu đường đi" };
const fmt = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric", year: "numeric" });

/**
 * Hồ sơ phiêu lưu (TIẾN TRÌNH TRÒ CHƠI): cấp, XP lấy từ đâu, thành tích, đồ trang trí. Ghi rõ đây không phải trình độ tiếng Anh;
 * kỹ năng nói thật nằm ở trang Kỹ năng.
 */
export default async function AdventureProfile() {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const s = await adventureState(profile.id, profile.grade, null);
  const earned = new Map(s.achievements.map((a) => [a.key, a]));
  const keys = s.achievements.map((a) => a.key);
  const events = [...s.events].sort((a, b) => b.at.localeCompare(a.at));
  const label = (src: string, kind: string) => (kind === "quest" ? "Hoàn thành một nhiệm vụ" : kind === "game" ? "Lần đầu chơi xong một mini-game" : src.startsWith("daily:") ? `Thử thách ngày ${src.slice(6).split("-").reverse().join("/")}` : "Phần thưởng");

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/phieu-luu">
      <div className="grid gap-12">
        <div className="grid gap-3">
          <Link href="/student/phieu-luu" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
            ← Về bản đồ
          </Link>
          <h1 className="text-balance text-5xl font-semibold tracking-tight">
            Hồ sơ <Highlight tone="yellow">phiêu lưu</Highlight>
          </h1>
          <p className="max-w-prose text-lg text-muted">
            Cấp phiêu lưu đếm việc em đã luyện, <strong className="text-ink">không phải trình độ tiếng Anh</strong>. Khả năng nói thật của em được đo riêng ở trang{" "}
            <Link href="/student/ky-nang" className="font-semibold text-brand-strong hover:underline">
              Kỹ năng
            </Link>
            .
          </p>
        </div>

        {!s.available ? (
          <p className="flex max-w-prose items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            XP và thành tích chưa bật: cần chạy file supabase/migrations/0013_adventure.sql trong Supabase.
          </p>
        ) : (
          <>
            <section aria-labelledby="lv" className="grid gap-4 rounded-[2rem] bg-gold-soft p-6 sm:p-8">
              <h2 id="lv" className="text-3xl font-semibold tracking-tight">
                Cấp {s.level.level}: {levelTitle(s.level.level)}
              </h2>
              <div role="progressbar" aria-label="Tiến tới cấp tiếp theo" aria-valuemin={0} aria-valuemax={s.level.need} aria-valuenow={s.level.into} className="h-3 overflow-hidden rounded-full bg-surface">
                <span className="grow-x block h-full rounded-full bg-gold" style={{ width: `${Math.max(s.level.into > 0 ? 3 : 0, Math.round((s.level.into / s.level.need) * 100))}%` }} />
              </div>
              <p className="tabular-nums text-warn">
                Tổng {s.xp} XP · còn {s.level.need - s.level.into} XP lên cấp {s.level.level + 1}
              </p>
              <ul className="grid gap-1 text-sm text-muted sm:grid-cols-2">
                <li>Xong một nhiệm vụ: {XP.quest} XP (nhiệm vụ thử thách {XP.challenge} XP).</li>
                <li>Lần đầu chơi xong một mini-game ở mỗi Unit: {XP.game} XP.</li>
                <li>Thử thách trong ngày: {XP.daily} XP, mỗi ngày một lần.</li>
                <li>Không bao giờ bị trừ XP. Nghỉ học không mất gì. Dùng gợi ý không ảnh hưởng XP.</li>
              </ul>
            </section>

            <section aria-labelledby="ach" className="grid gap-4">
              <h2 id="ach" className="text-3xl font-semibold tracking-tight">
                Thành tích <span className="text-muted">{s.achievements.length}/{Object.keys(ACHIEVEMENTS).length}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(Object.keys(ACHIEVEMENTS) as AchievementKey[]).map((k, i) => {
                  const a = earned.get(k);
                  return (
                    <li key={k} className={`pop-in flex gap-3 rounded-3xl p-4 ${a ? "bg-brand-soft" : "bg-sunken"}`} style={{ ["--i" as string]: i }}>
                      <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-2xl ${a ? "bg-brand text-on-brand" : "bg-surface text-muted"}`}>
                        {a ? <Award className="size-6" /> : <Lock className="size-5" />}
                      </span>
                      <span className="grid gap-0.5">
                        <span className="font-semibold">{ACHIEVEMENTS[k].titleVi}</span>
                        <span className="text-sm text-muted">{a ? `${a.evidence ?? ""} ${fmt(a.earnedAt)}` : ACHIEVEMENTS[k].howVi}</span>
                        <span className="sr-only">{a ? "Đã đạt" : "Chưa đạt"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section aria-labelledby="cos" className="grid gap-4">
              <h2 id="cos" className="text-3xl font-semibold tracking-tight">
                Trang trí bản đồ
              </h2>
              <p className="max-w-prose text-muted">Chỉ để bản đồ đẹp theo ý em. Không ảnh hưởng bài học hay kết quả.</p>
              {(["flag", "season", "trail"] as CosmeticSlot[]).map((slot) => (
                <div key={slot} className="grid gap-2">
                  <h3 className="font-semibold">{SLOT_VI[slot]}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {COSMETICS.filter((c) => c.slot === slot).map((c) => {
                      const ok = unlocked(c, s.level.level, keys);
                      const on = s.cosmetics[slot] === c.key;
                      const how = "level" in c.unlock ? `Mở ở cấp ${c.unlock.level}` : `Mở khi đạt "${ACHIEVEMENTS[c.unlock.achievement].titleVi}"`;
                      return (
                        <li key={c.key}>
                          <form action={setCosmetic}>
                            <input type="hidden" name="slot" value={slot} />
                            <input type="hidden" name="key" value={c.key} />
                            <button
                              type="submit"
                              disabled={!ok || on}
                              aria-pressed={on}
                              title={ok ? undefined : how}
                              className={`press inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium ${on ? "bg-brand text-on-brand" : ok ? "bg-sunken hover:bg-line" : "bg-sunken text-muted"}`}
                            >
                              {on ? <Check className="size-4" aria-hidden /> : !ok ? <Lock className="size-4" aria-hidden /> : null}
                              {c.titleVi}
                              {!ok && <span className="text-xs">({how})</span>}
                            </button>
                          </form>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>

            <section aria-labelledby="log" className="grid gap-3">
              <h2 id="log" className="text-3xl font-semibold tracking-tight">
                XP đến từ đâu
              </h2>
              {events.length === 0 ? (
                <p className="text-muted">Chưa có XP. Hoàn thành nhiệm vụ đầu tiên trên bản đồ để bắt đầu.</p>
              ) : (
                <ul className="max-w-2xl divide-y divide-line border-y border-line">
                  {events.slice(0, 40).map((e) => (
                    <li key={e.source} className="flex justify-between gap-3 py-2.5">
                      <span>
                        {label(e.source, e.kind)} <span className="text-sm text-muted">· {fmt(e.at)}</span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">+{e.xp}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
