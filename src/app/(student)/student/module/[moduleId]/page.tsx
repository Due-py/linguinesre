import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpenText, CircleAlert, CircleCheck, Clock, Lock, ShieldCheck, TriangleAlert } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { SubmitButton } from "@/components/form";
import { ReportView, secs } from "@/components/module/Panels";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { getModule, moduleAttempts, moduleLessons, toHistory, toReport } from "@/lib/module/server";
import { DAY_INFO, errorCounts, median, nextOpenDay, PHASES } from "@/lib/module/plan";
import { moduleReport } from "@/lib/module/report";
import { ERROR_TAGS } from "@/lib/module/schema";
import { vnDay } from "@/lib/research/modes";
import { startLesson } from "../actions";

export const metadata: Metadata = { title: "Learning Module" };
export const dynamic = "force-dynamic";

/** Tổng quan một Learning Module: lộ trình 14 ngày, bài hôm nay, kết quả so với đầu module, lỗi hay gặp. Chỉ số liệu thật. */
export default async function ModulePage({ params, searchParams }: { params: Promise<{ moduleId: string }>; searchParams: Promise<{ error?: string; xong?: string }> }) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { moduleId } = await params;
  const { error, xong } = await searchParams;
  const m = await getModule(moduleId);
  if (!m || m.grade !== profile.grade) notFound();

  const [lessons, attempts] = await Promise.all([moduleLessons(profile.id, m.id), moduleAttempts(profile.id, m.id)]);
  const completed = lessons.filter((l) => l.status === "completed").map((l) => l.day);
  const open = lessons.find((l) => l.status === "in_progress");
  const nextDay = open?.day ?? nextOpenDay(completed);
  const today = vnDay(new Date());
  const doneToday = lessons.some((l) => l.completedAt && vnDay(new Date(l.completedAt)) === today);
  const report = moduleReport(m.content, toReport(attempts));
  const history = toHistory(attempts);

  // Error Memory: lỗi hay gặp nhất, kèm một ví dụ thật gần nhất (từ nhận xét AI đã kiểm chứng).
  const errors = [...errorCounts(history).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const exampleOf = (tag: string) => {
    for (const a of [...attempts].reverse()) {
      const i = a.ai_status === "ok" ? a.ai?.grammar.issues.find((x) => x.tag === tag) : undefined;
      if (i) return i;
    }
    return null;
  };
  // Progress Analytics: thời gian bắt đầu nói (trung vị lượt đầu) theo từng ngày đã học.
  const thinkByDay = Array.from(new Set(attempts.map((a) => a.day)))
    .sort((a, b) => a - b)
    .map((d) => ({ day: d, ms: median(attempts.filter((a) => a.day === d && (a.kind === "speak" || a.kind === "roleplay") && a.attempt_no === 1 && a.think_ms !== null).map((a) => a.think_ms!)) }))
    .filter((x): x is { day: number; ms: number } => x.ms !== null);
  const maxMs = Math.max(1, ...thinkByDay.map((x) => x.ms));

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/practice">
      <div className="grid gap-10">
        <div className="grid gap-3">
          <Link href="/student/practice" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted hover:text-ink">
            ← Tất cả Unit
          </Link>
          <p className="text-muted">Unit {m.unitNo} · Learning Module 14 ngày, mỗi ngày 15–25 phút</p>
          <h1 lang="en" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {m.title}
          </h1>
          <p className="text-lg text-muted">{m.content.titleVi}</p>
          <p className={`flex w-fit items-start gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${m.status === "teacher_approved" ? "bg-brand-soft text-brand-strong" : "bg-warn-soft text-warn"}`}>
            {m.status === "teacher_approved" ? <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden /> : <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />}
            {m.status === "teacher_approved"
              ? `Nội dung đã được thầy cô duyệt (${m.reviewedBy}).`
              : "Nội dung do nhóm soạn từ SGK và đã qua kiểm tra tự động, chưa được thầy cô duyệt."}
          </p>
          <Link href={`/student/module/${m.id}/kien-thuc`} className="inline-flex min-h-11 w-fit items-center gap-2 font-bold text-brand-strong hover:underline">
            <BookOpenText className="size-5" aria-hidden />
            Kho kiến thức của Unit: từ vựng, ngữ pháp, phát âm, cụm câu
          </Link>
        </div>

        {xong && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 font-bold text-brand-strong">
            <CircleCheck className="size-5" aria-hidden />
            Đã lưu bài ngày {xong}.
          </p>
        )}
        {error === "open" && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            Chưa mở được bài này. Các bài mở lần lượt; làm xong bài đang dở trước nhé.
          </p>
        )}

        <section className="grid gap-4 rounded-2xl bg-forest px-6 py-8 text-on-forest sm:px-10">
          {nextDay === null ? (
            <>
              <h2 className="text-3xl font-extrabold tracking-tight">Em đã học xong cả 14 ngày</h2>
              <p className="text-on-forest-muted">Xem kết quả so sánh đầu và cuối module ở bên dưới.</p>
            </>
          ) : (
            <>
              <p className="text-on-forest-muted">
                Ngày {nextDay}/14 · Giai đoạn {PHASES.find((p) => (p.days as readonly number[]).includes(nextDay))!.no}: {PHASES.find((p) => (p.days as readonly number[]).includes(nextDay))!.titleVi}
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight">{DAY_INFO[nextDay].titleVi}</h2>
              <p className="flex items-center gap-2 text-on-forest-muted">
                <Clock className="size-4" aria-hidden />
                Khoảng {DAY_INFO[nextDay].minutes} phút{nextDay === 1 ? ". Bắt đầu bằng bài đầu module ngắn để biết em đang ở đâu." : ""}
              </p>
              {doneToday && !open && <p className="text-on-forest-muted">Hôm nay em đã học một bài. Học tiếp được, nhưng nghỉ đến mai thì nhớ lâu hơn.</p>}
              <form action={startLesson}>
                <input type="hidden" name="moduleId" value={m.id} />
                <input type="hidden" name="day" value={nextDay} />
                <SubmitButton pendingLabel="Đang chuẩn bị bài…">{open ? "Học tiếp bài đang dở" : `Bắt đầu ngày ${nextDay}`}</SubmitButton>
              </form>
            </>
          )}
        </section>

        <section aria-labelledby="path" className="grid gap-4">
          <h2 id="path" className="text-2xl font-extrabold tracking-tight">
            Lộ trình 5 giai đoạn
          </h2>
          <ol className="grid gap-6">
            {PHASES.map((p) => (
              <li key={p.no} className="grid gap-2">
                <div>
                  <h3 className="text-lg font-extrabold">
                    {p.no}. {p.titleVi}
                  </h3>
                  <p className="text-muted">{p.goalVi}</p>
                </div>
                <ul className="divide-y divide-line border-y border-line">
                  {p.days.map((d) => {
                    const done = completed.includes(d);
                    const current = d === nextDay;
                    return (
                      <li key={d} className="flex items-center gap-3 py-3">
                        {done ? (
                          <CircleCheck className="size-5 shrink-0 text-brand-strong" aria-hidden />
                        ) : current ? (
                          <ArrowRight className="size-5 shrink-0 text-brand-strong" aria-hidden />
                        ) : (
                          <Lock className="size-5 shrink-0 text-muted" aria-hidden />
                        )}
                        <span className={`flex-1 ${done || current ? "font-semibold" : "text-muted"}`}>
                          Ngày {d}: {DAY_INFO[d].titleVi}
                        </span>
                        <span className="shrink-0 text-sm text-muted">{done ? "Đã xong" : current ? (open ? "Đang làm" : "Tiếp theo") : "Chưa mở"}</span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="results" className="grid gap-4">
          <h2 id="results" className="text-2xl font-extrabold tracking-tight">
            Kết quả và tiến bộ
          </h2>
          <p className="max-w-prose text-muted">Làm xong bài tập chưa có nghĩa là đã nói được. Phần dưới so sánh lúc em tự nói, không gợi ý, ở đầu và cuối module.</p>
          <ReportView r={report} />
          {thinkByDay.length >= 2 && (
            <div className="grid gap-2">
              <h3 className="text-lg font-extrabold">Thời gian bắt đầu nói theo ngày</h3>
              <ul className="grid gap-1.5">
                {thinkByDay.map((x) => (
                  <li key={x.day} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3 text-sm">
                    <span className="text-muted">Ngày {x.day}</span>
                    <span className="h-2.5 rounded-full bg-line">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${(x.ms / maxMs) * 100}%` }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{secs(x.ms)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">Trung vị lượt nói đầu tiên mỗi câu. Ngắn hơn là phản xạ nhanh hơn; ngày có câu khó có thể dài hơn.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="errors" className="grid gap-4">
          <h2 id="errors" className="text-2xl font-extrabold tracking-tight">
            Lỗi hay gặp
          </h2>
          {errors.length === 0 ? (
            <p className="max-w-prose rounded-2xl bg-sunken px-5 py-4 text-muted">
              Chưa ghi nhận lỗi nào. Lỗi chỉ được ghi khi AI nhận xét câu trả lời (lỗi phải trích đúng lời em nói) hoặc khi em chọn sai câu ngữ pháp.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line border-y border-line">
                {errors.map(([tag, n]) => {
                  const ex = exampleOf(tag);
                  return (
                    <li key={tag} className="grid gap-1 py-3">
                      <p className="flex justify-between gap-3">
                        <span className="font-semibold">{ERROR_TAGS[tag]}</span>
                        <span className="shrink-0 tabular-nums text-muted">{n} lần</span>
                      </p>
                      {ex && (
                        <p className="text-sm text-muted">
                          Gần nhất: <s lang="en">{ex.quote}</s> → <span lang="en" className="font-semibold text-ink">{ex.fix}</span>
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-muted">Lỗi lặp lại từ 2 lần trở lên sẽ có phần ôn riêng ở đầu các bài sau.</p>
            </>
          )}
        </section>

        <p className="text-muted">
          Muốn luyện thêm ngoài lộ trình?{" "}
          <Link href={`/student/practice/${m.unitId}`} className="font-bold text-brand-strong hover:underline">
            Luyện nhanh 5 câu của Unit này
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
