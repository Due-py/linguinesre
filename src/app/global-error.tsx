"use client";

/** Lỗi ở chính khung trang (layout gốc). Không dùng được CSS chung nên viết kiểu trực tiếp, giữ thật đơn giản. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="vi">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f9fc", color: "#0a2540", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "64px 16px", display: "grid", gap: 16 }}>
          <h1 style={{ fontSize: 30, margin: 0 }}>Web vừa gặp lỗi</h1>
          <p style={{ fontSize: 18, color: "#425466", margin: 0 }}>Những câu trả lời đã lưu vẫn còn. Bấm “Thử lại” hoặc mở lại trang sau ít phút.</p>
          <button
            type="button"
            onClick={reset}
            style={{ width: "fit-content", minHeight: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#533afd", color: "#fff", fontSize: 16, fontWeight: 600 }}
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
