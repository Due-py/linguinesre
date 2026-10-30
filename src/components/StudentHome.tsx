import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, Circle, Flag, Timer } from "lucide-react";
import SessionList from "@/components/SessionList";
import Waveform from "@/components/Waveform";
import type { TodayTask } from "@/lib/practice";
import type { Focus, SessionRow } from "@/lib/sessions";
import { FOCUS_MIN_SESSIONS } from "@/lib/summary";
import { REACTION_MIN_SESSIONS, type ReactionPoint } from "@/lib/reaction";

export type RoadmapUnit = {
  id: string;
  unitNo: number;
  title: string;
  titleVi: string;
  state: "done" | "in_progress" | "next" | "todo";
};

export type StudentHomeProps = {
  name: string;
  grade: number | null;
  classes: { id: string; name: string }[];
  joinFailed?: boolean;
  today: TodayTask;
  roadmap: RoadmapUnit[];
  recent: SessionRow[];
  focus: Focus;
  /** Thời gian bắt đầu nói của các buổi đã hoàn thành (cũ trước), xem lib/reaction.ts. */
  reaction: ReactionPoint[];
};

const STATE: Record<RoadmapUnit["state"], { label: string; icon: React.ReactNode }> = {
  done: {
    label: "Đã xong",
    icon: <CircleCheck className="size-5 text-brand-strong" aria-hidden />,
  },
  in_progress: {
    label: "Đang làm",
    icon: <CircleDashed className="size-5 text-warn" aria-hidden />,
  },
  next: {
    label: "Tiếp theo",
    icon: <ArrowRight className="size-5 text-brand-strong" aria-hidden />,
  },
  todo: {
    label: "Chưa luyện",
    icon: <Circle className="size-5 text-muted" aria-hidden />,
  },
};

const sessionHref = (s: SessionRow) => (s.status === "completed" ? `/student/sessions/${s.id}` : `/student/practice/session/${s.id}`);

/**
 * Tổng quan của học sinh. Chỉ hiện dữ liệu thật: việc hôm nay, lộ trình Unit, thời gian bắt đầu nói qua các buổi,
 * điểm cần cải thiện (chỉ khi đủ số buổi), buổi gần đây. Lớp học và hồ sơ nằm ở trang Tài khoản.
 * Chưa có dữ liệu thì hiện trạng thái bắt đầu.
 */
