import Link from "next/link";
import type { ComponentProps } from "react";

const base =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-base font-bold transition-colors";
const variants = {
  primary: "bg-brand text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong",
  secondary: "border-2 border-ink/80 bg-surface text-ink hover:bg-sunken",
} as const;

/** Liên kết trông như nút. Vùng chạm cao ≥ 48px. */
export default function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof variants }) {
  return <Link {...props} className={`${base} ${variants[variant]} ${className}`} />;
}
