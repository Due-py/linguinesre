import Link from "next/link";
import { ArrowRight, CalendarDays, CircleAlert, CircleCheck, CircleDashed, Clock, Flag, Lock, Mic, Timer, Users } from "lucide-react";
import SessionList from "@/components/SessionList";
import Linguine from "@/components/Linguine";
import { Chip, Eyebrow, Highlight, Progress, SectionHead, Stat } from "@/components/ui";
import type { TodayTask } from "@/lib/practice";
import type { ModuleToday } from "@/lib/module/server";
import { DAY_INFO, DAYS, phaseOf } from "@/lib/module/plan";
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
  /** Số ngày đã học xong của module (dữ liệu thật). */
  daysDone?: number;
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
  /** Lỗi hay gặp nhất trong module đang học (Error Memory, từ nhận xét AI đã kiểm chứng và câu ngữ pháp sai). */
  moduleErrors?: { label: string; count: number }[];
  /** Linguine và tiến trình phiêu lưu (khối nhỏ, đặt sau thẻ bài hôm nay). */
  companion?: React.ReactNode;
};

const STATE: Record<RoadmapUnit["state"], { label: string; tone: "green" | "yellow" | "blue" | "grey"; icon: React.ReactNode }> = {
  done: { label: "Đã xong", tone: "green", icon: <CircleCheck className="size-4" aria-hidden /> },
  in_progress: { label: "Đang học", tone: "yellow", icon: <CircleDashed className="size-4" aria-hidden /> },
  next: { label: "Tiếp theo", tone: "blue", icon: <ArrowRight className="size-4" aria-hidden /> },
  todo: { label: "Chưa học", tone: "grey", icon: <Lock className="size-4" aria-hidden /> },
};

const sessionHref = (s: SessionRow) => (s.status === "completed" ? `/student/sessions/${s.id}` : `/student/practice/session/${s.id}`);
const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
const dayFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/**
 * Tổng quan của học sinh, trả lời ba câu hỏi: em đang ở đâu (module, tiến độ), hôm nay học gì (một nút rõ nhất),
 * em tiến bộ thế nào (số đo thật). Chỉ hiện dữ liệu thật; chưa có thì hiện trạng thái bắt đầu.
 */
