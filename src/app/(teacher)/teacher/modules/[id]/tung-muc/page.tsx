import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, CircleDashed, CircleMinus, RotateCcw } from "lucide-react";
import AppShell, { TEACHER_NAV } from "@/components/AppShell";
import { SubmitButton } from "@/components/form";
import { requireRole } from "@/lib/auth";
import { getModule, itemReviews } from "@/lib/module/server";
import { ITEM_SECTIONS, ITEM_STATUS_VI, itemStatus, moduleItems, reviewCounts, SECTION_VI, type ItemStatus } from "@/lib/module/items";
import { reviewItems } from "../../actions";

export const metadata: Metadata = { title: "Duyệt từng mục" };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ItemStatus, { tone: string; icon: React.ReactNode }> = {
  approved: { tone: "bg-brand-soft text-brand-strong", icon: <CircleCheck className="size-4 shrink-0" aria-hidden /> },
  stale: { tone: "bg-warn-soft text-warn", icon: <RotateCcw className="size-4 shrink-0" aria-hidden /> },
  needs_fix: { tone: "bg-danger-soft text-danger", icon: <CircleAlert className="size-4 shrink-0" aria-hidden /> },
  pending: { tone: "bg-sunken text-muted", icon: <CircleMinus className="size-4 shrink-0" aria-hidden /> },
};

/**
 * Bước "Thầy cô duyệt" cho TỪNG MỤC của module: mỗi mục có nguồn (SGK có trang, hoặc nhóm soạn) và trạng thái riêng.
 * Duyệt một mục, đánh dấu "cần sửa" kèm ghi chú, hoặc duyệt cả một phần. Mục đã duyệt mà nhóm sửa lại thì tự về "cần duyệt lại".
 */
