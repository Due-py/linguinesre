/**
 * Biểu đồ của trang thống kê nghiên cứu. SVG thuần, không thư viện, không hiệu ứng chuyển động.
 * - Màu chuỗi đã kiểm tra mù màu (dataviz validate_palette, nền sáng): xanh dương, cam, xanh ngọc, luôn theo cùng thứ tự.
 * - Danh tính chuỗi không chỉ bằng màu: có chú giải + nhãn ở cuối đường; mỗi biểu đồ có bảng số bên dưới (do trang đặt).
 * - Rê chuột / chạm vào điểm hoặc cột để xem giá trị (thẻ <title> của SVG).
 * - Chữ dùng màu chữ (ink/muted), không dùng màu của chuỗi. Một trục y, bắt đầu từ 0.
 */
import type { ReactNode } from "react";

export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"] as const;

export type Series = {
  name: string;
  values: (number | null)[];
  err?: (number | null)[];
};

const W = 640;
const H = 260;
const PAD = { l: 48, r: 96, t: 16, b: 36 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10])
    if (m * p >= v) return m * p;
  return 10 * p;
}

function Frame({
  max,
  unit,
  children,
  label,
}: {
  max: number;
  unit: string;
  children: ReactNode;
  label: string;
}) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
  return (
    // Màn hẹp: giữ bề rộng tối thiểu để chữ trục không quá nhỏ, cuộn ngang trong khung (bảng số bên dưới vẫn đọc được).
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="h-auto w-full min-w-[520px]"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD.l - 8}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={12}
              fill="var(--muted)"
            >
              {fmt(t)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={10} fontSize={12} fill="var(--muted)">
          {unit}
        </text>
        {children}
      </svg>
    </div>
  );
}

export const fmt = (v: number | null | undefined, d = 2) =>
  v === null || v === undefined || !Number.isFinite(v)
    ? "—"
    : v.toLocaleString("vi-VN", {
        maximumFractionDigits: d,
        minimumFractionDigits: 0,
      });

