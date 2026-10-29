import Link from "next/link";

/** Biểu tượng sóng âm (SVG nội tuyến, không tải ảnh) + chữ LINGUA-REFLEX. */
export default function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2.5 font-extrabold tracking-tight">
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--brand)" />
        <g stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
          <path d="M8 14v4" />
          <path d="M12.5 10v12" />
          <path d="M17 7v18" />
          <path d="M21.5 11v10" />
          <path d="M26 14.5v3" />
        </g>
      </svg>
      <span>LINGUA-REFLEX</span>
    </Link>
  );
}
