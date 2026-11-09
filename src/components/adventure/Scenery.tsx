/**
 * Phong cảnh bản đồ phiêu lưu, vẽ bằng SVG (hình phẳng, bo tròn, cùng một nét vẽ cho mọi vùng). Tự vẽ, không dùng tranh
 * của sản phẩm khác. Chỉ trang trí: mọi thứ ở đây aria-hidden, thông tin nằm ở nút và nhãn (HTML) bên trên.
 */
import type { Decor, MapLayout, Pt } from "@/lib/adventure/layout";
import { smoothPath } from "@/lib/adventure/layout";
import type { RegionTheme } from "@/lib/adventure/world";

export type Season = "spring" | "autumn" | "winter";
export type Trail = "road" | "flowers" | "stars";

type Palette = {
  base: string;
  ground: Record<RegionTheme, string>;
  patch: Record<RegionTheme, string>;
  crown: string;
  crownLight: string;
  pine: string;
  pineLight: string;
  trunk: string;
  water: string;
  waterLight: string;
  hill: string;
  snow: string;
};

const PALETTES: Record<Season, Palette> = {
  spring: {
    base: "#f6f0de",
    ground: { valley: "#dcefc8", forest: "#c9e4b8", hills: "#f2e6b8", harbor: "#f4e6c8", summit: "#e4e9e2" },
    patch: { valley: "#cbe6b1", forest: "#b6d9a2", hills: "#ead79a", harbor: "#ecdab3", summit: "#d6ddd6" },
    crown: "#5aa864",
    crownLight: "#86c47f",
    pine: "#2f7a4c",
    pineLight: "#4b9a63",
    trunk: "#8a5a3b",
    water: "#a7d6ea",
    waterLight: "#e3f4fb",
    hill: "#a9b8c2",
    snow: "#ffffff",
  },
  autumn: {
    base: "#f7eedb",
    ground: { valley: "#efe2bd", forest: "#e5d3a6", hills: "#f2dfae", harbor: "#f4e4c4", summit: "#e6e2d6" },
    patch: { valley: "#e6d3a1", forest: "#d9c38c", hills: "#e8cf8f", harbor: "#eadab2", summit: "#d9d4c6" },
    crown: "#e0893a",
    crownLight: "#f0b25e",
    pine: "#3e6e4a",
    pineLight: "#5c8a5f",
    trunk: "#7a4e33",
    water: "#9fcde0",
    waterLight: "#ddf0f7",
    hill: "#a7a99c",
    snow: "#fffaf0",
  },
  winter: {
    base: "#f2f6f9",
    ground: { valley: "#eef4f7", forest: "#e6eff3", hills: "#f4f6f8", harbor: "#edf1f2", summit: "#f8fafb" },
    patch: { valley: "#ffffff", forest: "#f7fafc", hills: "#ffffff", harbor: "#f6f8f9", summit: "#ffffff" },
    crown: "#9cc3b3",
    crownLight: "#ffffff",
    pine: "#356a57",
    pineLight: "#e9f2f5",
    trunk: "#6f5444",
    water: "#bcd8e6",
    waterLight: "#eef7fb",
    hill: "#b9c6d0",
    snow: "#ffffff",
  },
};

export const paletteOf = (season: Season) => PALETTES[season];

const SHADOW = "rgb(60 64 67 / 0.12)";

function at(d: Decor, children: React.ReactNode, className?: string) {
  return (
    <g transform={`translate(${d.x} ${d.y}) scale(${d.flip ? -1 : 1} 1)`} className={className}>
      {children}
    </g>
  );
}

