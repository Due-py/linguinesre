import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck, ShieldCheck } from "lucide-react";
import AppShell, { TEACHER_NAV } from "@/components/AppShell";
import { SubmitButton } from "@/components/form";
import KnowledgeBank from "@/components/module/KnowledgeBank";
import { requireRole } from "@/lib/auth";
import { getModule } from "@/lib/module/server";
import { approveModule } from "../actions";

export const metadata: Metadata = { title: "Duyệt module" };
export const dynamic = "force-dynamic";

const LEVEL_VI = { basic: "Cơ bản (ngày 11)", advanced: "Nâng cao (ngày 12)", final: "Đánh giá cuối (ngày 14, không gợi ý)" } as const;

/** Thầy cô đọc toàn bộ một module (kiến thức và bài luyện, kèm nguồn) rồi duyệt. */
export default async function TeacherModulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const profile = await requireRole("teacher");
  const { id } = await params;
  const { ok, error } = await searchParams;
  const mod = await getModule(id);
  if (!mod) notFound();
  const m = mod.content;
  const sgk = [...m.vocab, ...m.grammar, ...m.pronunciation, ...m.expressions].filter((x) => x.src.kind === "sgk").length;
  const total = m.vocab.length + m.grammar.length + m.pronunciation.length + m.expressions.length;
  const pairs = [...new Set(m.independent.map((q) => q.pair))].sort();

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher" nav={TEACHER_NAV} current="/teacher/modules">
      <div className="grid gap-10">
        <div className="grid gap-3">
          <Link href="/teacher/modules" className="inline-flex min-h-11 w-fit items-center text-sm font-bold text-muted hover:text-ink">
            ← Tất cả module
          </Link>
          <p className="text-muted">
            Lớp {mod.grade} · Unit {mod.unitNo} · {m.edition}, {m.pages}
          </p>
          <h1 lang="en" className="text-4xl font-extrabold tracking-tight">
            {mod.title}
          </h1>
          <p className="max-w-prose text-muted">
            {sgk}/{total} mục kiến thức lấy từ SGK (có số trang); còn lại do nhóm soạn theo chủ đề. Câu hỏi luyện nói chính (4 mức gợi ý) lấy từ Unit
            luyện tập đã duyệt.
          </p>
        </div>

        {ok && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 font-bold text-brand-strong">
            <CircleCheck className="size-5" aria-hidden />
            {ok === "approved" ? "Đã ghi nhận duyệt." : "Đã bỏ duyệt."}
          </p>
        )}
        {error === "form" && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            Cần ghi tên người duyệt và đánh dấu đã đọc kỹ.
          </p>
        )}

        <section className="grid gap-4 rounded-2xl border border-line bg-surface px-6 py-6">
          {mod.status === "teacher_approved" ? (
            <>
              <p className="flex items-center gap-2 font-bold">
                <ShieldCheck className="size-5 text-brand-strong" aria-hidden />
                Đã duyệt bởi {mod.reviewedBy}
                {mod.reviewedAt ? `, ${new Date(mod.reviewedAt).toLocaleDateString("vi-VN")}` : ""}.
              </p>
              <form action={approveModule}>
                <input type="hidden" name="moduleId" value={mod.id} />
                <input type="hidden" name="reviewer" value={mod.reviewedBy ?? "xx"} />
                <input type="hidden" name="confirm" value="on" />
                <input type="hidden" name="revoke" value="1" />
                <SubmitButton pendingLabel="Đang lưu…">Bỏ duyệt</SubmitButton>
              </form>
            </>
          ) : (
            <form action={approveModule} className="grid gap-4">
              <h2 className="text-xl font-extrabold">Duyệt module này</h2>
              <input type="hidden" name="moduleId" value={mod.id} />
              <label className="grid gap-1.5">
                <span className="text-sm font-bold">Tên người duyệt</span>
                <input
                  name="reviewer"
                  required
                  minLength={2}
                  maxLength={80}
                  defaultValue={profile.displayName ?? ""}
                  className="h-[52px] w-full max-w-md rounded-xl border border-line bg-surface px-4 text-base font-medium focus:border-ink focus:outline-none"
                />
              </label>
              <label className="flex items-start gap-3">
                <input type="checkbox" name="confirm" required className="mt-1 size-5" />
                <span>Tôi đã đọc kỹ kiến thức, bài luyện và tình huống bên dưới; nội dung đúng với SGK và phù hợp học sinh.</span>
              </label>
              <SubmitButton pendingLabel="Đang lưu…">Ghi nhận đã duyệt</SubmitButton>
            </form>
          )}
        </section>

        <KnowledgeBank moduleId={mod.id} m={m} listen={false} />

        <section className="grid gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Xếp câu và mở rộng câu</h2>
          <ul className="divide-y divide-line border-y border-line">
            {m.build.map((b) => (
              <li key={b.id} className="grid gap-0.5 py-3">
                <p lang="en" className="font-semibold">
                  {b.chunks.join(" / ")}
                </p>
                <p className="text-sm text-muted">{b.vi}</p>
              </li>
            ))}
            {m.expand.map((x) => (
              <li key={x.id} className="grid gap-0.5 py-3">
                <p lang="en">
                  <span className="font-semibold">{x.base}</span> → {x.steps.map((s) => `${s.ask} (+ ${s.add})`).join(" → ")}
                </p>
                <p lang="en" className="text-sm text-muted">
                  {x.full}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Một ý, nhiều cách hỏi</h2>
          <ul className="divide-y divide-line border-y border-line">
            {m.variations.map((v) => (
              <li key={v.id} className="grid gap-1 py-3">
                <p className="font-semibold">{v.ideaVi}</p>
                <ul lang="en" className="list-disc pl-5">
                  {v.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
                <p className="text-sm text-muted">
                  Câu tham khảo: <span lang="en">{v.exampleAnswer}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3">
          <h2 className="text-2xl font-extrabold tracking-tight">Câu nói độc lập: đầu module và cuối module</h2>
          <p className="max-w-prose text-muted">Mỗi cặp cùng dạng, cùng độ khó, khác câu chữ, để so sánh trước và sau công bằng. Học sinh không luyện các câu này.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left">
              <thead>
                <tr className="border-b border-line text-sm text-muted">
                  <th className="py-2 pr-3 font-semibold">Cặp</th>
                  <th className="py-2 pr-3 font-semibold">Ngày 1</th>
                  <th className="py-2 font-semibold">Ngày 13</th>
                </tr>
              </thead>
              <tbody lang="en" className="divide-y divide-line">
                {pairs.map((p) => (
                  <tr key={p}>
                    <td className="py-2 pr-3">{p}</td>
                    <td className="py-2 pr-3">{m.independent.find((q) => q.pair === p && q.set === "entry")?.text}</td>
                    <td className="py-2">{m.independent.find((q) => q.pair === p && q.set === "final")?.text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="text-2xl font-extrabold tracking-tight">Micro-Roleplay</h2>
          {m.roleplays.map((r) => (
            <article key={r.id} className="grid gap-2 rounded-2xl border border-line bg-surface px-5 py-5">
              <h3 className="text-lg font-extrabold">
                {r.titleVi} <span className="text-sm font-semibold text-muted">· {LEVEL_VI[r.level]}</span>
              </h3>
              <p>{r.contextVi}</p>
              <p className="text-sm">
                <strong>AI đóng vai:</strong> <span lang="en">{r.aiRole}</span>. <strong>Học sinh:</strong> {r.studentRoleVi}. <strong>Nhiệm vụ:</strong> {r.goalVi}
              </p>
              <p className="text-sm">
                <strong>Yêu cầu (máy kiểm tra bằng quy tắc):</strong> {r.requirements.map((q) => q.vi).join("; ")}
              </p>
              <p lang="en" className="text-sm">
                <strong>Opener:</strong> {r.opener}
                {r.stance && (
                  <>
                    {" "}
                    <strong>Different opinion:</strong> {r.stance}
                  </>
                )}
              </p>
              <p className="text-sm text-muted">
                Câu dự phòng khi AI lỗi: <span lang="en">{r.fallback.join(" / ")}</span>
              </p>
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
