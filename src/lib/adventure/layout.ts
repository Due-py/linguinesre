/**
 * Bố cục bản đồ phiêu lưu: con đường uốn lượn qua các nhiệm vụ, mini-game nằm trên lối rẽ nhỏ, nhãn đặt chỗ không đè đường,
 * đồ trang trí rải theo khu vực nhưng tránh đường, nút và nhãn. Hai hướng: ngang (máy tính) và dọc (điện thoại), cùng một
 * cách tính. Thuần và tất định (cùng đầu vào cho cùng kết quả) để test được "không chồng lên nhau".
 */
import type { RegionTheme, WorldNode } from "./world";

export type Orientation = "horizontal" | "vertical";
export type Pt = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type DecorKind =
  | "tree"
  | "pine"
  | "bush"
  | "flowers"
  | "house"
  | "rock"
  | "sheep"
  | "mushroom"
  | "windmill"
  | "hay"
  | "boat"
  | "lighthouse"
  | "stall"
  | "mountain"
  | "tent"
  | "well";
export type Decor = { kind: DecorKind; x: number; y: number; s: number; flip: boolean };

export type PlacedNode = { node: WorldNode; x: number; y: number; r: number; label: Rect; spur: Pt[] | null };
export type RegionArea = { phase: number; theme: RegionTheme; from: number; to: number; banner: Pt };
export type MapLayout = {
  orientation: Orientation;
  w: number;
  h: number;
  road: Pt[]; // điểm điều khiển (qua các nhiệm vụ)
  roadSamples: Pt[]; // điểm dày dọc đường, để tránh va chạm
  nodes: PlacedNode[];
  regions: RegionArea[];
  decor: Decor[];
  water: { phase: number; points: Pt[] } | null;
};

export const NODE_R = { quest: 34, challenge: 42, game: 28 } as const;
/** Kích thước biển tên khu vực (HTML) để nhãn và trang trí tránh. */
export const BANNER = { w: 210, h: 46 } as const;
export const LABEL = { horizontal: { w: 176, h: 52 }, vertical: { w: 140, h: 52 } } as const;

