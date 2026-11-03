import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenText, CircleAlert, CircleCheck, Clock, ShieldCheck, TriangleAlert } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { SubmitButton } from "@/components/form";
import { ReportView, secs } from "@/components/module/Panels";
import ModulePath, { phaseOf } from "@/components/module/ModulePath";
import { Chip, Eyebrow, Progress } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { getModule, moduleAttempts, moduleLessons, toHistory, toReport } from "@/lib/module/server";
import { DAY_INFO, errorCounts, median, nextOpenDay } from "@/lib/module/plan";
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
  // Độ rõ máy nghe theo ngày (trung vị các lượt nói, kể cả nói theo): ước lượng, không phải điểm phát âm.
  const clarityByDay = Array.from(new Set(attempts.map((a) => a.day)))
    .sort((a, b) => a - b)
    .map((d) => ({ day: d, c: median(attempts.filter((a) => a.day === d && typeof a.measures?.clarity === "number").map((a) => Math.round(a.measures!.clarity! * 100))) }))
    .filter((x): x is { day: number; c: number } => x.c !== null);

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/practice">
      <div className="grid gap-12">
        {/* Đầu trang: tên Unit cỡ lớn, nguồn nội dung, và thẻ "ngày tiếp theo" với một nút chính. */}
        <section className="grid gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-end">
          <div className="grid gap-4">
            <Link href="/student/practice" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
              ← Tất cả Unit
            </Link>
            <Eyebrow>Unit {m.unitNo} · Learning Module 14 ngày</Eyebrow>
            <h1 lang="en" className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {m.title}
            </h1>
            <p className="text-xl text-muted">{m.content.titleVi} · mỗi ngày 15–25 phút</p>
            <div className="flex flex-wrap items-center gap-2">
              {m.status === "teacher_approved" ? (
                <Chip tone="green" icon={<ShieldCheck className="size-4" aria-hidden />}>
                  Nội dung đã được thầy cô duyệt ({m.reviewedBy}).
                </Chip>
              ) : (
                <Chip tone="yellow" icon={<TriangleAlert className="size-4" aria-hidden />}>
                  Nội dung do nhóm soạn từ SGK và đã qua kiểm tra tự động, chưa được thầy cô duyệt.
                </Chip>
              )}
              <Link
                href={`/student/module/${m.id}/kien-thuc`}
                className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-soft px-4 font-medium text-brand-strong hover:bg-brand-tonal"
              >
                <BookOpenText className="size-5" aria-hidden />
                Kho kiến thức
              </Link>
            </div>
          </div>

          <article className="grid content-start gap-4 rounded-[2rem] bg-brand-soft p-6 sm:p-8">
            {nextDay === null ? (
              <>
                <Eyebrow className="text-brand-strong">Hoàn thành</Eyebrow>
                <h2 className="text-3xl font-semibold tracking-tight">Em đã học xong cả 14 ngày</h2>
                <p className="text-muted">Xem kết quả so sánh đầu và cuối module ở bên dưới.</p>
              </>
            ) : (
              <>
                <Eyebrow className="text-brand-strong">
                  Ngày {nextDay}/14 · Giai đoạn {phaseOf(nextDay).no}: {phaseOf(nextDay).titleVi}
                </Eyebrow>
                <h2 className="text-2xl font-semibold tracking-tight">{DAY_INFO[nextDay].titleVi}</h2>
                <p>Mục tiêu: {DAY_INFO[nextDay].goalVi}</p>
                <p className="flex items-center gap-2 text-muted">
                  <Clock className="size-4" aria-hidden />
                  Khoảng {DAY_INFO[nextDay].minutes} phút{nextDay === 1 ? ". Bắt đầu bằng bài đầu module ngắn để biết em đang ở đâu." : ""}
                </p>
                <Progress value={completed.length} max={14} label={`Đã học ${completed.length} trên 14 ngày`} className="bg-surface" />
                {doneToday && !open && <p className="text-sm text-muted">Hôm nay em đã học một bài. Học tiếp được, nhưng nghỉ đến mai thì nhớ lâu hơn.</p>}
                <form action={startLesson}>
                  <input type="hidden" name="moduleId" value={m.id} />
                  <input type="hidden" name="day" value={nextDay} />
                  <SubmitButton pendingLabel="Đang chuẩn bị bài…" className="w-full sm:w-auto">
                    {open ? "Học tiếp bài đang dở" : `Bắt đầu ngày ${nextDay}`}
                  </SubmitButton>
                </form>
              </>
            )}
          </article>
        </section>

        {xong && (
          <p role="status" className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 font-medium text-success-strong">
            <CircleCheck className="size-5" aria-hidden />
            Đã lưu bài ngày {xong}.
          </p>
        )}
        {error === "open" && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            Chưa mở được bài này. Các bài mở lần lượt; làm xong bài đang dở trước nhé.
          </p>
        )}

        <section aria-labelledby="path" className="grid gap-6">
          <h2 id="path" className="text-3xl font-semibold tracking-tight">
            Lộ trình 5 giai đoạn
          </h2>
          <ModulePath moduleId={m.id} completed={completed} nextDay={nextDay} open={!!open} />
        </section>

        <section aria-labelledby="results" className="grid gap-4">
          <h2 id="results" className="text-3xl font-semibold tracking-tight">
            Kết quả và tiến bộ
          </h2>
          <p className="max-w-prose text-muted">Làm xong bài tập chưa có nghĩa là đã nói được. Phần dưới so sánh lúc em tự nói, không gợi ý, ở đầu và cuối module.</p>
          <ReportView r={report} />
          {thinkByDay.length >= 2 && (
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold">Thời gian bắt đầu nói theo ngày</h3>
              <ul className="grid gap-1.5">
                {thinkByDay.map((x, i) => (
                  <li key={x.day} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3 text-sm">
                    <span className="text-muted">Ngày {x.day}</span>
                    <span className="h-2.5 rounded-full bg-line">
                      <span className="grow-x block h-full rounded-full bg-brand" style={{ width: `${(x.ms / maxMs) * 100}%`, ["--i" as string]: i }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{secs(x.ms)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">Trung vị lượt nói đầu tiên mỗi câu. Ngắn hơn là phản xạ nhanh hơn; ngày có câu khó có thể dài hơn.</p>
            </div>
          )}
          {clarityByDay.length >= 2 && (
            <div className="grid gap-2">
              <h3 className="text-lg font-semibold">Máy nghe rõ theo ngày</h3>
              <ul className="grid gap-1.5">
                {clarityByDay.map((x, i) => (
                  <li key={x.day} className="grid grid-cols-[4.5rem_1fr_5.5rem] items-center gap-3 text-sm">
                    <span className="text-muted">Ngày {x.day}</span>
                    <span className="h-2.5 rounded-full bg-line">
                      <span className="grow-x block h-full rounded-full bg-sky" style={{ width: `${x.c}%`, ["--i" as string]: i }} />
                    </span>
                    <span className="text-right font-semibold tabular-nums">{x.c}% số từ</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                Tỷ lệ từ máy nghe chắc chắn (trung vị các lượt nói). Đây không phải điểm phát âm: micro, tiếng ồn và nói nhỏ cũng làm số này thấp.
              </p>
            </div>
          )}
        </section>

        <section aria-labelledby="errors" className="grid gap-4">
          <h2 id="errors" className="text-3xl font-semibold tracking-tight">
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