/** Đường theo các mốc (trước–sau, hoặc buổi 1–15). err = độ lệch chuẩn để vẽ thanh sai số (mean ± SD). */
export function LineChart({
  x,
  series,
  unit,
  label,
}: {
  x: string[];
  series: Series[];
  unit: string;
  label: string;
}) {
  const vals = series.flatMap((s) =>
    s.values.map((v, i) => (v ?? 0) + (s.err?.[i] ?? 0)),
  );
  const max = niceMax(Math.max(0, ...vals));
  const innerW = W - PAD.l - PAD.r;
  const px = (i: number) =>
    PAD.l + (x.length === 1 ? innerW / 2 : (innerW * i) / (x.length - 1));
  const py = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
  const every = x.length > 8 ? Math.ceil(x.length / 8) : 1;
  // Có thanh sai số: lệch các nhóm sang hai bên vài px để thanh không chồng lên nhau.
  const dodge = series.some((s) => s.err)
    ? (si: number) => (si - (series.length - 1) / 2) * 10
    : () => 0;
  // Nhãn cuối đường: xếp theo chiều dọc, cách nhau ít nhất 14px để không đè nhau.
  const labels = series
    .map((s, si) => {
      const last = s.values
        .map((v, i) => (v === null ? -1 : i))
        .filter((i) => i >= 0)
        .at(-1);
      return last === undefined
        ? null
        : {
            si,
            name: s.name,
            x: px(last) + dodge(si) + 10,
            y: py(s.values[last]!) + 4,
          };
    })
    .filter(
      (l): l is { si: number; name: string; x: number; y: number } =>
        l !== null,
    )
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++)
    labels[i].y = Math.max(labels[i].y, labels[i - 1].y + 14);
  return (
    <Frame max={max} unit={unit} label={label}>
      {x.map((t, i) =>
        i % every === 0 || i === x.length - 1 ? (
          <text
            key={t}
            x={px(i)}
            y={H - 12}
            textAnchor="middle"
            fontSize={12}
            fill="var(--muted)"
          >
            {t}
          </text>
        ) : null,
      )}
      {series.map((s, si) => {
        const color = SERIES_COLORS[si % SERIES_COLORS.length];
        const cx = (i: number) => px(i) + dodge(si);
        const pts = s.values.map((v, i) =>
          v === null ? null : ([cx(i), py(v)] as const),
        );
        // Đường đứt đoạn khi thiếu điểm: chỉ nối các điểm liền nhau có dữ liệu.
        const segs: string[] = [];
        let cur = "";
        pts.forEach((p) => {
          if (!p) {
            if (cur) segs.push(cur);
            cur = "";
          } else
            cur += `${cur ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
        });
        if (cur) segs.push(cur);
        return (
          <g key={s.name}>
            {segs.map((d) => (
              <path
                key={d}
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
            ))}
            {s.values.map((v, i) => {
              if (v === null) return null;
              const e = s.err?.[i] ?? null;
              return (
                <g key={i}>
                  {e !== null && e > 0 && (
                    <g stroke={color} strokeWidth={1.5}>
                      <line
                        x1={cx(i)}
                        x2={cx(i)}
                        y1={py(Math.max(0, v - e))}
                        y2={py(v + e)}
                      />
                      <line
                        x1={cx(i) - 5}
                        x2={cx(i) + 5}
                        y1={py(Math.max(0, v - e))}
                        y2={py(Math.max(0, v - e))}
                      />
                      <line
                        x1={cx(i) - 5}
                        x2={cx(i) + 5}
                        y1={py(v + e)}
                        y2={py(v + e)}
                      />
                    </g>
                  )}
                  <circle
                    cx={cx(i)}
                    cy={py(v)}
                    r={4.5}
                    fill={color}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                  {/* Vùng bấm lớn hơn điểm để dễ rê chuột / chạm. */}
                  <circle cx={cx(i)} cy={py(v)} r={14} fill="transparent">
                    <title>{`${s.name} · ${x[i]}: ${fmt(v)}${e !== null ? ` (± ${fmt(e)})` : ""}`}</title>
                  </circle>
                </g>
              );
            })}
          </g>
        );
      })}
      {series.length > 1 &&
        labels.map((l) => (
          <text key={l.name} x={l.x} y={l.y} fontSize={12} fill="var(--ink)">
            {l.name}
          </text>
        ))}
    </Frame>
  );
}

/** Cột theo nhóm (VD số học sinh hoàn thành mỗi buổi). Khe 2px giữa các cột cạnh nhau. */
export function BarChart({
  x,
  series,
  unit,
  label,
}: {
  x: string[];
  series: Series[];
  unit: string;
  label: string;
}) {
  const max = niceMax(
    Math.max(1, ...series.flatMap((s) => s.values.map((v) => v ?? 0))),
  );
  const innerW = W - PAD.l - PAD.r;
  const band = innerW / x.length;
  const barW = Math.max(3, Math.min(28, (band * 0.7) / series.length - 2));
  const py = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / max);
  const base = py(0);
  const every = x.length > 10 ? Math.ceil(x.length / 10) : 1;
  return (
    <Frame max={max} unit={unit} label={label}>
      {x.map((t, i) => (
        <g key={t}>
          {(i % every === 0 || i === x.length - 1) && (
            <text
              x={PAD.l + band * (i + 0.5)}
              y={H - 12}
              textAnchor="middle"
              fontSize={12}
              fill="var(--muted)"
            >
              {t}
            </text>
          )}
          {series.map((s, si) => {
            const v = s.values[i] ?? 0;
            const cx =
              PAD.l +
              band * (i + 0.5) +
              (si - (series.length - 1) / 2) * (barW + 2);
            const h = base - py(v);
            const r = Math.min(4, barW / 2, h);
            const x0 = cx - barW / 2;
            // Đầu cột bo 4px, chân cột vuông, đặt trên đường 0.
            const d =
              h <= 0
                ? ""
                : `M${x0},${base}V${base - h + r}Q${x0},${base - h} ${x0 + r},${base - h}H${x0 + barW - r}Q${x0 + barW},${base - h} ${x0 + barW},${base - h + r}V${base}Z`;
            return (
              <g key={s.name}>
                {d && (
                  <path d={d} fill={SERIES_COLORS[si % SERIES_COLORS.length]} />
                )}
                <rect
                  x={cx - band / 2 / series.length}
                  y={PAD.t}
                  width={band / series.length}
                  height={base - PAD.t}
                  fill="transparent"
                >
                  <title>{`${s.name} · ${t}: ${fmt(v, 0)}`}</title>
                </rect>
              </g>
            );
          })}
        </g>
      ))}
    </Frame>
  );
}

/** Chú giải: luôn có khi ≥ 2 chuỗi. */
export function Legend({ names }: { names: string[] }) {
  if (names.length < 2) return null;
  return (
    <ul
      className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink"
      aria-label="Chú giải"
    >
      {names.map((n, i) => (
        <li key={n} className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-3 rounded-full"
            style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
          />
          {n}
        </li>
      ))}
    </ul>
  );
}
