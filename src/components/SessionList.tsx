import Link from "next/link";
import { ArrowRight, CircleCheck, CircleDashed } from "lucide-react";
import type { SessionRow } from "@/lib/sessions";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric" });

/** Danh sách buổi luyện: hàng ngăn bằng đường kẻ. Trạng thái luôn có biểu tượng và chữ. */
export default function SessionList({ sessions, hrefFor }: { sessions: SessionRow[]; hrefFor: (s: SessionRow) => string }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link href={hrefFor(s)} className="group grid grid-cols-[1fr_auto] items-center gap-4 py-4">
            <span className="grid gap-0.5">
              <span className="font-extrabold group-hover:underline">
                {s.unitNo ? `Unit ${s.unitNo}: ` : ""}
                <span lang="en">{s.unitTitle}</span>
              </span>
              <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted">
                {s.status === "completed" ? (
                  <span className="inline-flex items-center gap-1 font-bold text-brand-strong">
                    <CircleCheck className="size-4" aria-hidden />
                    Hoàn thành
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-bold text-warn">
                    <CircleDashed className="size-4" aria-hidden />
                    Đang làm {s.answered}/{s.total} câu
                  </span>
                )}
                <span>{dateFmt.format(new Date(s.completedAt ?? s.startedAt))}</span>
              </span>
            </span>
            <ArrowRight className="size-5 text-muted transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
