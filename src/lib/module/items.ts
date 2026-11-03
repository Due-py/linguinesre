/**
 * Kiểm duyệt TỪNG MỤC của một module (bước Teacher Review trong quy trình nội dung): mỗi từ, cấu trúc, âm, cụm câu,
 * bài xếp câu, câu hỏi, tình huống có nguồn riêng và trạng thái duyệt riêng.
 *
 * Mỗi mục có mã băm nội dung (hash). Thầy cô duyệt một mục thì lưu hash lúc duyệt; nếu sau đó nhóm sửa mục đó (nạp lại file),
 * hash đổi và mục tự về "đã sửa sau khi duyệt", không còn được tính là đã duyệt.
 * Quy tắc thuần, không import gì ngoài kiểu, để dùng chung cho máy chủ, giao diện và test.
 */
import type { ModuleContent } from "./schema";

export const ITEM_SECTIONS = ["vocab", "grammar", "pronunciation", "expressions", "build", "expand", "variations", "independent", "roleplays"] as const;
export type ItemSection = (typeof ITEM_SECTIONS)[number];

export const SECTION_VI: Record<ItemSection, string> = {
  vocab: "Từ vựng",
  grammar: "Ngữ pháp",
  pronunciation: "Phát âm",
  expressions: "Cụm câu hay dùng",
  build: "Xếp câu",
  expand: "Mở rộng câu",
  variations: "Một ý, nhiều cách hỏi",
  independent: "Câu nói độc lập (bài đầu và cuối module)",
  roleplays: "Micro-Roleplay",
};

/**
 * Nguồn của mục: sgk = lấy từ sách (có số trang); team = nhóm soạn theo chủ đề SGK (có AI hỗ trợ soạn), chờ thầy cô duyệt.
 * Nội dung AI tạo lúc học (nhận xét, lời AI đóng vai) không nằm trong kho này và luôn được ghi là "AI nhận xét" / "AI đóng vai".
 */
export type ItemOrigin = { kind: "sgk"; page: number } | { kind: "team" };

export type ModuleItem = { ref: string; section: ItemSection; id: string; labelVi: string; origin: ItemOrigin; hash: string };

/** FNV-1a 32 bit, đủ để phát hiện nội dung một mục đã đổi (không dùng cho bảo mật). */
export function itemHash(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

const origin = (src?: { kind: "sgk" | "team"; page: number | null }): ItemOrigin =>
  src?.kind === "sgk" && src.page !== null ? { kind: "sgk", page: src.page } : { kind: "team" };

/** Mọi mục của module, theo thứ tự phần trong kho, mỗi mục một mã ref "<phần>:<id>" (ví dụ "vocab:v01"). */
export function moduleItems(m: ModuleContent): ModuleItem[] {
  const out: ModuleItem[] = [];
  const add = (section: ItemSection, x: { id: string; src?: { kind: "sgk" | "team"; page: number | null } }, labelVi: string) =>
    out.push({ ref: `${section}:${x.id}`, section, id: x.id, labelVi, origin: origin(x.src), hash: itemHash(x) });
  for (const v of m.vocab) add("vocab", v, `${v.en} ${v.ipa} (${v.pos}): ${v.vi}. Ví dụ: ${v.example}`);
  for (const g of m.grammar) add("grammar", g, `${g.name} (${g.nameVi}): ${g.formula}`);
  for (const p of m.pronunciation) add("pronunciation", p, `${p.focus}: ${p.words.join(", ")}`);
  for (const e of m.expressions) add("expressions", e, `${e.en} (${e.vi}). Ví dụ: ${e.example}`);
  for (const b of m.build) add("build", b, `${b.chunks.join(" / ")} (${b.vi})`);
  for (const x of m.expand) add("expand", x, `${x.base} → ${x.full}`);
  for (const w of m.variations) add("variations", w, `${w.ideaVi}: ${w.questions.join(" | ")}`);
  for (const q of m.independent) add("independent", q, `${q.set === "entry" ? "Đầu module" : "Cuối module"}, cặp ${q.pair}: ${q.text}`);
  for (const r of m.roleplays) add("roleplays", r, `${r.titleVi} (${r.level}): ${r.goalVi}`);
  return out;
}

export type ItemReview = { itemRef: string; itemHash: string; status: "approved" | "needs_fix"; note: string | null; reviewer: string; reviewedAt: string };

/** approved: thầy cô đã duyệt đúng nội dung hiện tại. stale: đã duyệt nhưng nhóm sửa sau đó. needs_fix: thầy cô yêu cầu sửa. */
export type ItemStatus = "approved" | "stale" | "needs_fix" | "pending";

export const ITEM_STATUS_VI: Record<ItemStatus, string> = {
  approved: "Thầy cô đã duyệt",
  stale: "Đã sửa sau khi duyệt, cần duyệt lại",
  needs_fix: "Thầy cô yêu cầu sửa",
  pending: "Chưa duyệt",
};

export function itemStatus(item: Pick<ModuleItem, "hash">, review: Pick<ItemReview, "status" | "itemHash"> | undefined): ItemStatus {
  if (!review) return "pending";
  if (review.status === "needs_fix") return "needs_fix";
  return review.itemHash === item.hash ? "approved" : "stale";
}

/** Đếm theo trạng thái (cả module hoặc một phần). */
export function reviewCounts(items: ModuleItem[], reviews: Map<string, ItemReview>): Record<ItemStatus, number> & { total: number } {
  const c = { approved: 0, stale: 0, needs_fix: 0, pending: 0, total: items.length };
  for (const it of items) c[itemStatus(it, reviews.get(it.ref))]++;
  return c;
}
