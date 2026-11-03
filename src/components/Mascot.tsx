/**
 * Linh vật của LINGUA-REFLEX: một "bong bóng lời nói" màu xanh có mắt, trên đầu là ba vạch sóng âm (lấy từ logo).
 * Tự vẽ bằng SVG, không dùng hình của ứng dụng khác. Chỉ để trang trí: luôn đi kèm chữ, trình đọc màn hình bỏ qua.
 * mood: happy (mặc định), talk (đang nói), think (đang nghĩ), cheer (mừng, nhảy lên hai lần).
 */
export type Mood = "happy" | "talk" | "think" | "cheer";

const MOUTH: Record<Mood, string> = {
  happy: "M50 76 Q60 85 70 76",
  talk: "M51 75 Q60 88 69 75 Z",
  think: "M56 79 Q60 77 64 79",
  cheer: "M47 73 Q60 90 73 73 Z",
};

export default function Mascot({ mood = "happy", className = "", still = false }: { mood?: Mood; className?: string; still?: boolean }) {
  const anim = still ? "" : mood === "cheer" ? "mascot-cheer" : "mascot-bob";
  const look = mood === "think" ? -3 : 0; // nhìn lên khi đang nghĩ
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={`${anim} ${className}`}>
      {/* Ba vạch sóng âm trên đầu */}
      <g stroke="#58cc02" strokeWidth="7" strokeLinecap="round">
        <path d="M48 22v-8" />
        <path d="M60 22V6" />
        <path d="M72 22v-10" />
      </g>
      {/* Thân: bong bóng lời nói bo tròn, có đuôi ở góc dưới trái */}
      <path d="M40 20h40a28 28 0 0 1 28 28v18a28 28 0 0 1-28 28H50l-22 16 6-19A28 28 0 0 1 12 66V48a28 28 0 0 1 28-28Z" fill="#58cc02" />
      <ellipse cx="60" cy="88" rx="30" ry="6" fill="#46a302" opacity="0.55" />
      {/* Má hồng */}
      <ellipse cx="31" cy="70" rx="6" ry="4" fill="#ff9ec4" opacity="0.8" />
      <ellipse cx="89" cy="70" rx="6" ry="4" fill="#ff9ec4" opacity="0.8" />
      {/* Mắt */}
      {mood === "cheer" ? (
        <g stroke="#3c3c3c" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M34 52 Q42 42 50 52" />
          <path d="M70 52 Q78 42 86 52" />
        </g>
      ) : (
        <>
          <g className={still ? "" : "mascot-eye"}>
            <circle cx="42" cy="52" r="14" fill="#fff" />
            <circle cx="78" cy="52" r="14" fill="#fff" />
          </g>
          <circle cx={45} cy={54 + look} r="7" fill="#3c3c3c" />
          <circle cx={81} cy={54 + look} r="7" fill="#3c3c3c" />
          <circle cx={47.5} cy={51 + look} r="2.4" fill="#fff" />
          <circle cx={83.5} cy={51 + look} r="2.4" fill="#fff" />
        </>
      )}
      {/* Miệng */}
      <path
        d={MOUTH[mood]}
        stroke="#3c3c3c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={mood === "talk" || mood === "cheer" ? "#c2185b" : "none"}
      />
    </svg>
  );
}

/** Bong bóng lời nói cạnh linh vật (viền 2px, đuôi chỉ về phía linh vật). tail: phía có đuôi. */
export function Bubble({ children, tail = "left", className = "" }: { children: React.ReactNode; tail?: "left" | "bottom"; className?: string }) {
  return (
    <div className={`relative rounded-2xl border-2 border-line bg-surface px-4 py-3 font-bold ${className}`}>
      {children}
      <span
        aria-hidden
        className={`absolute size-4 rotate-45 border-line bg-surface ${
          tail === "left" ? "-left-[9px] top-1/2 -mt-2 border-b-2 border-l-2" : "-bottom-[9px] left-8 border-b-2 border-r-2"
        }`}
      />
    </div>
  );
}
