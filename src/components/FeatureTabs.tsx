"use client";

import { useState, type ReactNode } from "react";

export type Feature = { id: string; tab: string; icon: ReactNode; title: string; text: string; points: string[]; preview: ReactNode };

/**
 * Bốn tính năng chính trên trang chủ: hàng tab (gạch chân xanh khi chọn), bên dưới là mô tả ngắn và ảnh giao diện minh họa.
 * Tab theo mẫu ARIA (mũi tên trái/phải để chuyển). Khi chưa tải JavaScript, tab đầu tiên hiện sẵn.
 */
export default function FeatureTabs({ features }: { features: Feature[] }) {
  const [active, setActive] = useState(0);
  const f = features[active];
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (active + (e.key === "ArrowRight" ? 1 : features.length - 1)) % features.length;
    setActive(next);
    document.getElementById(`tab-${features[next].id}`)?.focus();
  };
  return (
    <div className="grid gap-8">
      <div role="tablist" aria-label="Tính năng" className="mx-auto flex max-w-full gap-1 overflow-x-auto border-b border-line" onKeyDown={onKey}>
        {features.map((x, i) => (
          <button
            key={x.id}
            id={`tab-${x.id}`}
            role="tab"
            type="button"
            aria-selected={i === active}
            aria-controls={`panel-${x.id}`}
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            className={`-mb-px inline-flex min-h-12 shrink-0 items-center gap-2 border-b-[3px] px-4 font-medium transition-colors sm:px-6 ${
              i === active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {x.icon}
            {x.tab}
          </button>
        ))}
      </div>
      <div
        key={f.id}
        id={`panel-${f.id}`}
        role="tabpanel"
        aria-labelledby={`tab-${f.id}`}
        tabIndex={0}
        className="sheet-up grid items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14"
      >
        <div className="grid gap-4">
          <h3 className="text-3xl font-semibold tracking-tight sm:text-4xl">{f.title}</h3>
          <p className="text-lg text-muted">{f.text}</p>
          <ul className="grid gap-2">
            {f.points.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        {f.preview}
      </div>
    </div>
  );
}
