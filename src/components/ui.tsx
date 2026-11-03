import type { ReactNode } from "react";

/**
 * Thành phần giao diện dùng chung (hệ thiết kế trong DESIGN.md). Không dùng hook, dùng được ở cả trang máy chủ và client.
 * Màu có nghĩa cố định: blue = thao tác/đang chọn, green = đúng/đạt/tiến độ, yellow = chú ý/điểm nhấn, red = lỗi/cảnh báo,
 * grey = trung tính. Không bao giờ chỉ dùng màu để báo trạng thái: luôn kèm chữ (và biểu tượng nếu là trạng thái).
 */
export type Tone = "blue" | "green" | "yellow" | "red" | "grey";

const PILL: Record<Tone, string> = {
  blue: "bg-brand-tonal text-brand-strong",
  green: "bg-[#ceead6] text-[#0d652d]",
  yellow: "bg-[#feefc3] text-[#7a4a00]",
  red: "bg-[#fad2cf] text-[#a50e0e]",
  grey: "bg-sunken text-ink",
};

/** Từ khóa trong tiêu đề lớn, nằm trong "viên thuốc" màu (dấu ấn kiểu trang sản phẩm Google). */
export function Highlight({ children, tone = "blue" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`inline-block rounded-full px-[0.32em] pb-[0.04em] leading-[1.15] ${PILL[tone]}`}>{children}</span>;
}

const CHIP: Record<Tone, string> = {
  blue: "bg-brand-soft text-brand-strong",
  green: "bg-success-soft text-success-strong",
  yellow: "bg-warn-soft text-warn",
  red: "bg-danger-soft text-danger",
  grey: "bg-sunken text-muted",
};

/** Nhãn trạng thái nhỏ (đã xong, đang làm, chưa mở…). icon: biểu tượng lucide đã đặt aria-hidden. */
export function Chip({ children, tone = "grey", icon }: { children: ReactNode; tone?: Tone; icon?: ReactNode }) {
  return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${CHIP[tone]}`}>{icon}{children}</span>;
}

/** Nhãn nhỏ phía trên tiêu đề của thẻ (eyebrow), như "LỘ TRÌNH 14 NGÀY". */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm font-medium uppercase tracking-wide text-muted ${className}`}>{children}</p>;
}

const BAR: Record<Tone, string> = { blue: "bg-brand", green: "bg-success", yellow: "bg-gold", red: "bg-danger-bright", grey: "bg-line-strong" };

/** Thanh tiến độ có role=progressbar và nhãn cho trình đọc màn hình; tự dài ra khi vào trang. */
export function Progress({ value, max, label, tone = "green", className = "" }: { value: number; max: number; label: string; tone?: Tone; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className={`h-2 overflow-hidden rounded-full bg-sunken ${className}`}>
      <span className={`grow-x block h-full rounded-full ${BAR[tone]}`} style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }} />
    </div>
  );
}

/** Ô số liệu thật: giá trị lớn, nhãn, ghi chú cách đo. Không có dữ liệu thì truyền value = null để hiện trạng thái bắt đầu. */
export function Stat({ label, value, note, empty = "Chưa có" }: { label: string; value: ReactNode | null; note?: ReactNode; empty?: string }) {
  return (
    <div className="grid content-start gap-1 rounded-3xl bg-tint px-5 py-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={value === null ? "text-lg text-muted" : "text-3xl font-semibold tabular-nums tracking-tight"}>{value ?? empty}</p>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

/** Tiêu đề một phần trong trang, có thể kèm liên kết "xem tất cả" bên phải. */
export function SectionHead({ id, title, action }: { id: string; title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        {title}
      </h2>
      {action}
    </div>
  );
}
