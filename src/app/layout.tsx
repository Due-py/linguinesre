import type { Metadata, Viewport } from "next";
import { Google_Sans, Inter } from "next/font/google";
import "./globals.css";

// Google Sans (Google Fonts, giấy phép mở): chữ của toàn bộ web. Inter chỉ còn cho trang nghiên cứu (.theme-classic), giữ nguyên tới hết nghiên cứu.
const googleSans = Google_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-google-sans",
  display: "swap",
  // Next.js chưa có số đo phông dự phòng cho Google Sans; tắt để không cảnh báo (chữ dự phòng vẫn là phông hệ thống).
  adjustFontFallback: false,
});
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LINGUA-REFLEX · Luyện nói tiếng Anh mỗi ngày",
    template: "%s · LINGUA-REFLEX",
  },
  description:
    "Luyện phản xạ nói tiếng Anh 10–15 phút mỗi ngày cho học sinh lớp 6–12, bám theo sách Global Success, có phản hồi sau mỗi câu trả lời.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${googleSans.variable} ${inter.variable}`} data-scroll-behavior="smooth">
      <body className="bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