function DecorShape({ d, p }: { d: Decor; p: Palette }) {
  const s = d.s;
  const shadow = <ellipse cx={0} cy={0} rx={s * 0.85} ry={s * 0.22} fill={SHADOW} />;
  switch (d.kind) {
    case "tree":
      return at(
        d,
        <>
          {shadow}
          <rect x={-s * 0.12} y={-s * 0.75} width={s * 0.24} height={s * 0.75} rx={s * 0.08} fill={p.trunk} />
          <circle cx={-s * 0.42} cy={-s * 0.95} r={s * 0.5} fill={p.crown} />
          <circle cx={s * 0.45} cy={-s * 1.0} r={s * 0.55} fill={p.crown} />
          <circle cx={0} cy={-s * 1.32} r={s * 0.72} fill={p.crown} />
          <circle cx={-s * 0.22} cy={-s * 1.55} r={s * 0.3} fill={p.crownLight} opacity={0.7} />
        </>,
      );
    case "pine":
      return at(
        d,
        <>
          {shadow}
          <rect x={-s * 0.1} y={-s * 0.45} width={s * 0.2} height={s * 0.45} fill={p.trunk} />
          <polygon points={`${-s * 0.75},${-s * 0.4} 0,${-s * 1.35} ${s * 0.75},${-s * 0.4}`} fill={p.pine} />
          <polygon points={`${-s * 0.6},${-s * 0.95} 0,${-s * 1.8} ${s * 0.6},${-s * 0.95}`} fill={p.pine} />
          <polygon points={`${-s * 0.42},${-s * 1.45} 0,${-s * 2.15} ${s * 0.42},${-s * 1.45}`} fill={p.pine} />
          <polygon points={`0,${-s * 2.15} ${-s * 0.42},${-s * 1.45} 0,${-s * 1.45}`} fill={p.pineLight} opacity={0.55} />
          <polygon points={`0,${-s * 1.8} ${-s * 0.6},${-s * 0.95} 0,${-s * 0.95}`} fill={p.pineLight} opacity={0.45} />
        </>,
      );
    case "bush":
      return at(
        d,
        <>
          {shadow}
          <circle cx={-s * 0.5} cy={-s * 0.4} r={s * 0.5} fill={p.crown} />
          <circle cx={s * 0.5} cy={-s * 0.42} r={s * 0.52} fill={p.crown} />
          <circle cx={0} cy={-s * 0.7} r={s * 0.62} fill={p.crownLight} />
        </>,
      );
    case "flowers":
      return at(
        d,
        <>
          {[-0.7, -0.2, 0.3, 0.75].map((x, i) => (
            <g key={i}>
              <line x1={s * x} y1={0} x2={s * x} y2={-s * (0.6 + (i % 2) * 0.3)} stroke={p.pine} strokeWidth={1.5} />
              <circle cx={s * x} cy={-s * (0.65 + (i % 2) * 0.3)} r={s * 0.24} fill={["#d62327", "#f4b824", "#ffffff", "#e7849a"][i]} />
            </g>
          ))}
        </>,
      );
    case "house":
      return at(
        d,
        <>
          <ellipse cx={0} cy={0} rx={s} ry={s * 0.2} fill={SHADOW} />
          <rect x={-s * 0.75} y={-s * 0.95} width={s * 1.5} height={s * 0.95} rx={s * 0.06} fill="#fffaf0" stroke="#e3d6bb" strokeWidth={1.5} />
          <polygon points={`${-s * 0.92},${-s * 0.92} 0,${-s * 1.65} ${s * 0.92},${-s * 0.92}`} fill="#d62327" />
          <polygon points={`0,${-s * 1.65} ${s * 0.92},${-s * 0.92} ${s * 0.3},${-s * 0.92}`} fill="#b81d21" />
          <rect x={-s * 0.18} y={-s * 0.5} width={s * 0.36} height={s * 0.5} rx={s * 0.06} fill="#8a5a3b" />
          <rect x={-s * 0.6} y={-s * 0.72} width={s * 0.28} height={s * 0.26} rx={s * 0.04} fill="#bfe1f0" />
          <rect x={s * 0.32} y={-s * 0.72} width={s * 0.28} height={s * 0.26} rx={s * 0.04} fill="#bfe1f0" />
        </>,
      );
    case "rock":
      return at(
        d,
        <>
          {shadow}
          <path d={`M ${-s} 0 Q ${-s * 0.9} ${-s * 0.9} ${-s * 0.1} ${-s * 0.95} Q ${s * 0.85} ${-s * 0.85} ${s} 0 Z`} fill="#b9bdb4" />
          <path d={`M ${-s * 0.55} ${-s * 0.55} Q ${-s * 0.2} ${-s * 0.9} ${s * 0.3} ${-s * 0.75}`} stroke="#d7dad3" strokeWidth={s * 0.18} strokeLinecap="round" fill="none" />
        </>,
      );
    case "sheep":
      return at(
        d,
        <>
          {shadow}
          <line x1={-s * 0.45} y1={0} x2={-s * 0.45} y2={-s * 0.5} stroke="#4a4a4a" strokeWidth={2} />
          <line x1={s * 0.35} y1={0} x2={s * 0.35} y2={-s * 0.5} stroke="#4a4a4a" strokeWidth={2} />
          <ellipse cx={0} cy={-s * 0.75} rx={s * 0.85} ry={s * 0.55} fill="#ffffff" stroke="#e5e0d4" strokeWidth={1.5} />
          <circle cx={-s * 0.4} cy={-s * 1.15} r={s * 0.32} fill="#ffffff" />
          <circle cx={s * 0.3} cy={-s * 1.18} r={s * 0.34} fill="#ffffff" />
          <ellipse cx={s * 0.95} cy={-s * 0.85} rx={s * 0.3} ry={s * 0.26} fill="#4a4a4a" />
        </>,
        "adv-sway",
      );
    case "mushroom":
      return at(
        d,
        <>
          {shadow}
          <rect x={-s * 0.22} y={-s * 0.7} width={s * 0.44} height={s * 0.7} rx={s * 0.15} fill="#fbf3e2" />
          <path d={`M ${-s * 0.8} ${-s * 0.62} Q 0 ${-s * 1.6} ${s * 0.8} ${-s * 0.62} Z`} fill="#d62327" />
          <circle cx={-s * 0.25} cy={-s * 0.98} r={s * 0.12} fill="#fff" />
          <circle cx={s * 0.25} cy={-s * 0.86} r={s * 0.1} fill="#fff" />
        </>,
      );
    case "windmill":
      return at(
        d,
        <>
          {shadow}
          <polygon points={`${-s * 0.35},0 ${-s * 0.2},${-s * 1.25} ${s * 0.2},${-s * 1.25} ${s * 0.35},0`} fill="#f7efe0" stroke="#e1d2b4" strokeWidth={1.5} />
          <rect x={-s * 0.1} y={-s * 0.35} width={s * 0.2} height={s * 0.35} rx={s * 0.04} fill="#8a5a3b" />
          <polygon points={`${-s * 0.3},${-s * 1.22} 0,${-s * 1.5} ${s * 0.3},${-s * 1.22}`} fill="#d62327" />
          <g transform={`translate(0 ${-s * 1.25})`}>
            <g className="adv-spin">
              {[0, 90, 180, 270].map((a) => (
                <rect key={a} x={-s * 0.07} y={-s * 0.95} width={s * 0.2} height={s * 0.85} rx={s * 0.03} fill="#ffffff" stroke="#d9cbb0" strokeWidth={1} transform={`rotate(${a})`} />
              ))}
              <circle r={s * 0.09} fill="#8a5a3b" />
            </g>
          </g>
        </>,
      );
    case "hay":
      return at(
        d,
        <>
          {shadow}
          <circle cx={0} cy={-s * 0.75} r={s * 0.75} fill="#e9c46a" />
          <circle cx={0} cy={-s * 0.75} r={s * 0.45} fill="none" stroke="#d4a94a" strokeWidth={2} />
          <circle cx={0} cy={-s * 0.75} r={s * 0.18} fill="none" stroke="#d4a94a" strokeWidth={2} />
        </>,
      );
    case "boat":
      return at(
        d,
        <g className="adv-bob">
          <path d={`M ${-s} ${-s * 0.35} L ${s} ${-s * 0.35} L ${s * 0.65} ${s * 0.15} L ${-s * 0.7} ${s * 0.15} Z`} fill="#8a5a3b" />
          <line x1={0} y1={-s * 0.35} x2={0} y2={-s * 1.6} stroke="#6f4a33" strokeWidth={2} />
          <polygon points={`${s * 0.06},${-s * 1.55} ${s * 0.85},${-s * 0.45} ${s * 0.06},${-s * 0.45}`} fill="#ffffff" />
          <polygon points={`${-s * 0.06},${-s * 1.3} ${-s * 0.6},${-s * 0.45} ${-s * 0.06},${-s * 0.45}`} fill="#d62327" />
        </g>,
      );
    case "lighthouse":
      return at(
        d,
        <>
          {shadow}
          <polygon points={`${-s * 0.32},0 ${-s * 0.2},${-s * 1.5} ${s * 0.2},${-s * 1.5} ${s * 0.32},0`} fill="#ffffff" stroke="#e1d2b4" strokeWidth={1.5} />
          <polygon points={`${-s * 0.28},${-s * 0.35} ${-s * 0.25},${-s * 0.65} ${s * 0.25},${-s * 0.65} ${s * 0.28},${-s * 0.35}`} fill="#d62327" />
          <polygon points={`${-s * 0.24},${-s * 0.95} ${-s * 0.22},${-s * 1.2} ${s * 0.22},${-s * 1.2} ${s * 0.24},${-s * 0.95}`} fill="#d62327" />
          <rect x={-s * 0.24} y={-s * 1.78} width={s * 0.48} height={s * 0.3} rx={s * 0.06} fill="#f4b824" className="adv-glow" />
          <polygon points={`${-s * 0.3},${-s * 1.78} 0,${-s * 2.05} ${s * 0.3},${-s * 1.78}`} fill="#1b7d43" />
        </>,
      );
    case "stall":
      return at(
        d,
        <>
          {shadow}
          <rect x={-s * 0.8} y={-s * 0.55} width={s * 1.6} height={s * 0.55} rx={s * 0.05} fill="#c99a6b" />
          <line x1={-s * 0.75} y1={-s * 0.55} x2={-s * 0.75} y2={-s * 1.3} stroke="#8a5a3b" strokeWidth={2} />
          <line x1={s * 0.75} y1={-s * 0.55} x2={s * 0.75} y2={-s * 1.3} stroke="#8a5a3b" strokeWidth={2} />
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M ${-s * 0.9 + i * s * 0.45} ${-s * 1.3} h ${s * 0.45} v ${s * 0.25} q ${-s * 0.225} ${s * 0.16} ${-s * 0.45} 0 Z`} fill={i % 2 ? "#ffffff" : "#d62327"} />
          ))}
          <circle cx={-s * 0.35} cy={-s * 0.62} r={s * 0.12} fill="#f4b824" />
          <circle cx={0} cy={-s * 0.62} r={s * 0.12} fill="#5aa864" />
          <circle cx={s * 0.35} cy={-s * 0.62} r={s * 0.12} fill="#d62327" />
        </>,
      );
    case "mountain":
      return at(
        d,
        <>
          <polygon points={`${-s},0 ${-s * 0.1},${-s * 1.25} ${s * 0.95},0`} fill={p.hill} />
          <polygon points={`${-s * 0.1},${-s * 1.25} ${s * 0.95},0 ${s * 0.3},0`} fill="rgb(0 0 0 / 0.08)" />
          <polygon points={`${-s * 0.1},${-s * 1.25} ${-s * 0.42},${-s * 0.82} ${-s * 0.22},${-s * 0.9} ${-s * 0.05},${-s * 0.78} ${s * 0.12},${-s * 0.92} ${s * 0.28},${-s * 0.82}`} fill={p.snow} />
        </>,
      );
    case "tent":
      return at(
        d,
        <>
          {shadow}
          <polygon points={`${-s * 0.9},0 0,${-s * 1.2} ${s * 0.9},0`} fill="#f4b824" />
          <polygon points={`0,${-s * 1.2} ${s * 0.9},0 ${s * 0.25},0`} fill="#d99e10" />
          <polygon points={`${-s * 0.22},0 0,${-s * 0.55} ${s * 0.22},0`} fill="#8a5a3b" />
        </>,
      );
    case "well":
      return at(
        d,
        <>
          {shadow}
          <rect x={-s * 0.7} y={-s * 0.6} width={s * 1.4} height={s * 0.6} rx={s * 0.2} fill="#c9c3b6" />
          <line x1={-s * 0.6} y1={-s * 0.6} x2={-s * 0.6} y2={-s * 1.4} stroke="#8a5a3b" strokeWidth={2} />
          <line x1={s * 0.6} y1={-s * 0.6} x2={s * 0.6} y2={-s * 1.4} stroke="#8a5a3b" strokeWidth={2} />
          <polygon points={`${-s * 0.9},${-s * 1.35} 0,${-s * 1.85} ${s * 0.9},${-s * 1.35}`} fill="#d62327" />
        </>,
      );
  }
}

/** Vùng đất của một khu: mép uốn lượn để các vùng nối vào nhau như tranh vẽ, không phải các ô vuông. */
function regionShape(layout: MapLayout, from: number, to: number, seed: number) {
  const H = layout.orientation === "horizontal";
  const cross = H ? layout.h : layout.w;
  const n = 16;
  const edge = (pos: number, k: number) => pos + 14 * Math.sin(k * 1.3 + seed) + 8 * Math.sin(k * 0.55 + seed * 2);
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const c = (cross * k) / n;
    const s0 = from === 0 ? -20 : edge(from, k);
    const s1 = edge(to, k + 3);
    a.push(H ? { x: s0, y: c } : { x: c, y: s0 });
    b.push(H ? { x: s1, y: c } : { x: c, y: s1 });
  }
  const pts = [...a, ...b.reverse()];
  return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ")} Z`;
}

function patches(layout: MapLayout, from: number, to: number, seed: number): { x: number; y: number; rx: number; ry: number }[] {
  const H = layout.orientation === "horizontal";
  const cross = H ? layout.h : layout.w;
  const out = [];
  const span = to - from;
  const count = Math.max(2, Math.round(span / 260));
  for (let i = 0; i < count; i++) {
    const t = from + span * ((i + 0.5) / count) + 30 * Math.sin(seed + i * 2.1);
    const c = cross * (0.2 + 0.6 * ((Math.sin(seed * 3 + i * 1.7) + 1) / 2));
    const rx = H ? 90 + 30 * Math.abs(Math.sin(i + seed)) : 70;
    const ry = H ? 50 : 90 + 30 * Math.abs(Math.sin(i + seed));
    out.push(H ? { x: t, y: c, rx, ry } : { x: c, y: t, rx, ry });
  }
  return out;
}

/** Nền: các vùng đất, mảng cỏ, nước ở bến cảng, mây và chim bay. */
export function Ground({ layout, season }: { layout: MapLayout; season: Season }) {
  const p = PALETTES[season];
  const H = layout.orientation === "horizontal";
  return (
    <g aria-hidden>
      <rect width={layout.w} height={layout.h} fill={p.base} />
      {layout.regions.map((r, i) => (
        <g key={r.phase}>
          <path d={regionShape(layout, r.from, r.to, i * 1.7)} fill={p.ground[r.theme]} />
          {patches(layout, r.from, r.to, i + 1).map((x, k) => (
            <ellipse key={k} cx={x.x} cy={x.y} rx={x.rx} ry={x.ry} fill={p.patch[r.theme]} opacity={0.75} />
          ))}
        </g>
      ))}
      {layout.water && (
        <g>
          <path
            d={
              H
                ? `M ${layout.water.points[0].x} ${layout.h} ${layout.water.points.map((q) => `L ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ")} L ${layout.water.points.at(-1)!.x} ${layout.h} Z`
                : `M ${layout.w} ${layout.water.points[0].y} ${layout.water.points.map((q) => `L ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ")} L ${layout.w} ${layout.water.points.at(-1)!.y} Z`
            }
            fill={p.water}
          />
          {layout.water.points
            .filter((_, i) => i % 3 === 1)
            .map((q, i) => (
              <path
                key={i}
                d={H ? `M ${q.x - 14} ${q.y + 40} q 7 -6 14 0 q 7 6 14 0` : `M ${q.x + 18} ${q.y - 14} q 6 7 0 14 q -6 7 0 14`}
                stroke={p.waterLight}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                className="adv-wave"
              />
            ))}
        </g>
      )}
    </g>
  );
}

/** Mây và chim: nhẹ, ít, trôi chậm (tắt khi giảm chuyển động). */
export function Sky({ layout }: { layout: MapLayout }) {
  const H = layout.orientation === "horizontal";
  const clouds = layout.regions.map((r, i) => {
    const t = r.from + (r.to - r.from) * (i % 2 ? 0.7 : 0.35);
    return H ? { x: t, y: 70 + (i % 2) * 30 } : { x: i % 2 ? 300 : 70, y: t };
  });
  const birds = layout.regions.filter((r) => r.theme === "hills" || r.theme === "summit" || r.theme === "harbor");
  return (
    <g aria-hidden>
      {clouds.map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`} opacity={0.9}>
          <g className="adv-drift" style={{ animationDelay: `${-i * 7}s` }}>
            <ellipse cx={0} cy={0} rx={34} ry={12} fill="#ffffff" />
            <circle cx={-12} cy={-8} r={12} fill="#ffffff" />
            <circle cx={8} cy={-11} r={15} fill="#ffffff" />
          </g>
        </g>
      ))}
      {birds.map((r, i) => {
        const t = r.from + (r.to - r.from) * 0.55;
        const c = H ? { x: t, y: 120 } : { x: 250, y: t + 40 };
        return (
          <g key={r.phase} transform={`translate(${c.x} ${c.y})`}>
            <g className="adv-fly" style={{ animationDelay: `${-i * 3}s` }}>
              {[0, 1, 2].map((k) => (
                <path key={k} d={`M ${k * 16} ${k % 2 ? 6 : 0} q 5 -5 9 0 q 4 -5 9 0`} stroke="#5f6368" strokeWidth={1.8} fill="none" strokeLinecap="round" />
              ))}
            </g>
          </g>
        );
      })}
    </g>
  );
}

/** Con đường: viền đất, mặt đường, vạch giữa theo kiểu đã chọn, phần đã đi tô màu thương hiệu, lối rẽ tới mini-game. */
export function Road({ layout, progress, trail }: { layout: MapLayout; progress: number; trail: Trail }) {
  const d = smoothPath(layout.road);
  return (
    <g aria-hidden>
      {layout.nodes
        .filter((n) => n.spur)
        .map((n) => (
          <path key={n.node.id} d={smoothPath(n.spur!)} stroke="#d2bd8c" strokeWidth={9} strokeLinecap="round" strokeDasharray="0.1 15" fill="none" />
        ))}
      <path d={d} stroke="#d2bd8c" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={d} stroke="#eddcb2" strokeWidth={31} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {trail === "road" && <path d={d} stroke="#fffaf0" strokeWidth={3} strokeDasharray="10 14" strokeLinecap="round" fill="none" />}
      {trail === "flowers" && <path d={d} stroke="#e7849a" strokeWidth={7} strokeDasharray="0.1 22" strokeLinecap="round" fill="none" />}
      {trail === "stars" && <path d={d} stroke="#f4b824" strokeWidth={6} strokeDasharray="0.1 18" strokeLinecap="round" fill="none" />}
      {progress > 0 && (
        <path
          d={d}
          pathLength={1000}
          stroke="#1b7d43"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={`${(progress * 1000).toFixed(1)} 3000`}
          fill="none"
          opacity={0.9}
          className="adv-trace"
          style={{ ["--len" as string]: (progress * 1000).toFixed(1) }}
        />
      )}
    </g>
  );
}

export function Decorations({ layout, season }: { layout: MapLayout; season: Season }) {
  const p = PALETTES[season];
  return (
    <g aria-hidden>
      {layout.decor.map((d, i) => (
        <DecorShape key={i} d={d} p={p} />
      ))}
    </g>
  );
}
