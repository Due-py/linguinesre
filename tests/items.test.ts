import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { moduleSchema } from "@/lib/module/schema";
import { itemHash, itemStatus, ITEM_SECTIONS, moduleItems, reviewCounts, type ItemReview } from "@/lib/module/items";

const m = moduleSchema.parse(JSON.parse(readFileSync(join(process.cwd(), "content/modules/grade-8/unit-07.json"), "utf8")));

describe("kiểm duyệt từng mục", () => {
  it("mọi mục có mã ref riêng dạng phần:id, đủ 9 phần, nguồn SGK luôn có trang", () => {
    const items = moduleItems(m);
    expect(new Set(items.map((x) => x.ref)).size).toBe(items.length);
    for (const x of items) expect(x.ref).toMatch(/^[a-z]+:[a-z]\d{2}$/);
    expect(new Set(items.map((x) => x.section))).toEqual(new Set(ITEM_SECTIONS));
    for (const x of items) if (x.origin.kind === "sgk") expect(x.origin.page).toBeGreaterThan(0);
    // Bài luyện, câu hỏi, tình huống không có trong sách: luôn là "nhóm soạn".
    for (const x of items.filter((i) => ["build", "expand", "variations", "independent", "roleplays"].includes(i.section))) expect(x.origin.kind).toBe("team");
  });

  it("sửa nội dung một mục thì mã băm đổi, mục đã duyệt chuyển thành cần duyệt lại", () => {
    const [v] = moduleItems(m);
    const review = { status: "approved" as const, itemHash: v.hash };
    expect(itemStatus(v, review)).toBe("approved");
    const edited = { ...m, vocab: [{ ...m.vocab[0], vi: m.vocab[0].vi + " (đã sửa)" }, ...m.vocab.slice(1)] };
    const [v2] = moduleItems(edited);
    expect(v2.hash).not.toBe(v.hash);
    expect(itemStatus(v2, review)).toBe("stale");
    expect(itemStatus(v2, undefined)).toBe("pending");
    expect(itemStatus(v2, { status: "needs_fix", itemHash: v2.hash })).toBe("needs_fix");
    expect(itemHash({ a: 1 })).toMatch(/^[0-9a-f]{8}$/);
  });

  it("đếm theo trạng thái", () => {
    const items = moduleItems(m);
    const r = (x: (typeof items)[number], status: ItemReview["status"], hash = x.hash): [string, ItemReview] => [
      x.ref,
      { itemRef: x.ref, itemHash: hash, status, note: null, reviewer: "Cô Vân", reviewedAt: "2026-11-03T00:00:00Z" },
    ];
    const reviews = new Map([r(items[0], "approved"), r(items[1], "approved", "00000000"), r(items[2], "needs_fix")]);
    expect(reviewCounts(items, reviews)).toEqual({ approved: 1, stale: 1, needs_fix: 1, pending: items.length - 3, total: items.length });
  });
});