export default function StudentHome({ name, grade, classes, joinFailed, today, module, roadmap, recent, focus, reaction, moduleErrors = [], companion }: StudentHomeProps) {
  const next = module?.nextDay ?? null;
  const upcoming = next ? Array.from({ length: Math.min(3, DAYS - next) }, (_, k) => next + k + 1) : [];
  const last = reaction.at(-1);
  const completedSessions = recent.filter((s) => s.status === "completed").length;

  return (
    <div className="grid gap-12">
      {/* 1. Hôm nay học gì: lời chào + thẻ bài hôm nay với một nút chính. */}
      <section aria-labelledby="today" className="grid gap-8 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-center">
        <div className="rise-in grid gap-4">
          <p className="flex items-center gap-3 text-lg text-muted">
            <Linguine pose="head" size={52} priority />
            Chào {name},
          </p>
          <h1 id="today" className="text-balance text-4xl font-semibold leading-[1.15] tracking-tight sm:text-5xl">
            {module && next ? (
              <>
                Hôm nay học <Highlight>ngày {next}</Highlight> của <span lang="en">{module.title}</span>
              </>
            ) : module && next === null ? (
              <>
                Em đã học xong <Highlight tone="green">14 ngày</Highlight> của <span lang="en">{module.title}</span>
              </>
            ) : today.kind !== "none" ? (
              <>
                Hôm nay luyện <Highlight>nói</Highlight> với <span lang="en">{today.unitTitle}</span>
              </>
            ) : (
              <>Chưa có bài cho lớp của em</>
            )}
          </h1>
          <p className="max-w-xl text-lg text-muted">
            {module && next
              ? DAY_INFO[next].goalVi
              : module
                ? "Xem kết quả so sánh đầu và cuối module, rồi chọn Unit tiếp theo bên dưới."
                : today.kind !== "none"
                  ? "5 câu hỏi, khoảng 10–15 phút. Bí ý thì mở gợi ý từng bước, không bị trừ gì."
                  : `Thầy cô chưa duyệt Unit nào cho lớp ${grade ?? ""}. Khi có, bài học sẽ hiện ở đây.`}
          </p>
        </div>

        {module ? (
          <article aria-labelledby="module-today" className="rise-in rise-in-2 grid gap-4 rounded-[2rem] bg-brand-soft p-6 sm:p-8">
            <Eyebrow className="text-brand-strong">Lộ trình 14 ngày · Unit {module.unitNo}</Eyebrow>
            <h2 id="module-today" className="text-2xl font-semibold tracking-tight">
              {next ? DAY_INFO[next].titleVi : <span lang="en">{module.title}</span>}
            </h2>
            {next && (
              <div className="flex flex-wrap gap-2">
                <Chip tone="blue">
                  Giai đoạn {phaseOf(next).no}: {phaseOf(next).titleVi}
                </Chip>
                <Chip tone="grey" icon={<Clock className="size-4" aria-hidden />}>
                  Khoảng {DAY_INFO[next].minutes} phút
                </Chip>
              </div>
            )}
            <div className="grid gap-1.5">
              <p className="flex justify-between text-sm font-medium">
                <span>Tiến độ module</span>
                <span className="tabular-nums">
                  {module.daysDone}/{DAYS} ngày
                </span>
              </p>
              <Progress value={module.daysDone} max={DAYS} label={`Đã học ${module.daysDone} trên ${DAYS} ngày`} className="bg-surface" />
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {/* Lối vào chính là bản đồ phiêu lưu; danh sách 14 ngày và kết quả Unit vẫn ở trang module. */}
              <Link
                href={`/student/phieu-luu?m=${module.id}`}
                className="press inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 font-medium text-on-brand hover:shadow-card sm:w-fit"
              >
                {module.inProgress ? "Học tiếp trên bản đồ" : next === null ? "Xem bản đồ đã chinh phục" : module.started ? "Mở bản đồ phiêu lưu" : "Bắt đầu cuộc phiêu lưu"}
                <ArrowRight className="size-5" aria-hidden />
              </Link>
              <Link href={`/student/module/${module.id}`} className="inline-flex min-h-11 items-center font-medium text-brand-strong hover:underline">
                {next === null ? "Xem kết quả Unit" : "Xem lộ trình dạng danh sách"}
              </Link>
            </div>
          </article>
        ) : (
          today.kind !== "none" && (
            <article className="rise-in rise-in-2 grid gap-4 rounded-[2rem] bg-brand-soft p-6 sm:p-8">
              <Eyebrow className="text-brand-strong">Luyện nhanh</Eyebrow>
              <h2 className="text-2xl font-semibold tracking-tight" lang="en">
                {today.unitTitle}
              </h2>
              {today.kind === "continue" && (
                <Progress value={today.answered} max={today.total} label={`Đã trả lời ${today.answered} trên ${today.total} câu`} className="bg-surface" />
              )}
              <Link href={today.href} className="press inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-brand px-6 font-medium text-on-brand hover:shadow-card">
                {today.kind === "continue" ? "Tiếp tục luyện tập" : "Bắt đầu luyện tập"}
                <ArrowRight className="size-5" aria-hidden />
              </Link>
            </article>
          )
        )}
      </section>

      {joinFailed && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Hồ sơ của em đã lưu, nhưng mã lớp chưa đúng. Hãy nhập lại mã ở{" "}
            <Link href="/account#lop" className="underline underline-offset-4">
              trang Tài khoản
            </Link>
            .
          </span>
        </p>
      )}

      {companion}

      {/* 2. Em tiến bộ thế nào: số đo thật, mỗi ô ghi cách đo. */}
      <section aria-labelledby="stats" className="grid gap-4">
        <h2 id="stats" className="sr-only">
          Số liệu của em
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ngày đã học trong module" value={module ? `${module.daysDone}/${DAYS}` : null} note={module ? <span lang="en">{module.title}</span> : "Chưa bắt đầu module nào"} />
          <Stat
            label="Thời gian bắt đầu nói (buổi gần nhất)"
            value={last ? secs(last.medianMs) : null}
            note={last ? "Ước lượng trên trình duyệt, số ở giữa của buổi" : `Có sau ${REACTION_MIN_SESSIONS} buổi luyện tự do`}
          />
          <Stat
            label="Buổi luyện tự do hoàn thành"
            value={recent.length ? `${completedSessions}/${recent.length}` : null}
            note={recent.length ? "Trong các buổi gần đây nhất" : "Chưa có buổi nào"}
          />
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-[3fr_2fr]">
        <div className="grid content-start gap-12">
          {/* Sắp tới: các ngày tiếp theo của module. */}
          {module && upcoming.length > 0 && (
            <section aria-labelledby="upcoming" className="grid gap-4">
              <SectionHead
                id="upcoming"
                title="Sắp tới"
                action={
                  <Link href={`/student/module/${module.id}`} className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline">
                    Xem cả lộ trình
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                }
              />
              <ol className="grid gap-2">
                {upcoming.map((d, i) => (
                  <li key={d} className="pop-in flex items-center gap-4 rounded-2xl border border-line px-4 py-3" style={{ ["--i" as string]: i }}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sunken font-medium tabular-nums">{d}</span>
                    <span className="grid min-w-0 flex-1">
                      <span className="font-medium">{DAY_INFO[d].titleVi}</span>
                      <span className="text-sm text-muted">
                        Giai đoạn {phaseOf(d).no} · khoảng {DAY_INFO[d].minutes} phút
                      </span>
                    </span>
                    <CalendarDays className="size-5 shrink-0 text-muted" aria-hidden />
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section aria-labelledby="recent" className="grid gap-4">
            <SectionHead
              id="recent"
              title="Hoạt động gần đây"
              action={
                recent.length > 0 && (
                  <Link href="/student/history" className="inline-flex min-h-11 items-center gap-1 font-medium text-brand hover:underline">
                    Xem tất cả
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                )
              }
            />
            {recent.length === 0 ? (
              <p className="max-w-prose rounded-3xl bg-tint px-5 py-4 text-muted">Chưa có buổi luyện tự do nào. Buổi đầu tiên của em sẽ hiện ở đây.</p>
            ) : (
              <SessionList sessions={recent} hrefFor={sessionHref} />
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          {/* Nên luyện tiếp: từ số đo thật (luyện tự do) và lỗi hay gặp trong module. */}
          <section aria-labelledby="focus" className="grid content-start gap-3 rounded-3xl border border-line p-6">
            <h2 id="focus" className="flex items-center gap-2 text-xl font-semibold">
              <Flag className="size-5 text-gold-shadow" aria-hidden />
              Nên luyện tiếp
            </h2>
            {focus.goal ? (
              <>
                <p className="text-lg font-medium">{focus.goal.title}</p>
                <p>{focus.goal.detail}</p>
                <p className="text-sm text-muted">
                  Từ {FOCUS_MIN_SESSIONS} buổi hoàn thành gần nhất, đo trực tiếp: {focus.goal.basis}
                </p>
              </>
            ) : moduleErrors.length === 0 ? (
              <p className="text-muted">
                Sau {FOCUS_MIN_SESSIONS} buổi luyện tự do, hoặc khi AI ghi nhận lỗi trong module, mục này chỉ ra một điểm em nên tập trung. Em đã
                hoàn thành {focus.completed}/{FOCUS_MIN_SESSIONS} buổi.
              </p>
            ) : null}
            {moduleErrors.length > 0 && (
              <ul className="grid gap-2" aria-label="Lỗi hay gặp trong module đang học">
                {moduleErrors.map((e) => (
                  <li key={e.label} className="flex items-start justify-between gap-3 rounded-2xl bg-warn-soft px-4 py-2.5">
                    <span className="font-medium text-warn">{e.label}</span>
                    <span className="shrink-0 text-sm tabular-nums text-warn">{e.count} lần</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <ReactionCard points={reaction} />

          <section aria-labelledby="class" className="grid content-start gap-3 rounded-3xl border border-line p-6">
            <h2 id="class" className="flex items-center gap-2 text-xl font-semibold">
              <Users className="size-5 text-brand" aria-hidden />
              Lớp của em
            </h2>
            {classes.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {classes.map((c) => (
                  <li key={c.id}>
                    <Chip tone="blue">{c.name}</Chip>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">
                Em chưa vào lớp nào. Có mã lớp từ thầy cô thì{" "}
                <Link href="/account#lop" className="font-medium text-brand underline underline-offset-4">
                  nhập ở trang Tài khoản
                </Link>
                . Chưa có cũng không sao, em vẫn học một mình được.
              </p>
            )}
            <p className="text-sm text-muted">{grade ? `Khối lớp ${grade}` : "Chưa chọn khối lớp"}</p>
          </section>
        </aside>
      </div>

      {/* 3. Em đang ở đâu: mọi Unit của khối, kèm tiến độ thật. */}
      <section aria-labelledby="roadmap" className="grid gap-4">
        <SectionHead id="roadmap" title={`Các Unit lớp ${grade ?? ""}`} />
        {roadmap.length === 0 ? (
          <p className="max-w-prose text-muted">Chưa có Unit nào được duyệt cho khối của em.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roadmap.map((u, i) => (
              <li key={u.id} className="pop-in" style={{ ["--i" as string]: i }}>
                <Link
                  href={u.moduleId ? `/student/module/${u.moduleId}` : `/student/practice/${u.id}`}
                  className="option-card group grid h-full content-start gap-3 rounded-3xl p-5"
                >
                  <span className="flex items-center justify-between gap-3">
                    <Eyebrow>Unit {u.unitNo}</Eyebrow>
                    <Chip tone={STATE[u.state].tone} icon={STATE[u.state].icon}>
                      {STATE[u.state].label}
                    </Chip>
                  </span>
                  <span className="grid">
                    <span lang="en" className="text-lg font-medium group-hover:underline">
                      {u.title}
                    </span>
                    <span className="text-sm text-muted">{u.titleVi}</span>
                  </span>
                  {u.moduleId && (u.daysDone ?? 0) > 0 && <Progress value={u.daysDone ?? 0} max={DAYS} label={`Unit ${u.unitNo}: ${u.daysDone} trên ${DAYS} ngày`} />}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Thời gian bắt đầu nói qua các buổi (trung vị mỗi buổi, ước lượng của trình duyệt). Không so sánh với bạn khác,
 * không chấm tốt/xấu: chỉ cho thấy số của chính mình thay đổi thế nào. Dưới REACTION_MIN_SESSIONS buổi thì chưa vẽ.
 */
function ReactionCard({ points }: { points: ReactionPoint[] }) {
  const shown = points.slice(-6);
  const max = Math.max(...shown.map((p) => p.medianMs), 1);
  return (
    <section aria-labelledby="reaction" className="grid content-start gap-3 rounded-3xl border border-line p-6">
      <h2 id="reaction" className="flex items-center gap-2 text-xl font-semibold">
        <Timer className="size-5 text-success" aria-hidden />
        Thời gian bắt đầu nói
      </h2>
      {points.length < REACTION_MIN_SESSIONS ? (
        <p className="text-muted">
          Sau {REACTION_MIN_SESSIONS} buổi luyện tự do, mục này cho thấy em mất bao lâu để bắt đầu trả lời, qua từng buổi. Hiện có{" "}
          {points.length}/{REACTION_MIN_SESSIONS} buổi có số đo.
        </p>
      ) : (
        <>
          <p>
            Buổi đầu: <strong className="font-medium">{secs(points[0].medianMs)}</strong>. Buổi gần nhất:{" "}
            <strong className="font-medium">{secs(points[points.length - 1].medianMs)}</strong>.
          </p>
          <ol className="grid gap-2" aria-label="Thời gian bắt đầu nói ở giữa của từng buổi, buổi cũ trước">
            {shown.map((p, i) => (
              <li key={p.sessionId} className="grid grid-cols-[3.25rem_1fr_4.5rem] items-center gap-2 text-sm">
                <span className="tabular-nums text-muted">{dayFmt.format(new Date(p.completedAt))}</span>
                <span aria-hidden className="h-2 overflow-hidden rounded-full bg-sunken">
                  <span className="grow-x block h-full rounded-full bg-success" style={{ width: `${Math.max(4, (p.medianMs / max) * 100)}%`, ["--i" as string]: i }} />
                </span>
                <span className="text-right font-medium tabular-nums">{secs(p.medianMs)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <p className="flex items-start gap-1.5 text-sm text-muted">
        <Mic className="mt-0.5 size-4 shrink-0" aria-hidden />
        Từ lúc câu hỏi đọc xong tới lúc micro nghe thấy em nói. Tiếng ồn hay tiếng “ừm” có thể làm lệch.
      </p>
    </section>
  );
}