export default function StudentHome({ name, grade, classes, joinFailed, today, roadmap, recent, focus, reaction }: StudentHomeProps) {
  return (
    <div className="grid gap-12">
      <section
        aria-labelledby="today"
        className="relative isolate overflow-hidden rounded-2xl bg-forest px-6 py-8 text-on-forest sm:px-10 sm:py-12"
      >
        <Waveform className="absolute -bottom-2 right-4 -z-10 hidden h-44 w-72 opacity-30 sm:flex" color="var(--brand-soft)" />
        <div className="grid max-w-xl gap-4">
          <p className="text-on-forest-muted">Chào {name},</p>
          <h1 id="today" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            {today.kind === "continue"
              ? `Tiếp tục buổi luyện ${today.unitTitle}`
              : today.kind === "start"
                ? `Hôm nay: ${today.unitTitle}`
                : "Chưa có bài luyện cho lớp của bạn"}
          </h1>
          <p className="max-w-md text-on-forest-muted">
            {today.kind === "continue"
              ? `Bạn đã trả lời ${today.answered}/${today.total} câu. Làm tiếp từ câu chưa trả lời.`
              : today.kind === "start"
                ? "5 câu hỏi, khoảng 10–15 phút. Bí ý thì mở gợi ý từng bước."
                : `Thầy cô chưa duyệt Unit nào cho lớp ${grade ?? ""}. Khi có, bài luyện sẽ hiện ở đây.`}
          </p>
          {today.kind !== "none" && (
            <Link
              href={today.href}
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-on-forest px-6 font-bold text-forest transition-colors hover:bg-white"
            >
              {today.kind === "continue" ? "Tiếp tục luyện tập" : "Bắt đầu luyện tập"}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      {joinFailed && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Hồ sơ của bạn đã lưu, nhưng mã lớp bạn nhập chưa đúng. Hãy nhập lại mã ở{" "}
            <Link href="/account#lop" className="underline underline-offset-4">
              trang Tài khoản
            </Link>
            .
          </span>
        </p>
      )}
      {!joinFailed && classes.length === 0 && (
        <p className="-mt-6 text-muted">
          Có mã lớp từ thầy cô?{" "}
          <Link href="/account#lop" className="font-semibold text-brand-strong underline underline-offset-4">
            Nhập ở trang Tài khoản
          </Link>
          . Chưa có cũng không sao, bạn vẫn luyện một mình được.
        </p>
      )}

      <div className="grid gap-12 md:grid-cols-[3fr_2fr]">
        <section aria-labelledby="roadmap" className="grid content-start gap-4">
          <h2 id="roadmap" className="text-2xl font-extrabold tracking-tight">
            Các Unit lớp {grade}
          </h2>
          {roadmap.length === 0 ? (
            <p className="max-w-prose text-muted">Chưa có Unit nào được duyệt cho khối của bạn.</p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {roadmap.map((u) => (
                <li key={u.id}>
                  <Link href={`/student/practice/${u.id}`} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-4">
                    <span className="grid size-10 place-items-center rounded-xl bg-sunken font-extrabold tabular-nums">{u.unitNo}</span>
                    <span className="grid">
                      <span lang="en" className="font-extrabold group-hover:underline">
                        {u.title}
                      </span>
                      <span className="text-sm text-muted">{u.titleVi}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                      {STATE[u.state].icon}
                      {STATE[u.state].label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid content-start gap-6">
          <ReactionCard points={reaction} />
          <section aria-labelledby="focus" className="grid content-start gap-3 rounded-2xl bg-sunken px-6 py-6">
            <h2 id="focus" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <Flag className="size-6" aria-hidden />
              Điểm cần cải thiện
            </h2>
            {focus.goal ? (
              <>
                <p className="text-xl font-extrabold">{focus.goal.title}</p>
                <p>{focus.goal.detail}</p>
                <p className="text-sm text-muted">
                  Từ {FOCUS_MIN_SESSIONS} buổi hoàn thành gần nhất, đo trực tiếp: {focus.goal.basis}
                </p>
              </>
            ) : (
              <>
                <p className="text-muted">
                  Sau {FOCUS_MIN_SESSIONS} buổi hoàn thành, mục này sẽ chỉ ra một điểm bạn nên tập trung. Bạn đã hoàn thành{" "}
                  {focus.completed}/{FOCUS_MIN_SESSIONS} buổi.
                </p>
                {focus.completed === 0 && (
                  <p className="text-muted">Buổi đầu tiên: nghe câu hỏi, nói khi sẵn sàng. Bí ý thì mở gợi ý, không bị trừ gì.</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="recent" className="grid gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="recent" className="text-2xl font-extrabold tracking-tight">
            Buổi gần đây
          </h2>
          {recent.length > 0 && (
            <Link href="/student/history" className="inline-flex min-h-11 items-center gap-1 font-bold text-brand-strong hover:underline">
              Xem tất cả
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="max-w-prose text-muted">Chưa có buổi luyện nào. Buổi đầu tiên của bạn sẽ hiện ở đây.</p>
        ) : (
          <SessionList sessions={recent} hrefFor={sessionHref} />
        )}
      </section>
    </div>
  );
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
const dayFmt = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

/**
 * Thời gian bắt đầu nói qua các buổi (trung vị mỗi buổi, ước lượng của trình duyệt). Không so sánh với bạn khác,
 * không chấm tốt/xấu: chỉ cho thấy số của chính mình thay đổi thế nào. Dưới REACTION_MIN_SESSIONS buổi thì chưa vẽ.
 */
function ReactionCard({ points }: { points: ReactionPoint[] }) {
  const shown = points.slice(-6);
  const max = Math.max(...shown.map((p) => p.medianMs), 1);
  return (
    <section aria-labelledby="reaction" className="grid content-start gap-3 rounded-2xl border border-line bg-surface px-6 py-6">
      <h2 id="reaction" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight">
        <Timer className="size-6" aria-hidden />
        Thời gian bắt đầu nói
      </h2>
      {points.length < REACTION_MIN_SESSIONS ? (
        <p className="text-muted">
          Sau {REACTION_MIN_SESSIONS} buổi hoàn thành, mục này cho thấy bạn mất bao lâu để bắt đầu trả lời, qua từng buổi. Hiện có{" "}
          {points.length}/{REACTION_MIN_SESSIONS} buổi có số đo.
        </p>
      ) : (
        <>
          <p>
            Buổi đầu: <strong>{secs(points[0].medianMs)}</strong>. Buổi gần nhất:{" "}
            <strong>{secs(points[points.length - 1].medianMs)}</strong>.
          </p>
          <ol className="grid gap-2" aria-label="Thời gian bắt đầu nói ở giữa của từng buổi, buổi cũ trước">
            {shown.map((p) => (
              <li key={p.sessionId} className="grid grid-cols-[3.25rem_1fr_4.5rem] items-center gap-2 text-sm">
                <span className="tabular-nums text-muted">{dayFmt.format(new Date(p.completedAt))}</span>
                <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-sunken">
                  <span
                    className="block h-full rounded-full bg-brand"
                    style={{
                      width: `${Math.max(4, (p.medianMs / max) * 100)}%`,
                    }}
                  />
                </span>
                <span className="text-right font-semibold tabular-nums">{secs(p.medianMs)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="text-sm text-muted">
        Ước lượng, đo trên trình duyệt: từ lúc câu hỏi đọc xong tới lúc micro nghe thấy bạn nói (lấy lần trả lời cuối của mỗi câu, số ở giữa
        của mỗi buổi). Tiếng ồn hay tiếng “ừm” có thể làm lệch.
      </p>
    </section>
  );
}