const GEOM = {
  horizontal: { cross: 720, mid: 380, amp: 118, step: 210, pad: 170, period: 4.2 },
  vertical: { cross: 360, mid: 180, amp: 78, step: 185, pad: 150, period: 3.6 },
} as const;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
function rectDist(p: Pt, r: Rect) {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.w));
  const dy = Math.max(r.y - p.y, 0, p.y - (r.y + r.h));
  return Math.hypot(dx, dy);
}
const overlap = (a: Rect, b: Rect, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

/** Smooth Catmull-Rom qua các điểm, trả về đường SVG bằng các đoạn cong bậc ba. */
export function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** Lấy mẫu dày dọc đường cong (cùng công thức với smoothPath) để kiểm tra va chạm. */
function sampleSmooth(pts: Pt[], per = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const u = 1 - t;
      out.push({
        x: u * u * u * p1.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p2.x,
        y: u * u * u * p1.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p2.y,
      });
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function buildLayout(nodes: WorldNode[], orientation: Orientation, themes: Record<number, RegionTheme>): MapLayout {
  const g = GEOM[orientation];
  const H = orientation === "horizontal";
  const label = LABEL[orientation];
  // Vị trí dọc hành trình: nhiệm vụ cách nhau 1 đơn vị; mini-game nằm giữa nhiệm vụ trước và sau nó.
  const quests = nodes.filter((n) => n.kind === "quest");
  const sOf = new Map<string, number>();
  quests.forEach((q, i) => sOf.set(q.id, i));
  const along = (s: number) => g.pad + s * g.step;
  const across = (s: number) => g.mid + g.amp * Math.sin((2 * Math.PI * s) / g.period + 0.6);
  const at = (s: number): Pt => (H ? { x: along(s), y: across(s) } : { x: across(s), y: along(s) });
  const length = g.pad * 2 + (quests.length - 1) * g.step;
  const w = H ? length : g.cross;
  const h = H ? g.cross : length;

  const road = [at(-0.7), ...quests.map((_, i) => at(i)), at(quests.length - 1 + 0.6)];
  const roadSamples = sampleSmooth(road, 20);
  const nearRoad = (p: Pt) => Math.min(...roadSamples.map((q) => dist(p, q)));

  const placed: PlacedNode[] = [];
  const labels: Rect[] = [];
  const inBounds = (r: Rect, m = 8) => r.x >= m && r.y >= m && r.x + r.w <= w - m && r.y + r.h <= h - m;
  const roadHits = (r: Rect, clear: number) => roadSamples.some((q) => rectDist(q, r) < clear);

  function placeLabel(p: Pt, r: number): Rect {
    const gap = r + 10;
    const cands: Rect[] = [];
    // Dưới, trên (lệch dần sang hai bên), rồi phải, trái. Ưu tiên theo thứ tự này khi điểm bằng nhau.
    for (const extra of [0, 28])
      for (const shift of [0, -45, 45, -85, 85, -120, 120]) {
        cands.push({ x: p.x - label.w / 2 + shift, y: p.y + gap + extra, w: label.w, h: label.h });
        cands.push({ x: p.x - label.w / 2 + shift, y: p.y - gap - label.h - extra, w: label.w, h: label.h });
      }
    for (const dy of [0, -24, 24]) {
      cands.push({ x: p.x + gap, y: p.y - label.h / 2 + dy, w: label.w, h: label.h });
      cands.push({ x: p.x - gap - label.w, y: p.y - label.h / 2 + dy, w: label.w, h: label.h });
    }
    const score = (c: Rect) => {
      let s = 0;
      if (!inBounds(c)) s += 1000;
      if (roadHits(c, 14)) s += 100;
      for (const l of labels) if (overlap(c, l, 6)) s += 500;
      for (const n of placed) if (rectDist(n, c) < n.r + 6) s += 500;
      return s;
    };
    return cands.reduce((best, c) => (score(c) < score(best) ? c : best), cands[0]);
  }

  // Nhiệm vụ trước (nằm trên đường), rồi mini-game (lối rẽ), rồi nhãn của tất cả.
  for (const q of quests) {
    const p = at(sOf.get(q.id)!);
    placed.push({ node: q, x: p.x, y: p.y, r: q.kind === "quest" && q.challenge ? NODE_R.challenge : NODE_R.quest, label: { x: 0, y: 0, w: 0, h: 0 }, spur: null });
  }
  for (const n of nodes) {
    if (n.kind !== "game") continue;
    const s0 = sOf.get(`d${n.after}`)! + 0.5;
    const frame = (s: number) => {
      const a = at(s - 0.01);
      const b = at(s + 0.01);
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      return { base: at(s), normal: { x: -(b.y - a.y) / len, y: (b.x - a.x) / len } };
    };
    let best: { p: Pt; base: Pt; normal: Pt; score: number } | null = null;
    // Thử hai bên đường, vài khoảng cách, và lệch nhẹ dọc đường; chọn chỗ thoáng nhất.
    for (const lag of [0, -0.2, 0.2, -0.35, 0.35]) {
      const { base, normal } = frame(s0 + lag);
      for (const side of [1, -1])
        for (const d of [120, 145, 170, 100]) {
          const p = { x: base.x + normal.x * d * side, y: base.y + normal.y * d * side };
          const m = 70;
          if (p.x < m || p.y < m || p.x > w - m || p.y > h - m) continue;
          const clearance = Math.min(nearRoad(p), ...placed.map((o) => dist(p, o) - o.r));
          // Tránh đứng ngang hàng một nhiệm vụ (theo chiều đi): hai nhãn sẽ phải chen nhau ở cùng một hàng.
          const sameRow = placed.some((o) => Math.abs(H ? p.x - o.x : p.y - o.y) < 70);
          const score = clearance - Math.abs(d - 130) * 0.3 - Math.abs(lag) * 40 - (sameRow ? 200 : 0);
          if (!best || score > best.score) best = { p, base, normal, score };
        }
    }
    const { p, base, normal } = best ?? { p: at(s0), ...frame(s0) };
    placed.push({ node: n, x: p.x, y: p.y, r: NODE_R.game, label: { x: 0, y: 0, w: 0, h: 0 }, spur: [base, { x: (base.x + p.x) / 2 + normal.y * 18, y: (base.y + p.y) / 2 - normal.x * 18 }, p] });
  }
  // Biển tên khu vực (góc đầu mỗi khu) là vật cản cho nhãn.
  for (const phase of [...new Set(quests.map((q) => q.phase))]) {
    const idx = quests.findIndex((q) => q.phase === phase);
    const from = idx === 0 ? 0 : along(idx - 0.5);
    labels.push(H ? { x: from + 24, y: 22, w: BANNER.w, h: BANNER.h } : { x: 16, y: from + 18, w: BANNER.w, h: BANNER.h });
  }
  // Nhãn: thứ tự theo hành trình để nhãn trước được ưu tiên chỗ.
  const order = [...placed].sort((a, b) => (H ? a.x - b.x : a.y - b.y));
  for (const n of order) {
    n.label = placeLabel(n, n.r);
    labels.push(n.label);
  }
  // Giữ thứ tự gốc của world (để vẽ và đọc theo đúng thứ tự).
  placed.sort((a, b) => nodes.indexOf(a.node) - nodes.indexOf(b.node));

  // Khu vực: từ giữa nhiệm vụ cuối khu trước tới giữa nhiệm vụ đầu khu sau.
  const phases = [...new Set(quests.map((q) => q.phase))];
  const regions: RegionArea[] = phases.map((phase) => {
    const idx = quests.map((q, i) => (q.phase === phase ? i : -1)).filter((i) => i >= 0);
    const from = idx[0] === 0 ? 0 : along(idx[0] - 0.5);
    const to = idx.at(-1) === quests.length - 1 ? length : along(idx.at(-1)! + 0.5);
    const banner = H ? { x: from + 24, y: 22 } : { x: 16, y: from + 18 };
    return { phase, theme: themes[phase], from, to, banner };
  });

  // Nước (bến cảng): dải nước dọc mép bản đồ ở khu cảng.
  const harbor = regions.find((r) => r.theme === "harbor") ?? null;
  let water: MapLayout["water"] = null;
  if (harbor) {
    const pts: Pt[] = [];
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const t = harbor.from + ((harbor.to - harbor.from) * i) / steps;
      const wave = 18 * Math.sin(i * 0.9);
      pts.push(H ? { x: t, y: h - 120 + wave } : { x: w - 64 + wave, y: t });
    }
    water = { phase: harbor.phase, points: pts };
  }

  // Đồ trang trí: rải ngẫu nhiên có hạt giống cố định, tránh đường, nút, nhãn và nhau.
  const KINDS: Record<RegionTheme, DecorKind[]> = {
    valley: ["tree", "tree", "bush", "flowers", "house", "house", "sheep", "well", "rock"],
    forest: ["pine", "pine", "tree", "pine", "mushroom", "bush", "rock", "tent"],
    hills: ["windmill", "hay", "bush", "flowers", "tree", "rock", "windmill"],
    harbor: ["stall", "lighthouse", "boat", "rock", "bush", "house", "boat"],
    summit: ["mountain", "pine", "rock", "mountain", "pine", "tent", "rock"],
  };
  const SIZE: Record<DecorKind, number> = {
    tree: 26, pine: 26, bush: 16, flowers: 14, house: 30, rock: 14, sheep: 14, mushroom: 12, windmill: 36, hay: 16, boat: 24, lighthouse: 34, stall: 28, mountain: 64, tent: 24, well: 18,
  };
  const decor: Decor[] = [];
  const r = rng(H ? 7 : 11);
  for (const reg of regions) {
    const kinds = KINDS[reg.theme];
    const span = reg.to - reg.from;
    const want = Math.round((span / (H ? 120 : 95)) * (H ? 1.6 : 1.1));
    let tries = 0;
    let made = 0;
    while (made < want && tries < want * 40) {
      tries++;
      const kind = kinds[Math.floor(r() * kinds.length)];
      const s = SIZE[kind];
      const t = reg.from + 20 + r() * (span - 40);
      const c = 40 + r() * (g.cross - 80);
      const p = H ? { x: t, y: c } : { x: c, y: t };
      if (kind === "boat") {
        if (!water) continue;
        // Thuyền chỉ ở trên nước.
        const onWater = H ? p.y > h - 100 && p.y < h - 30 : p.x > w - 52;
        if (!onWater || reg.theme !== "harbor") continue;
      } else if (water && reg.theme === "harbor" && (H ? p.y > h - 150 : p.x > w - 100)) continue;
      if (nearRoad(p) < s + 34) continue;
      if (placed.some((n) => dist(p, n) < n.r + s + 22)) continue;
      if (labels.some((l) => rectDist(p, l) < s + 8)) continue;
      if (decor.some((d) => dist(p, d) < (SIZE[d.kind] + s) * 0.9)) continue;
      if (regions.some((o) => rectDist(p, { x: o.banner.x, y: o.banner.y, w: BANNER.w, h: BANNER.h }) < s + 6)) continue;
      if (p.x < s + 6 || p.y < s + 6 || p.x > w - s - 6 || p.y > h - s - 6) continue;
      decor.push({ kind, x: Math.round(p.x), y: Math.round(p.y), s: SIZE[kind], flip: r() < 0.5 });
      made++;
    }
  }
  // Vẽ từ xa tới gần (y nhỏ trước) để vật phía dưới che vật phía trên, như tranh minh họa.
  decor.sort((a, b) => a.y - b.y);
  // Làm tròn vị trí dùng cho HTML (style left/top): số thập phân dài làm máy chủ và trình duyệt ghi khác nhau (lỗi hydrate).
  const rd = (v: number) => Math.round(v);
  for (const n of placed) {
    n.x = rd(n.x);
    n.y = rd(n.y);
    n.label = { x: rd(n.label.x), y: rd(n.label.y), w: n.label.w, h: n.label.h };
  }
  for (const r of regions) r.banner = { x: rd(r.banner.x), y: rd(r.banner.y) };
  return { orientation, w, h, road, roadSamples, nodes: placed, regions, decor, water };
}

/** Phần đường đã đi (0–1) tới nhiệm vụ hiện tại, theo độ dài cung. */
export function progressFraction(layout: MapLayout, uptoIndex: number): number {
  if (uptoIndex < 0) return 0;
  const samples = layout.roadSamples;
  let total = 0;
  const cum: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    total += dist(samples[i], samples[i - 1]);
    cum.push(total);
  }
  const target = layout.road[uptoIndex + 1]; // road[0] là điểm bắt đầu trước nhiệm vụ đầu
  if (!target) return 1;
  let best = 0;
  for (let i = 1; i < samples.length; i++) if (dist(samples[i], target) < dist(samples[best], target)) best = i;
  return total ? cum[best] / total : 0;
}
