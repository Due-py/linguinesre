import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import Logo from "@/components/Logo";
import { signOut } from "@/app/(auth)/actions";

export type NavItem = { href: string; label: string };

/** Menu học sinh: chỉ gồm trang đã có thật. Giáo viên hiện mới có một trang chính nên chưa có menu. */
export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Tổng quan" },
  { href: "/student/practice", label: "Luyện nói" },
  { href: "/student/history", label: "Lịch sử" },
];

/** Khung chung của khu vực đã đăng nhập. current: href của mục menu đang mở (đánh dấu bằng gạch chân và aria-current). */
export default function AppShell({
  name,
  roleLabel,
  homeHref,
  nav,
  current,
  children,
}: {
  name: string;
  roleLabel: string;
  homeHref: string;
  nav?: NavItem[];
  current?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 font-bold text-bg focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Bỏ qua phần đầu trang
      </a>
      <header className="border-b border-line bg-bg/90">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Logo href={homeHref} />
          <div className="flex items-center gap-1 sm:gap-3">
            <p className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-bold">{name}</span>
              <span className="text-muted">{roleLabel}</span>
            </p>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-bold text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
                <span>Đăng xuất</span>
              </button>
            </form>
          </div>
        </div>
        {nav && (
          <nav aria-label="Chính" className="mx-auto w-full max-w-5xl px-2 sm:px-4">
            <ul className="flex gap-1">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={n.href === current ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center border-b-[3px] px-3 font-bold transition-colors ${
                      n.href === current ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
