import Link from "next/link";
import type { ReactNode } from "react";

export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5">
      <Link href="/" className="text-xl font-extrabold tracking-tight">
        Lingua<span className="text-accent">Reflex</span>
      </Link>
      <nav className="flex items-center gap-2 text-sm font-semibold">
        {children ?? (
          <>
            <Link href="/dang-nhap" className="rounded-full px-4 py-2 hover:bg-surface">
              Đăng nhập
            </Link>
            <Link href="/dang-ky" className="rounded-full bg-foreground px-4 py-2 text-background">
              Đăng ký
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
