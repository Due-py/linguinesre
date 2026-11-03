import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, Circle, Flag, Timer } from "lucide-react";
import SessionList from "@/components/SessionList";
import Mascot from "@/components/Mascot";
import type { TodayTask } from "@/lib/practice";
import type { ModuleToday } from "@/lib/module/server";
import { DAY_INFO } from "@/lib/module/plan";
import type { Focus, SessionRow } from "@/lib/sessions";
import { FOCUS_MIN_SESSIONS } from "@/lib/summary";
import { REACTION_MIN_SESSIONS, type ReactionPoint } from "@/lib/reaction";

export type RoadmapUnit = {
  id: string;
  unitNo: number;
  title: string;
  titleVi: string;
  state: "done" | "in_progress" | "next" | "todo";
  /** Unit có Learning Module 14 ngày thì đi vào module thay vì buổi luyện 5 câu. */
  moduleId?: string | null;
};

export type StudentHomeProps = {
  name: string;
  grade: number | null;
  classes: { id: string; name: string }[];
  joinFailed?: boolean;
  today: TodayTask;
  module?: ModuleToday | null;
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

// Ô số Unit: đã xong xanh lá, đang làm vàng, tiếp theo xanh dương, chưa luyện xám (luôn kèm chữ trạng thái bên cạnh).
const UNIT_TONE: Record<RoadmapUnit["state"], string> = {
  done: "bg-brand text-on-brand",
  in_progress: "bg-gold text-ink",
  next: "bg-sky-strong text-white",
  todo: "bg-sunken text-ink",
};

const sessionHref = (s: SessionRow) => (s.status === "completed" ? `/student/sessions/${s.id}` : `/student/practice/session/${s.id}`);

/**
 * Tổng quan của học sinh. Chỉ hiện dữ liệu thật: việc hôm nay, lộ trình Unit, thời gian bắt đầu nói qua các buổi,
 * điểm cần cải thiện (chỉ khi đủ số buổi), buổi gần đây. Lớp học và hồ sơ nằm ở trang Tài khoản.
 * Chưa có dữ liệu thì hiện trạng thái bắt đầu.
 */
export default function StudentHome({ name, grade, classes, joinFailed, today, module, roadmap, recent, focus, reaction }: StudentHomeProps) {
  return (
    <div className="grid gap-12">
      <section
        aria-labelledby="today"
        className="relative isolate overflow-hidden rounded-2xl bg-forest px-6 py-8 text-on-forest shadow-[0_5px_0_var(--brand-strong)] sm:px-10 sm:py-12"
      >
        <Mascot mood="talk" className="absolute bottom-4 right-6 -z-10 hidden size-40 sm:block" />
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
              className="btn-3d inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-surface px-6 text-lg font-extrabold text-brand-strong [--depth:rgb(0_0_0/0.22)] sm:w-fit"
            >
              {today.kind === "continue" ? "Tiếp tục luyện tập" : "Bắt đầu luyện tập"}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
        </div>
      </section>

      {module && (
        <section aria-labelledby="module-today" className="grid gap-3 rounded-2xl bg-surface px-6 py-6 shadow-card sm:px-8">
          <p className="text-sm font-bold text-brand-strong">Lộ trình 14 ngày · Unit {module.unitNo}</p>
          <h2 id="module-today" className="text-2xl font-extrabold tracking-tight">
            {module.nextDay === null ? (
              <>
                Đã học xong <span lang="en">{module.title}</span>
              </>
            ) : (
              <>
                <span lang="en">{module.title}</span>, ngày {module.nextDay}: {DAY_INFO[module.nextDay].titleVi}
              </>
            )}
          </h2>
          <p className="text-muted">
            {module.nextDay === null
              ? "Xem kết quả so sánh đầu và cuối module."
              : module.started
                ? `Khoảng ${DAY_INFO[module.nextDay].minutes} phút. Mỗi ngày một bài là vừa đủ.`
                : "Mỗi Unit học trong 14 ngày, mỗi ngày 15–25 phút: kiến thức, nói có hướng dẫn, phản xạ, roleplay, rồi tự nói không gợi ý."}
          </p>
          <Link href={`/student/module/${module.id}`} className="btn-3d inline-flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-on-brand">
            {module.inProgress ? "Học tiếp" : module.nextDay === null ? "Xem kết quả" : module.started ? "Vào bài hôm nay" : "Bắt đầu lộ trình"}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </section>
      )}
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
            <ul className="grid gap-3">
              {roadmap.map((u, i) => (
                <li key={u.id} className="pop-in" style={{ ["--i" as string]: i }}>
                  <Link
                    href={u.moduleId ? `/student/module/${u.moduleId}` : `/student/practice/${u.id}`}
                    className="option-card group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3"
                  >
                    <span className={`grid size-11 place-items-center rounded-xl font-extrabold tabular-nums ${UNIT_TONE[u.state]}`}>{u.unitNo}</span>
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
    <section aria-labelledby="reaction" className="grid content-start gap-3 rounded-2xl bg-surface px-6 py-6 shadow-card">
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
            {shown.map((p, i) => (
              <li key={p.sessionId} className="grid grid-cols-[3.25rem_1fr_4.5rem] items-center gap-2 text-sm">
                <span className="tabular-nums text-muted">{dayFmt.format(new Date(p.completedAt))}</span>
                <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-sunken">
                  <span
                    className="grow-x block h-full rounded-full bg-sky"
                    style={{
                      width: `${Math.max(4, (p.medianMs / max) * 100)}%`,
                      ["--i" as string]: i,
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
