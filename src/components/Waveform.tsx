/**
 * Sóng âm trang trí (họa tiết chính của LINGUA-REFLEX). Chạy đúng một lần lúc vào trang.
 * Chiều cao các cột là hằng số cố định (không phải dữ liệu), nên chỉ là hình trang trí và bị ẩn với trình đọc màn hình.
 */
const HEIGHTS = [28, 46, 70, 38, 88, 100, 62, 44, 76, 92, 52, 34, 66, 84, 40, 24];

export default function Waveform({ className = "", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <div aria-hidden className={`flex items-end gap-[3%] ${className}`}>
      {HEIGHTS.map((h, i) => (
        <span
          key={i}
          className="wave-bar block flex-1 rounded-full"
          style={{ height: `${h}%`, background: color, ["--i" as string]: i }}
        />
      ))}
    </div>
  );
}
