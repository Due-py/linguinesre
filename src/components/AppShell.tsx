import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardCheck, History, House, LogOut, Mic, UserRound, Users, type LucideIcon } from "lucide-react";
import Logo from "@/components/Logo";
import { signOut } from "@/app/(auth)/actions";

export type NavItem = { href: string; label: string };

/** Biểu tượng của từng mục menu (thanh dưới cùng trên điện thoại). */
const ICON: Record<string, LucideIcon> = {
  "/student": House,
  "/student/practice": Mic,
  "/student/history": History,
  "/teacher": Users,
  "/teacher/modules": ClipboardCheck,
};

/** Menu học sinh: chỉ gồm trang đã có thật. */
export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "Tổng quan" },
  { href: "/student/practice", label: "Luyện nói" },
  { href: "/student/history", label: "Lịch sử" },
];

/** Menu giáo viên: lớp học và duyệt nội dung Learning Module. */
export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Lớp học" },
  { href: "/teacher/modules", label: "Duyệt nội dung" },
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
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Logo href={homeHref} />
          <div className="flex items-center gap-1 sm:gap-3">
            <p className="hidden text-right text-sm leading-tight sm:block">
              <span className="block font-bold">{name}</span>
              <span className="text-muted">{roleLabel}</span>
            </p>
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <UserRound className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">Tài khoản</span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted transition-colors hover:bg-sunken hover:text-ink"
              >
                <LogOut className="size-4" aria-hidden />
                <span>Đăng xuất</span>
              </button>
            </form>
          </div>
        </div>
        {/* Từ 640px: menu ngang dưới thanh đầu trang. Điện thoại: menu là thanh dưới cùng (bên dưới). Mỗi lúc chỉ hiện một menu. */}
        {nav && (
          <nav aria-label="Chính" className="mx-auto hidden w-full max-w-5xl px-2 pb-2 sm:block sm:px-4">
            <ul className="flex gap-2">
              {nav.map((n) => (
                <li key={n.href}>
                  <NavLink item={n} active={n.href === current} />
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id="main" className={`mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12 ${nav ? "pb-28 sm:pb-20" : "pb-20"}`}>
        {children}
      </main>
      {nav && (
        <nav aria-label="Chính" className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden">
          <ul className="mx-auto flex max-w-md justify-around gap-1 px-2 py-1.5">
            {nav.map((n) => (
              <li key={n.href} className="flex-1">
                <NavLink item={n} active={n.href === current} stacked />
              </li>
            ))}
          </ul>
        </nav>
      )}
      <footer className={`mx-auto w-full max-w-5xl border-t border-line px-4 py-6 text-sm text-muted sm:px-6 ${nav ? "mb-20 sm:mb-0" : ""}`}>
        <Link href="/quyen-rieng-tu" className="underline-offset-4 hover:text-ink hover:underline">
          Quyền riêng tư
        </Link>
      </footer>
    </div>
  );
}

/** Mục menu: đang mở thì nền xanh dương nhạt, viền xanh dương và aria-current (không chỉ dựa vào màu: còn có viền). */
function NavLink({ item, active, stacked }: { item: NavItem; active: boolean; stacked?: boolean }) {
  const Icon = ICON[item.href];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-2 rounded-xl border-2 font-extrabold transition-colors ${
        stacked ? "flex-col justify-center gap-0.5 px-1 py-1 text-xs" : "px-3 text-[0.95rem]"
      } ${active ? "border-sky bg-sky-soft text-sky-strong" : "border-transparent text-muted hover:bg-sunken hover:text-ink"}`}
    >
      {Icon && <Icon className={stacked ? "size-6" : "size-5"} aria-hidden />}
      {item.label}
    </Link>
  );
}
