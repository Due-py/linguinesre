/**
 * Cửa hàng Penguin và linh vật Linguine (phần TRÒ CHƠI, chỉ trang trí). File thuần để test và dùng ở trình duyệt.
 * Danh mục giá nằm trong CSDL (shop_items, 0014); ở đây là cách hiển thị và quy tắc trang bị.
 */

export const MASCOT_SLOTS = ["skin", "accessory", "background", "effect"] as const;
export type MascotSlot = (typeof MASCOT_SLOTS)[number];
export const SLOT_VI: Record<MascotSlot, string> = { skin: "Trang phục", accessory: "Phụ kiện", background: "Phông nền", effect: "Hiệu ứng" };

export type ShopItem = { key: string; slot: MascotSlot; nameVi: string; descriptionVi: string; price: number; sort: number };
export type MascotLook = Record<MascotSlot, string | null>;

/**
 * 12 tư thế của Linguine (public/penguin/states). Mỗi tư thế gắn với một sự kiện THẬT của ứng dụng, không ngẫu nhiên.
 */
export const MASCOT_STATES = [
  "idle", // đứng yên: trang tổng quan, hồ sơ
  "waving", // chào: vào trang tổng quan
  "happy", // làm đúng một bước
  "celebrating", // xong một bài học
  "thinking", // đang chuẩn bị câu hỏi, đang chờ chấm / nhận xét
  "listening", // học sinh đang nói (đang ghi âm)
  "speaking", // đang đọc mẫu
  "encouraging", // khi em gặp khó (chưa nghe rõ, chưa đúng)
  "confused", // khi có lỗi cần làm lại
  "sleeping", // trạng thái nghỉ, trống
  "studying", // kho kiến thức, thẻ kiến thức
  "levelup", // lên cấp
] as const;
export type MascotState = (typeof MASCOT_STATES)[number];

export const stateSrc = (s: MascotState) => `/penguin/states/${s}.png`;
/** Trang phục (skin) có ảnh riêng cho tư thế đứng yên và vẫy tay; các tư thế khác dùng Linguine gốc. */
export const SKIN_STATES: MascotState[] = ["idle", "waving"];
export const skinSrc = (skin: string) => `/penguin/skins/${skin}.png`;
export const accessorySrc = (key: string) => `/penguin/accessories/${key}.png`;

export function spriteFor(state: MascotState, look: MascotLook): string {
  return look.skin && SKIN_STATES.includes(state) ? skinSrc(look.skin) : stateSrc(state);
}

/** Đồ đang dùng: chỉ giữ món em thật sự sở hữu (máy chủ cũng kiểm tra khi lưu). */
export function equippedLook(saved: Partial<Record<string, unknown>> | null, owned: ShopItem[]): MascotLook {
  const out: MascotLook = { skin: null, accessory: null, background: null, effect: null };
  for (const slot of MASCOT_SLOTS) {
    const key = saved?.[`m_${slot}`];
    if (typeof key === "string" && owned.some((i) => i.key === key && i.slot === slot)) out[slot] = key;
  }
  return out;
}

/** Lời của Linguine: ngắn, không thúc ép, không trách khi nghỉ, không khen quá mức. Chọn theo sự kiện thật. */
export function greeting(opts: { name: string; hour: number; nextVi: string | null; doneToday: boolean }): { state: MascotState; textVi: string } {
  const hi = opts.hour < 11 ? "Chào buổi sáng" : opts.hour < 18 ? "Chào buổi chiều" : "Chào buổi tối";
  if (opts.doneToday) return { state: "happy", textVi: `${hi}, ${opts.name}! Hôm nay em đã học rồi. Muốn ôn thêm thì chơi một mini-game ngắn, còn không thì nghỉ ngơi nhé.` };
  if (opts.nextVi) return { state: "waving", textVi: `${hi}, ${opts.name}! Tiếp theo là: ${opts.nextVi}. Khoảng 20 phút là xong.` };
  return { state: "waving", textVi: `${hi}, ${opts.name}! Chọn một Unit để bắt đầu nhé.` };
}
