import type { Metadata, Viewport } from "next";
import { Inter, Nunito } from "next/font/google";
import "./globals.css";

// Nunito: chữ tròn, thân thiện cho toàn bộ web. Inter chỉ còn cho trang nghiên cứu (.theme-classic), giữ nguyên tới hết nghiên cứu.
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  variable: "--font-nunito",
  display: "swap",
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
    <html lang="vi" className={`${nunito.variable} ${inter.variable}`} data-scroll-behavior="smooth">
      <body className="bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
