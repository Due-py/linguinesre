"use client";

import { useEffect, useRef } from "react";
import { Award, Check, Sparkles } from "lucide-react";
import Mascot from "@/components/penguin/Mascot";

export type CompletionData = {
  day: number;
  titleVi: string;
  regionVi: string;
  /** EXP của nhiệm vụ này (null khi chưa chạy 0013, chưa có hệ thống EXP). */
  xp: number | null;
  /** LC vừa nhận trong lần này (null: chưa chạy 0014). */
  coins: number | null;
  leveledUp: boolean;
  dailyXp: number | null;
  newAchievements: string[];
  level: { level: number; title: string; into: number; need: number } | null;
  /** Kết quả đo trực tiếp của bài này (số liệu thật). */
  facts: { label: string; value: string; note?: string }[];
  skills: string[];
  next: string | null;
};

/** Màn hình hoàn thành nhiệm vụ: một hiệu ứng ngắn, EXP vừa nhận, kết quả thật của bài, kỹ năng đã luyện, nhiệm vụ tiếp theo. */
export default function CompletionDialog({ data }: { data: CompletionData }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);
  const close = () => {
    ref.current?.close();
    // Bỏ ?xong khỏi địa chỉ để tải lại trang không hiện lại màn hình này.
    const url = new URL(window.location.href);
    url.searchParams.delete("xong");
    window.history.replaceState(null, "", url);
  };
  return (
    <dialog
      ref={ref}
      aria-labelledby="done-title"
      onClose={close}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-[2rem] bg-surface p-0 text-ink shadow-float backdrop:bg-ink/50"
    >
      <div className="grid gap-6 p-6 text-center sm:p-8">
        <div aria-hidden className="relative mx-auto grid h-40 w-44 place-items-end justify-center">
          {Array.from({ length: 10 }, (_, i) => (
            <span
              key={i}
              className="adv-ray absolute left-1/2 top-1/2 -ml-[3px] h-5 w-1.5 rounded-full"
              style={{ ["--a" as string]: `${i * 36}deg`, background: ["#1b7d43", "#f4b824", "#d62327"][i % 3] }}
            />
          ))}
          <Mascot state={data.leveledUp ? "levelup" : "celebrating"} size={150} className="adv-burst relative" />
          <span className="adv-burst absolute bottom-2 right-3 grid size-11 place-items-center rounded-full bg-brand text-on-brand shadow-[0_4px_0_var(--brand-strong)]">
            <Check className="size-6" strokeWidth={3} />
          </span>
        </div>
        <div className="grid gap-1">
          <p className="text-sm font-medium text-muted">
            Ngày {data.day} · {data.regionVi}
          </p>
          <h2 id="done-title" className="text-balance text-3xl font-semibold tracking-tight">
            Hoàn thành nhiệm vụ!
          </h2>
          <p className="text-lg text-muted">{data.titleVi}</p>
        </div>

        {data.xp !== null && (
          <div className="grid gap-3 rounded-3xl bg-gold-soft px-5 py-4">
            <p className="flex items-center justify-center gap-2 text-2xl font-semibold">
              <Sparkles className="size-6 text-[#a86f00]" aria-hidden />+{data.xp + (data.dailyXp ?? 0)} EXP{data.coins ? ` · +${data.coins} LC` : ""}
            </p>
            {data.dailyXp !== null && <p className="text-sm text-warn">Gồm {data.dailyXp} EXP của thử thách hôm nay.</p>}
            {data.leveledUp && data.level && <p className="font-semibold text-warn">Em vừa lên cấp {data.level.level}!</p>}
            {data.level && (
              <div className="grid gap-1 text-left">
                <p className="flex justify-between text-sm font-medium">
                  <span>
                    Cấp phiêu lưu {data.level.level}: {data.level.title}
                  </span>
                  <span className="tabular-nums text-muted">
                    {data.level.into}/{data.level.need} EXP
                  </span>
                </p>
                <div role="progressbar" aria-label="Tiến tới cấp phiêu lưu tiếp theo" aria-valuemin={0} aria-valuemax={data.level.need} aria-valuenow={data.level.into} className="h-2.5 overflow-hidden rounded-full bg-surface">
                  <span className="grow-x block h-full rounded-full bg-gold" style={{ width: `${Math.max(3, Math.round((data.level.into / data.level.need) * 100))}%` }} />
                </div>
                <p className="text-xs text-muted">Cấp phiêu lưu đo việc em đã luyện, không phải trình độ tiếng Anh.</p>
              </div>
            )}
          </div>
        )}

        {data.newAchievements.length > 0 && (
          <ul className="grid gap-2">
            {data.newAchievements.map((a) => (
              <li key={a} className="pop-in flex items-center justify-center gap-2 rounded-2xl bg-brand-soft px-4 py-2 font-semibold text-brand-strong">
                <Award className="size-5" aria-hidden />
                Thành tích mới: {a}
              </li>
            ))}
          </ul>
        )}

        {data.facts.length > 0 && (
          <div className="grid gap-2 text-left">
            <p className="text-sm font-medium text-muted">Bài hôm nay (đo trực tiếp)</p>
            <dl className="grid grid-cols-2 gap-2">
              {data.facts.map((f) => (
                <div key={f.label} className="grid gap-0.5 rounded-2xl bg-tint px-4 py-3">
                  <dt className="text-xs font-medium text-muted">{f.label}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{f.value}</dd>
                  {f.note && <dd className="text-xs text-muted">{f.note}</dd>}
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="grid gap-2 text-left">
          <p className="text-sm font-medium text-muted">Kỹ năng đã luyện</p>
          <ul className="flex flex-wrap gap-2">
            {data.skills.map((s) => (
              <li key={s} className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">
                {s}
              </li>
            ))}
          </ul>
        </div>

        {data.next && <p className="text-muted">Nhiệm vụ tiếp theo: <span className="font-semibold text-ink">{data.next}</span></p>}
        <button type="button" onClick={close} className="press inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong" autoFocus>
          Về bản đồ
        </button>
      </div>
    </dialog>
  );
}
