"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Coins, Lock } from "lucide-react";
import Mascot from "./Mascot";
import { buyItem, equipItem } from "@/app/(student)/student/cua-hang/actions";
import { MASCOT_SLOTS, SLOT_VI, type MascotLook, type ShopItem } from "@/lib/adventure/shop";

/**
 * Cửa hàng Penguin: xem trước món đồ trên Linguine, xác nhận trước khi mua, trang bị hoặc bỏ trang bị đồ đã có.
 * Không ngẫu nhiên, không giới hạn thời gian. Số dư và quyền sở hữu do máy chủ quyết định (trang tải lại sau mỗi thao tác).
 */
export default function Shop({ catalog, owned, look, balance }: { catalog: ShopItem[]; owned: string[]; look: MascotLook; balance: number }) {
  const router = useRouter();
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [confirm, setConfirm] = useState<ShopItem | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDialogElement>(null);
  const shown: MascotLook = preview ? { ...look, [preview.slot]: preview.key } : look;

  const open = (item: ShopItem) => {
    setConfirm(item);
    setMsg(null);
    requestAnimationFrame(() => dialog.current?.showModal());
  };
  const buy = () =>
    start(async () => {
      if (!confirm) return;
      const r = await buyItem(confirm.key);
      dialog.current?.close();
      setMsg(r.ok ? { ok: true, text: `Đã mua ${confirm.nameVi}. Bấm "Dùng" để Linguine mặc thử.` } : { ok: false, text: r.error });
      setConfirm(null);
      router.refresh();
    });
  const equip = (item: ShopItem, on: boolean) =>
    start(async () => {
      const r = await equipItem(item.slot, on ? item.key : null);
      setMsg(r.ok ? { ok: true, text: on ? `Linguine đang dùng ${item.nameVi}.` : `Đã bỏ ${item.nameVi}.` } : { ok: false, text: r.error });
      router.refresh();
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:items-start">
      <aside className="grid justify-items-center gap-3 rounded-[2rem] bg-tint p-6 lg:sticky lg:top-24">
        <Mascot state={preview ? "happy" : "idle"} look={shown} size={220} framed />
        <p className="text-center text-sm text-muted" aria-live="polite">
          {preview ? `Đang xem thử: ${preview.nameVi}` : "Linguine của em hiện tại"}
        </p>
        <p className="inline-flex items-center gap-2 rounded-full bg-gold-soft px-4 py-2 font-semibold text-warn">
          <Coins className="size-5" aria-hidden />
          {balance} LC
        </p>
      </aside>

      <div className="grid gap-8">
        {msg && (
          <p role={msg.ok ? "status" : "alert"} className={`flex items-start gap-2 rounded-2xl px-4 py-3 font-medium ${msg.ok ? "bg-success-soft text-success-strong" : "bg-warn-soft text-warn"}`}>
            {msg.ok ? <Check className="mt-0.5 size-5 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />}
            {msg.text}
          </p>
        )}
        {MASCOT_SLOTS.map((slot) => {
          const items = catalog.filter((i) => i.slot === slot);
          if (items.length === 0) return null;
          return (
            <section key={slot} aria-labelledby={`slot-${slot}`} className="grid gap-3">
              <h2 id={`slot-${slot}`} className="text-2xl font-semibold tracking-tight">
                {SLOT_VI[slot]}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const has = owned.includes(item.key);
                  const on = look[slot] === item.key;
                  const enough = balance >= item.price;
                  return (
                    <li key={item.key} className={`grid content-start gap-3 rounded-3xl p-4 ${on ? "bg-brand-soft ring-2 ring-brand" : "bg-surface shadow-card"}`}>
                      <button
                        type="button"
                        onClick={() => setPreview(preview?.key === item.key ? null : item)}
                        aria-pressed={preview?.key === item.key}
                        className="press grid justify-items-center rounded-2xl bg-tint py-2"
                        aria-label={`Xem thử ${item.nameVi} trên Linguine`}
                      >
                        <Mascot state="idle" look={{ skin: null, accessory: null, background: null, effect: null, [slot]: item.key }} size={120} />
                      </button>
                      <div className="grid gap-0.5">
                        <p className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{item.nameVi}</span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-warn">
                            <Coins className="size-4" aria-hidden />
                            {item.price}
                          </span>
                        </p>
                        <p className="text-sm text-muted">{item.descriptionVi}</p>
                        <p className="text-xs font-medium text-muted">{on ? "Đang dùng" : has ? "Đã có" : enough ? "Chưa có" : `Còn thiếu ${item.price - balance} LC`}</p>
                      </div>
                      {has ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => equip(item, !on)}
                          className={`press min-h-11 rounded-full px-4 font-semibold disabled:opacity-60 ${on ? "bg-sunken hover:bg-line" : "bg-brand text-on-brand hover:bg-brand-strong"}`}
                        >
                          {on ? "Bỏ dùng" : "Dùng"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={pending || !enough}
                          onClick={() => open(item)}
                          className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-gold px-4 font-semibold text-ink hover:bg-[#e8ab14] disabled:bg-sunken disabled:text-muted"
                        >
                          {!enough && <Lock className="size-4" aria-hidden />}
                          Mua
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <dialog ref={dialog} onClose={() => setConfirm(null)} aria-labelledby="buy-title" className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[2rem] bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40">
        {confirm && (
          <div className="grid justify-items-center gap-4 p-6 text-center">
            <Mascot state="happy" look={{ ...look, [confirm.slot]: confirm.key }} size={150} framed />
            <h2 id="buy-title" className="text-2xl font-semibold tracking-tight">
              Mua {confirm.nameVi}?
            </h2>
            <p>
              Giá <strong>{confirm.price} LC</strong>. Sau khi mua em còn <strong>{balance - confirm.price} LC</strong>.
            </p>
            <p className="text-sm text-muted">Đồ trang trí chỉ để Linguine đẹp hơn, không ảnh hưởng bài học hay kết quả.</p>
            <div className="flex w-full gap-3">
              <button type="button" onClick={() => dialog.current?.close()} className="press min-h-12 flex-1 rounded-full bg-sunken font-semibold hover:bg-line">
                Để sau
              </button>
              <button type="button" onClick={buy} disabled={pending} className="press min-h-12 flex-1 rounded-full bg-brand font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60">
                {pending ? "Đang mua…" : "Mua"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
