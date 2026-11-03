"use client";

import { useEffect, useState } from "react";

/**
 * Số đếm tăng dần từ 0 tới giá trị thật (ý tưởng từ video tham khảo 1). Chỉ dùng cho số liệu thật.
 * Trình đọc màn hình đọc ngay giá trị cuối; người chọn giảm chuyển động thấy ngay giá trị cuối.
 */
export default function CountUp({ value, format = String, ms = 900 }: { value: number; format?: (n: number) => string; ms?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    // Giảm chuyển động: thời lượng 0, khung hình đầu tiên đã là số cuối.
    const dur = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      setShown(Math.round(value * (1 - (1 - k) ** 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return (
    <>
      <span aria-hidden className="tabular-nums">
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
