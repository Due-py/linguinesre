"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, CircleDashed, Flag, Lightbulb, MessageSquareText } from "lucide-react";
import { requestFeedback } from "@/app/(student)/student/practice/actions";
import FeedbackPanel from "@/components/FeedbackPanel";
import type { SessionReport as Report } from "@/lib/sessions";
import { latestAttempt, sessionStats, type ReportQuestion } from "@/lib/summary";

const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;

/**
 * Tổng kết / xem lại một buổi luyện. mode "student": học sinh xem buổi của mình, lấy được nhận xét còn thiếu.
 * mode "teacher": giáo viên chỉ xem. Mọi số ở đây đến từ dữ liệu đã lưu; không có điểm tổng, không xếp hạng.
 */
export default function SessionReport({
  report,
  mode,
  back,
  studentName,
}: {
  report: Report;
  mode: "student" | "teacher";
  back: { href: string; label: string };
  studentName?: string;
}) {
  const stats = sessionStats(report.questions);
  const done = report.status === "completed";

  return (
    <div className="grid gap-10">
      <div className="grid gap-4">
        <Link href={back.href} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          {back.label}
        </Link>
        <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl">
          {studentName ? `${studentName}: ` : "Tổng kết: "}
          <span lang="en">{report.unitTitle}</span>
        </h1>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
          {done ? (
            <span className="inline-flex items-center gap-1.5 font-bold text-brand-strong">
              <CircleCheck className="size-4" aria-hidden />
              Đã hoàn thành
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-bold text-warn">
              <CircleDashed className="size-4" aria-hidden />
              Chưa xong ({report.answered}/{report.total} câu)
            </span>
          )}
          <span>Bắt đầu {dateFmt.format(new Date(report.startedAt))}</span>
        </p>
        {!done && mode === "student" && (
          <Link
            href={`/student/practice/session/${report.id}`}
            className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-brand px-6 font-bold text-on-brand shadow-button hover:bg-brand-strong"
          >
            Làm tiếp buổi này
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        )}
      </div>

      {stats.answered > 0 && (
        <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
          <section aria-labelledby="overview" className="grid content-start gap-3">
            <h2 id="overview" className="text-2xl font-extrabold tracking-tight">
              Cả buổi
            </h2>
            <dl className="divide-y divide-line border-y border-line">
              <Row label="Số câu đã trả lời" value={`${stats.answered}/${stats.total}`} />
              <Row label="Số câu có mở gợi ý" value={String(stats.withHints)} />
              <Row label="Số lần nói lại" value={String(stats.retries)} />
              <Row label="Thời gian suy nghĩ trung bình" value={stats.avgThinkMs === null ? "chưa đo được" : secs(stats.avgThinkMs)} />
            </dl>
            <p className="text-sm text-muted">Tính từ lần trả lời cuối của mỗi câu. Thời gian do trình duyệt ước lượng. Mở gợi ý không bị trừ gì.</p>
          </section>

          {stats.goal && (
            <section aria-labelledby="goal" className="grid content-start gap-3 rounded-2xl bg-forest px-6 py-6 text-on-forest">
              <h2 id="goal" className="flex items-center gap-2 text-sm font-bold text-on-forest-muted">
                <Flag className="size-4" aria-hidden />
                {mode === "student" ? "Mục tiêu cho buổi sau" : "Mục tiêu gợi ý cho học sinh"}
              </h2>
              <p className="text-2xl font-extrabold leading-tight">{stats.goal.title}</p>
              <p>{stats.goal.detail}</p>
              <p className="text-sm text-on-forest-muted">Căn cứ (đo trực tiếp): {stats.goal.basis}</p>
            </section>
          )}
        </div>
      )}

      {stats.issues.length > 0 && (
        <section aria-labelledby="issues" className="grid gap-3">
          <h2 id="issues" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <MessageSquareText className="size-6" aria-hidden />
            Lỗi cần chú ý
          </h2>
          <p className="text-sm text-muted">Do AI chỉ ra từ chữ ghi lời, có thể chưa đúng. Chỉ giữ lỗi có trích đúng lời đã nói.</p>
          {stats.mock && (
            <p className="w-fit rounded-full bg-warn-soft px-3 py-1 text-sm font-bold text-warn">Có nhận xét là dữ liệu mô phỏng, không phải nhận xét thật</p>
          )}
          <ul className="divide-y divide-line border-y border-line">
            {stats.issues.map((i, k) => (
              <li key={k} className="grid gap-1 py-3">
                <p lang="en" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold">
                  <span className="line-through decoration-2">{i.quote}</span>
                  <ArrowRight className="size-4 shrink-0" aria-label="sửa thành" />
                  <span className="font-extrabold text-brand-strong">{i.fix}</span>
                </p>
                {i.explanation && <p className="text-muted">{i.explanation}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="answers" className="grid gap-4">
        <h2 id="answers" className="text-2xl font-extrabold tracking-tight">
          Từng câu
        </h2>
        {stats.answered === 0 ? (
          <p className="max-w-prose rounded-2xl bg-sunken px-5 py-4 text-muted">Buổi này chưa có câu trả lời nào.</p>
        ) : (
          <ol className="grid gap-3">
            {report.questions.map((q, i) => (
              <QuestionItem key={q.id} q={q} index={i} canRequest={mode === "student"} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function QuestionItem({ q, index, canRequest }: { q: ReportQuestion; index: number; canRequest: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = latestAttempt(q);
  const earlier = q.attempts.filter((a) => a !== last);

  async function fetchFeedback() {
    if (!last) return;
    setLoading(true);
    setError(null);
    try {
      const r = await requestFeedback(last.answerId);
      if (r.ok) router.refresh();
      else setError(r.error);
    } catch {
      setError("Mất kết nối khi lấy nhận xét. Kiểm tra mạng rồi thử lại.");
    }
    setLoading(false);
  }

  return (
    <li>
      <details className="group rounded-2xl border border-line bg-surface open:pb-5">
        <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 px-5 py-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-sunken text-sm font-extrabold tabular-nums">{index + 1}</span>
          <span className="grid flex-1 gap-0.5">
            <span lang="en" className="font-extrabold">
              {q.text}
            </span>
            <span className="text-sm text-muted">
              {!last
                ? "Chưa trả lời"
                : `${q.attempts.length > 1 ? `${q.attempts.length} lần trả lời, ` : ""}${last.view.status === "ok" ? "có nhận xét" : "chưa có nhận xét"}${last.hintLevel > 0 ? `, mở gợi ý mức ${last.hintLevel}` : ""}`}
            </span>
          </span>
          <ArrowRight className="mt-1 size-5 shrink-0 text-muted transition-transform group-open:rotate-90" aria-hidden />
        </summary>

        {last && (
          <div className="grid gap-5 px-5">
            <div className="grid gap-2">
              <p className="text-sm font-bold text-muted">{q.attempts.length > 1 ? `Lần ${last.attemptNo} (lần cuối)` : "Câu trả lời"}</p>
              <p lang="en" className="text-lg font-semibold">
                {last.transcript}
              </p>
              {last.audioUrl ? (
                <audio controls preload="none" src={last.audioUrl} className="w-full max-w-md">
                  Trình duyệt này chưa phát được bản ghi.
                </audio>
              ) : (
                <p className="text-sm text-muted">Không có bản ghi âm để nghe lại.</p>
              )}
            </div>
            {earlier.length > 0 && (
              <ul className="grid gap-1 border-l-2 border-line pl-4">
                {earlier.map((a) => (
                  <li key={a.answerId} className="text-muted">
                    <span className="text-sm font-bold">Lần {a.attemptNo}: </span>
                    <span lang="en">{a.transcript}</span>
                  </li>
                ))}
              </ul>
            )}
            {last.hintLevel > 0 && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Lightbulb className="size-4" aria-hidden />
                Đã mở gợi ý đến mức {last.hintLevel}. Dùng gợi ý không bị trừ gì.
              </p>
            )}
            <FeedbackPanel
              view={loading || error ? null : last.view}
              loading={loading}
              error={error}
              onRetry={canRequest ? () => void fetchFeedback() : undefined}
              level={3}
              askFirst={last.view.status !== "ok"}
            />
          </div>
        )}
      </details>
    </li>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-extrabold tabular-nums">{value}</dd>
    </div>
  );
}