export default async function ItemReviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const profile = await requireRole("teacher");
  const { id } = await params;
  const { ok, error } = await searchParams;
  const mod = await getModule(id);
  if (!mod) notFound();
  const items = moduleItems(mod.content);
  const { available, reviews } = await itemReviews(mod.id);
  const all = reviewCounts(items, reviews);

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher" nav={TEACHER_NAV} current="/teacher/modules">
      <div className="grid gap-8">
        <div className="grid gap-3">
          <Link href={`/teacher/modules/${mod.id}`} className="inline-flex min-h-11 w-fit items-center text-sm font-bold text-muted hover:text-ink">
            ← Về module
          </Link>
          <p className="text-muted">
            Lớp {mod.grade} · Unit {mod.unitNo} · {mod.content.edition}
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight">
            Duyệt từng mục: <span lang="en">{mod.title}</span>
          </h1>
          <p className="max-w-prose text-muted">
            Mục ghi “SGK tr. N” lấy từ sách. Mục ghi “Nhóm soạn” do nhóm viết thêm theo chủ đề Unit (có AI hỗ trợ soạn), cần thầy cô đọc kỹ. Học
            sinh thấy dấu “Thầy cô đã duyệt” ở mục đã duyệt.
          </p>
          <p className="font-bold">
            Đã duyệt {all.approved}/{all.total} mục · cần sửa {all.needs_fix} · cần duyệt lại {all.stale} · chưa duyệt {all.pending}
          </p>
        </div>

        {!available && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            Chưa lưu được kết quả duyệt từng mục: cần chạy file supabase/migrations/0011_item_reviews.sql trong SQL Editor của Supabase.
          </p>
        )}
        {ok && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 font-bold text-brand-strong">
            <CircleCheck className="size-5" aria-hidden />
            Đã lưu {ok} mục.
          </p>
        )}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {error === "note" ? "Khi đánh dấu “cần sửa”, hãy ghi rõ cần sửa gì." : error === "table" ? "Chưa lưu được. Kiểm tra đã chạy 0011_item_reviews.sql chưa." : "Chưa lưu được, hãy thử lại."}
          </p>
        )}

        <nav aria-label="Các phần" className="flex flex-wrap gap-2">
          {ITEM_SECTIONS.map((s) => {
            const c = reviewCounts(
              items.filter((x) => x.section === s),
              reviews,
            );
            return (
              <a key={s} href={`#${s}`} className="option-card inline-flex min-h-11 items-center gap-2 px-3 text-sm font-extrabold">
                {SECTION_VI[s]}
                <span className="tabular-nums text-muted">
                  {c.approved}/{c.total}
                </span>
              </a>
            );
          })}
        </nav>

        {ITEM_SECTIONS.map((s) => {
          const list = items.filter((x) => x.section === s);
          const todo = list.filter((x) => itemStatus(x, reviews.get(x.ref)) !== "approved");
          return (
            <section key={s} id={s} aria-labelledby={`h-${s}`} className="grid scroll-mt-24 gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id={`h-${s}`} className="text-2xl font-extrabold tracking-tight">
                  {SECTION_VI[s]} ({list.length})
                </h2>
                {todo.length > 0 && available && (
                  <form action={reviewItems}>
                    <input type="hidden" name="moduleId" value={mod.id} />
                    <input type="hidden" name="status" value="approved" />
                    <input type="hidden" name="anchor" value={s} />
                    {todo.map((x) => (
                      <input key={x.ref} type="hidden" name="ref" value={x.ref} />
                    ))}
                    <SubmitButton variant="quiet" pendingLabel="Đang lưu…">
                      Duyệt cả phần ({todo.length} mục còn lại)
                    </SubmitButton>
                  </form>
                )}
              </div>
              <ul className="grid gap-2">
                {list.map((x) => {
                  const r = reviews.get(x.ref);
                  const st = itemStatus(x, r);
                  return (
                    <li key={x.ref} className="grid gap-2 rounded-2xl border-2 border-line px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-muted">{x.id}</span>
                        <span className="rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold text-muted">
                          {x.origin.kind === "sgk" ? `SGK tr. ${x.origin.page}` : "Nhóm soạn"}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${STATUS_STYLE[st].tone}`}>
                          {STATUS_STYLE[st].icon}
                          {ITEM_STATUS_VI[st]}
                        </span>
                      </div>
                      <p>{x.labelVi}</p>
                      {r && (
                        <p className="text-sm text-muted">
                          {r.reviewer}, {new Date(r.reviewedAt).toLocaleDateString("vi-VN")}
                          {st === "needs_fix" && r.note ? `: ${r.note}` : ""}
                        </p>
                      )}
                      {available && (
                        <div className="flex flex-wrap items-start gap-2">
                          {st !== "approved" && (
                            <form action={reviewItems}>
                              <input type="hidden" name="moduleId" value={mod.id} />
                              <input type="hidden" name="status" value="approved" />
                              <input type="hidden" name="ref" value={x.ref} />
                              <input type="hidden" name="anchor" value={s} />
                              <SubmitButton pendingLabel="Đang lưu…" className="min-h-11 text-sm">
                                <CircleCheck className="size-4" aria-hidden />
                                Duyệt
                              </SubmitButton>
                            </form>
                          )}
                          <details className="group">
                            <summary className="option-card inline-flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-extrabold text-sky-strong [&::-webkit-details-marker]:hidden">
                              <CircleDashed className="size-4" aria-hidden />
                              Cần sửa
                            </summary>
                            <form action={reviewItems} className="mt-2 grid w-full max-w-md gap-2">
                              <input type="hidden" name="moduleId" value={mod.id} />
                              <input type="hidden" name="status" value="needs_fix" />
                              <input type="hidden" name="ref" value={x.ref} />
                              <input type="hidden" name="anchor" value={s} />
                              <label className="grid gap-1">
                                <span className="text-sm font-bold">Cần sửa gì?</span>
                                <textarea name="note" required maxLength={500} rows={2} className="rounded-xl border-2 border-line bg-sunken px-3 py-2" />
                              </label>
                              <SubmitButton variant="quiet" pendingLabel="Đang lưu…" className="min-h-11 w-fit text-sm">
                                Lưu ghi chú
                              </SubmitButton>
                            </form>
                          </details>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
