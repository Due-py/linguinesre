import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-[background-color,box-shadow,transform] active:translate-y-px";
const variants = {
  primary: "bg-brand text-on-brand shadow-button hover:bg-brand-strong",
  secondary: "border border-line-strong bg-surface text-ink hover:border-ink/40 hover:bg-sunken",
} as const;

/** Liên kết trông như nút. Vùng chạm cao ≥ 48px. */
export default function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />;
}
