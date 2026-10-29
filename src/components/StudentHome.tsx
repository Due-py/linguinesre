import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, CircleDashed, Circle, Flag } from "lucide-react";
import JoinClassForm from "@/components/JoinClassForm";
import SessionList from "@/components/SessionList";
import Waveform from "@/components/Waveform";
import { GOALS } from "@/lib/validation";
import type { TodayTask } from "@/lib/practice";
import type { Focus, SessionRow } from "@/lib/sessions";
import { FOCUS_MIN_SESSIONS } from "@/lib/summary";

export type RoadmapUnit = { id: string; unitNo: number; title: string; titleVi: string; state: "done" | "in_progress" | "next" | "todo" };

export type StudentHomeProps = {
  name: string;
  grade: number | null;
  goal: string | null;
  classes: { id: string; name: string }[];
  joinFailed?: boolean;
  today: TodayTask;
  roadmap: RoadmapUnit[];
  recent: SessionRow[];
  focus: Focus;
};

const STATE: Record<RoadmapUnit["state"], { label: string; icon: React.ReactNode }> = {
  done: { label: "Đã xong", icon: <CircleCheck className="size-5 text-brand-strong" aria-hidden /> },
  in_progress: { label: "Đang làm", icon: <CircleDashed className="size-5 text-warn" aria-hidden /> },
  next: { label: "Tiếp theo", icon: <ArrowRight className="size-5 text-brand-strong" aria-hidden /> },
  todo: { label: "Chưa luyện", icon: <Circle className="size-5 text-muted" aria-hidden /> },
};

const sessionHref = (s: SessionRow) => (s.status === "completed" ? `/student/sessions/${s.id}` : `/student/practice/session/${s.id}`);

/**
 * Tổng quan của học sinh. Chỉ hiện dữ liệu thật: việc hôm nay, lộ trình Unit, buổi gần đây, điểm cần cải thiện
 * (chỉ khi đủ số buổi), lớp đã vào, khối lớp, mục tiêu. Chưa có dữ liệu thì hiện trạng thái bắt đầu.
 */
export default function StudentHome({ name, grade, goal, classes, joinFailed, today, roadmap, recent, focus }: StudentHomeProps) {
  const goalLabel = goal && goal in GOALS ? GOALS[goal as keyof typeof GOALS] : null;
  return (
    <div className="grid gap-12">
      <section
        aria-labelledby="today"
        className="relative isolate overflow-hidden rounded-[2rem] bg-forest px-6 py-8 text-on-forest sm:px-10 sm:py-12"
      >
        <Waveform
          className="absolute -bottom-2 right-4 -z-10 hidden h-44 w-72 opacity-30 sm:flex"
          color="var(--brand-soft)"
        />
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
          Hồ sơ của bạn đã lưu, nhưng mã lớp bạn nhập chưa đúng. Hãy nhập lại mã ở phần “Lớp của bạn” bên dưới.
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

        <section aria-labelledby="focus" className="grid content-start gap-3 rounded-3xl bg-sunken px-6 py-6">
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
                Sau {FOCUS_MIN_SESSIONS} buổi hoàn thành, mục này sẽ chỉ ra một điểm bạn nên tập trung. Bạn đã hoàn thành {focus.completed}/
                {FOCUS_MIN_SESSIONS} buổi.
              </p>
              {focus.completed === 0 && (
                <p className="text-muted">Buổi đầu tiên: nghe câu hỏi, nói khi sẵn sàng. Bí ý thì mở gợi ý, không bị trừ gì.</p>
              )}
            </>
          )}
        </section>
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

      <div className="grid gap-12 md:grid-cols-[3fr_2fr]">
        <section aria-labelledby="class" className="grid content-start gap-4">
          <h2 id="class" className="text-2xl font-extrabold tracking-tight">
            Lớp của bạn
          </h2>
          {classes.length > 0 ? (
            <ul className="divide-y divide-line border-y border-line">
              {classes.map((c) => (
                <li key={c.id} className="py-4 text-lg font-bold">
                  {c.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-5">
              <p className="max-w-prose text-muted">
                Bạn chưa vào lớp nào. Có mã lớp từ thầy cô thì nhập ở đây. Chưa có cũng không sao, bạn vẫn luyện được một mình.
              </p>
              <JoinClassForm />
            </div>
          )}
        </section>

        <section aria-labelledby="profile" className="grid content-start gap-4">
          <h2 id="profile" className="text-2xl font-extrabold tracking-tight">
            Hồ sơ
          </h2>
          <dl className="divide-y divide-line border-y border-line">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Khối lớp</dt>
              <dd className="font-bold">{grade ? `Lớp ${grade}` : "Chưa chọn"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-muted">Muốn cải thiện</dt>
              <dd className="text-right font-bold">{goalLabel ?? "Chưa chọn"}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
