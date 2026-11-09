import { describe, expect, it } from "vitest";
import { buildLayout, progressFraction, smoothPath, type Rect } from "@/lib/adventure/layout";
import { REGIONS, worldNodes } from "@/lib/adventure/world";

const themes = Object.fromEntries(REGIONS.map((r) => [r.phase, r.theme]));
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe.each(["horizontal", "vertical"] as const)("bản đồ %s", (o) => {
  const L = buildLayout(worldNodes(), o, themes);
  it("có đủ 14 nhiệm vụ và 5 mini-game, đúng 5 khu vực", () => {
    expect(L.nodes.filter((n) => n.node.kind === "quest")).toHaveLength(14);
    expect(L.nodes.filter((n) => n.node.kind === "game")).toHaveLength(5);
    expect(L.regions.map((r) => r.theme)).toEqual(["valley", "forest", "hills", "harbor", "summit"]);
  });
  it("nút không chồng nhau, nằm trong bản đồ", () => {
    for (const a of L.nodes) {
      expect(a.x - a.r).toBeGreaterThan(0);
      expect(a.y - a.r).toBeGreaterThan(0);
      expect(a.x + a.r).toBeLessThan(L.w);
      expect(a.y + a.r).toBeLessThan(L.h);
      for (const b of L.nodes) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(a.r + b.r + 20);
    }
  });
  it("nhãn không đè nhau, không đè nút, nằm trong bản đồ", () => {
    for (const a of L.nodes) {
      expect(a.label.x).toBeGreaterThanOrEqual(0);
      expect(a.label.y).toBeGreaterThanOrEqual(0);
      expect(a.label.x + a.label.w).toBeLessThanOrEqual(L.w);
      expect(a.label.y + a.label.h).toBeLessThanOrEqual(L.h);
      for (const b of L.nodes) {
        if (a !== b) expect(overlap(a.label, b.label)).toBe(false);
        const r = b.label;
        const dx = Math.max(r.x - a.x, 0, a.x - (r.x + r.w));
        const dy = Math.max(r.y - a.y, 0, a.y - (r.y + r.h));
        expect(Math.hypot(dx, dy)).toBeGreaterThan(a.r - 1);
      }
    }
  });
  it("mini-game nằm ngoài đường chính, có lối rẽ", () => {
    for (const n of L.nodes.filter((x) => x.node.kind === "game")) {
      const near = Math.min(...L.roadSamples.map((p) => Math.hypot(p.x - n.x, p.y - n.y)));
      expect(near).toBeGreaterThan(n.r + 30);
      expect(n.spur).toHaveLength(3);
    }
  });
  it("trang trí không đè đường, nút, nhãn", () => {
    expect(L.decor.length).toBeGreaterThan(20);
    for (const d of L.decor) {
      expect(Math.min(...L.roadSamples.map((p) => Math.hypot(p.x - d.x, p.y - d.y)))).toBeGreaterThan(d.s + 20);
      for (const n of L.nodes) expect(Math.hypot(n.x - d.x, n.y - d.y)).toBeGreaterThan(n.r + d.s);
    }
  });
  it("đường SVG hợp lệ và tiến độ tăng dần", () => {
    expect(smoothPath(L.road)).toMatch(/^M [\d.]+ [\d.]+ C /);
    const f = [0, 3, 7, 13].map((i) => progressFraction(L, i));
    expect(f).toEqual([...f].sort((a, b) => a - b));
    expect(f[3]).toBeLessThan(1);
    expect(progressFraction(L, -1)).toBe(0);
  });
});
