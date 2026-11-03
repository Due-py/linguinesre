import Link from "next/link";
import type { ComponentProps } from "react";

// app:… là kiểu nút Google (viên thuốc, lún nhẹ khi bấm) ngoài trang nghiên cứu; phần còn lại giữ như cũ cho .theme-classic.
const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[background-color,box-shadow,transform] active:translate-y-px app:font-medium app:press app:active:translate-y-0";
const variants = {
  primary: "bg-brand text-on-brand shadow-button hover:bg-brand-strong app:hover:shadow-card",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink/40 hover:bg-sunken app:border-line app:text-brand app:hover:border-line app:hover:bg-brand-soft",
  tonal: "bg-brand-soft text-brand-strong hover:bg-brand-tonal",
} as const;

/** Liên kết trông như nút. Vùng chạm cao ≥ 48px. */
export default function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />;
}
