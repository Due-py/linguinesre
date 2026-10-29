import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
  themeColor: "#f6f9fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={inter.variable} data-scroll-behavior="smooth">
      <body className="bg-bg font-sans text-ink">{children}</body>
    </html>
  );
}
