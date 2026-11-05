import Image from "next/image";

/**
 * Linguine: chim cánh cụt đầu bếp Ý, linh vật của LINGUA-REFLEX và là "gương mặt" của trợ lý AI.
 * Linguine vẫn là AI: chỗ nào Linguine nhận xét thì vẫn ghi rõ là AI và có thể sai (DESIGN.md).
 *  - "full": cả người, cho trang chủ, màn hình xong bài, trạng thái trống.
 *  - "head": phần đầu trong vòng tròn, làm ảnh đại diện của AI (nhận xét, roleplay).
 * Ảnh trang trí: alt rỗng, vì chữ bên cạnh đã nói ai đang nói.
 */
export default function Linguine({
  pose = "full",
  size = 160,
  className = "",
  priority,
}: {
  pose?: "full" | "head";
  /** Chiều cao (full) hoặc đường kính (head), tính bằng px. */
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  if (pose === "head") {
    return (
      <span
        aria-hidden
        className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-gold-soft ring-1 ring-gold/40 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src="/linguine/linguine-face.png" alt="" width={256} height={256} className="size-full object-cover" priority={priority} />
      </span>
    );
  }
  return (
    <Image
      src="/linguine/linguine.png"
      alt=""
      aria-hidden
      width={427}
      height={720}
      priority={priority}
      className={`select-none ${className}`}
      style={{ height: size, width: "auto" }}
    />
  );
}
