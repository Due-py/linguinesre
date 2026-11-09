import Image from "next/image";
import { accessorySrc, spriteFor, type MascotLook, type MascotState } from "@/lib/adventure/shop";

/** Kích thước gốc của ảnh tư thế (cao 480px, rộng khác nhau); hiển thị theo chiều cao. */
const SPRITE_H = 480;
const WIDTHS: Record<string, number> = {
  idle: 238, waving: 300, happy: 270, celebrating: 358, thinking: 247, listening: 258, speaking: 317, encouraging: 292,
  confused: 259, sleeping: 241, studying: 284, levelup: 313, skin_winter: 299, skin_sailor: 275, skin_scholar: 301,
};
const EMPTY: MascotLook = { skin: null, accessory: null, background: null, effect: null };

/**
 * Linguine với đồ trang trí em đã chọn: phông nền phía sau, hiệu ứng, Linguine theo tư thế (gắn với sự kiện thật), phụ kiện
 * bên cạnh. Ảnh chỉ trang trí (alt rỗng); chữ bên cạnh nói Linguine đang làm gì. Không có phông nền thì nền trong suốt.
 */
export default function Mascot({ state, look = EMPTY, size = 160, framed = false, className = "", priority }: { state: MascotState; look?: MascotLook; size?: number; framed?: boolean; className?: string; priority?: boolean }) {
  const src = spriteFor(state, look);
  const key = src.split("/").pop()!.replace(".png", "");
  const w = Math.round(((WIDTHS[key] ?? 280) / SPRITE_H) * size);
  const box = framed || look.background;
  return (
    <span aria-hidden className={`relative inline-grid shrink-0 place-items-end justify-center overflow-hidden ${box ? "rounded-[1.75rem]" : ""} ${className}`} style={{ width: box ? Math.round(size * 1.05) : w, height: box ? Math.round(size * 1.12) : size }}>
      {look.background ? <Background k={look.background} /> : framed ? <span className="absolute inset-0 bg-tint" /> : null}
      {look.effect === "fx_glow" && <span className="absolute inset-x-[10%] top-[12%] bottom-[18%] rounded-full bg-gold/40 blur-2xl" />}
      <Image src={src} alt="" width={WIDTHS[key] ?? 280} height={SPRITE_H} priority={priority} className="relative object-contain" style={{ width: w, height: size }} />
      {look.accessory && (
        <Image src={accessorySrc(look.accessory)} alt="" width={200} height={200} className="absolute bottom-[4%] right-[2%] object-contain" style={{ width: size * 0.32, height: size * 0.32 }} />
      )}
      {look.effect === "fx_sparkle" && <Sparkles />}
      {look.effect === "fx_bubbles" && <Bubbles />}
    </span>
  );
}

/** Phông nền tự vẽ (SVG), cùng tông kem và xanh lá của ứng dụng. */
function Background({ k }: { k: string }) {
  const common = "absolute inset-0 size-full";
  switch (k) {
    case "bg_meadow":
      return (
        <svg className={common} viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice">
          <rect width="100" height="110" fill="#eaf4ef" />
          <ellipse cx="22" cy="18" rx="10" ry="4" fill="#fff" />
          <ellipse cx="74" cy="26" rx="12" ry="4.5" fill="#fff" />
          <path d="M0 78 Q30 62 60 74 T100 70 V110 H0Z" fill="#b9dca8" />
          <path d="M0 90 Q40 76 100 88 V110 H0Z" fill="#9ccc8a" />
        </svg>
      );
    case "bg_kitchen":
      return (
        <svg className={common} viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice">
          <rect width="100" height="110" fill="#fbf3e2" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={i} x={i * 18 - 4} y="0" width="9" height="70" fill="#f5e6c8" />
          ))}
          <rect x="8" y="22" width="34" height="3" rx="1.5" fill="#c99a6b" />
          <circle cx="15" cy="18" r="3.5" fill="#d62327" />
          <circle cx="25" cy="18" r="3.5" fill="#1b7d43" />
          <rect x="31" y="14" width="6" height="8" rx="1.5" fill="#f4b824" />
          <rect y="80" width="100" height="30" fill="#e8d7b5" />
          <rect y="78" width="100" height="4" fill="#c99a6b" />
        </svg>
      );
    case "bg_beach":
      return (
        <svg className={common} viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice">
          <rect width="100" height="110" fill="#e6f4fa" />
          <circle cx="80" cy="20" r="9" fill="#f9d56e" />
          <rect y="62" width="100" height="22" fill="#a7d6ea" />
          <path d="M8 70 q4 -3 8 0 q4 3 8 0 M50 74 q4 -3 8 0 q4 3 8 0" stroke="#fff" strokeWidth="1.5" fill="none" />
          <path d="M0 84 Q50 76 100 84 V110 H0Z" fill="#f4e3bf" />
        </svg>
      );
    case "bg_library":
      return (
        <svg className={common} viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice">
          <rect width="100" height="110" fill="#f3ead9" />
          {[18, 42, 66].map((y) => (
            <g key={y}>
              <rect x="0" y={y} width="100" height="3" fill="#a77b52" />
              {Array.from({ length: 12 }, (_, i) => (
                <rect key={i} x={2 + i * 8.3} y={y - 13 + (i % 3)} width="6" height={13 - (i % 3)} rx="1" fill={["#1b7d43", "#d62327", "#f4b824", "#8a5a3b", "#5aa864"][i % 5]} opacity="0.85" />
              ))}
            </g>
          ))}
          <rect y="88" width="100" height="22" fill="#d9c49d" />
        </svg>
      );
    case "bg_night":
      return (
        <svg className={common} viewBox="0 0 100 110" preserveAspectRatio="xMidYMid slice">
          <rect width="100" height="110" fill="#1f3a4d" />
          <circle cx="78" cy="20" r="8" fill="#fef6dc" />
          <circle cx="82" cy="17" r="7" fill="#1f3a4d" />
          {[[12, 14], [30, 30], [50, 10], [62, 36], [20, 50], [88, 46], [40, 56]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 2 ? 0.8 : 1.2} fill="#fef6dc" className="adv-glow" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
          <path d="M0 86 Q50 78 100 86 V110 H0Z" fill="#2d5a3e" />
        </svg>
      );
    default:
      return null;
  }
}

function Sparkles() {
  return (
    <span className="pointer-events-none absolute inset-0">
      {[
        [14, 20, 0],
        [80, 16, 0.5],
        [86, 52, 1],
        [10, 58, 1.5],
        [52, 8, 0.8],
      ].map(([x, y, d], i) => (
        <svg key={i} viewBox="0 0 10 10" className="adv-glow absolute size-[9%]" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}>
          <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4Z" fill="#f4b824" />
        </svg>
      ))}
    </span>
  );
}

function Bubbles() {
  return (
    <span className="pointer-events-none absolute inset-0">
      {[
        [12, 0],
        [30, 1.2],
        [72, 0.6],
        [86, 1.8],
      ].map(([x, d], i) => (
        <span key={i} className="mascot-bubble absolute bottom-0 size-[9%] rounded-full border-2 border-white/80 bg-white/30" style={{ left: `${x}%`, animationDelay: `${d}s` }} />
      ))}
    </span>
  );
}
