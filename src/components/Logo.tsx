import Link from "next/link";

// Năm vạch sóng âm bằng màu của Linguine (xanh lá Ý, vàng, đỏ Ý): dấu nhận diện của LINGUA-REFLEX.
const BARS = [
  { x: 4, h: 8, c: "#1b7d43" },
  { x: 10, h: 16, c: "#1b7d43" },
  { x: 16, h: 24, c: "#f4b824" },
  { x: 22, h: 14, c: "#d62327" },
  { x: 28, h: 8, c: "#d62327" },
];

/**
 * Biểu tượng sóng âm (SVG nội tuyến, không tải ảnh) + chữ LINGUA-REFLEX.
 * Trang nghiên cứu (.theme-classic) vẫn dùng biểu tượng cũ: hai bản cùng có trong trang, lớp app: chọn bản nào hiện.
 */
export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2.5 font-extrabold tracking-tight app:gap-2 app:font-medium app:tracking-normal">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0 app:hidden" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand)" />
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M8 14v4" />
          <path d="M12.5 10v12" />
          <path d="M17 7v18" />
          <path d="M21.5 11v10" />
          <path d="M26 14.5v3" />
        </g>
      </svg>
      <svg viewBox="0 0 32 32" className="hidden size-8 shrink-0 app:block" aria-hidden>
        {BARS.map((b) => (
          <line key={b.x} x1={b.x} x2={b.x} y1={16 - b.h / 2} y2={16 + b.h / 2} stroke={b.c} strokeWidth="4" strokeLinecap="round" />
        ))}
      </svg>
      <span className="app:text-[1.15rem]">LINGUA-REFLEX</span>
    </Link>
  );
}
