import { Check, Clock, Lock, Play } from "lucide-react";
import { startLesson } from "@/app/(student)/student/module/actions";
import { DAY_INFO, PHASES } from "@/lib/module/plan";
import { Chip, type Tone } from "@/components/ui";

export { phaseOf } from "@/lib/module/plan";

/** Mỗi giai đoạn một màu Google, dùng giống nhau ở thanh giai đoạn và dòng thời gian. */
const PHASE_TONE: Tone[] = ["blue", "green", "yellow", "red", "blue"];
const DOT: Record<Tone, string> = { blue: "bg-brand", green: "bg-success", yellow: "bg-gold", red: "bg-danger-bright", grey: "bg-line-strong" };
const SOFT: Record<Tone, string> = { blue: "bg-brand-soft", green: "bg-success-soft", yellow: "bg-gold-soft", red: "bg-danger-soft", grey: "bg-sunken" };

type DayState = "done" | "open" | "next" | "locked";

/**
 * Hành trình 14 ngày của một module: thanh 5 giai đoạn (đã xong / đang học / chưa mở, kèm số ngày) và dòng thời gian từng
 * ngày (mục tiêu, thời lượng, trạng thái). Chỉ ngày tiếp theo bấm được. Chỉ dùng dữ liệu thật.
 */
export default function ModulePath({ moduleId, completed, nextDay, open }: { moduleId: string; completed: number[]; nextDay: number | null; open: boolean }) {
  const dayState = (d: number): DayState => (completed.includes(d) ? "done" : d === nextDay ? (open ? "open" : "next") : "locked");
  return (
    <div className="grid gap-8">
      {/* Thanh 5 giai đoạn: nhìn một lần biết đã đi tới đâu. */}
      <ol className="grid gap-2 sm:grid-cols-5" aria-label="Năm giai đoạn">
        {PHASES.map((p, i) => {
          const done = p.days.filter((d) => completed.includes(d)).length;
          const current = nextDay !== null && (p.days as readonly number[]).includes(nextDay);
          const finished = done === p.days.length;
          return (
            <li
              key={p.no}
              aria-current={current ? "step" : undefined}
              className={`grid content-start gap-2 rounded-3xl p-4 ${current ? SOFT[PHASE_TONE[i]] : "bg-tint"}`}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-muted">
                <span aria-hidden className={`size-2.5 rounded-full ${DOT[PHASE_TONE[i]]}`} />
                Giai đoạn {p.no}
              </span>
              <span className="font-medium">{p.titleVi}</span>
              <span aria-hidden className="flex gap-1">
                {p.days.map((d) => (
                  <span key={d} className={`h-1.5 flex-1 rounded-full ${completed.includes(d) ? DOT[PHASE_TONE[i]] : "bg-line"}`} />
                ))}
              </span>
              <span className="text-sm text-muted">
                {finished ? "Đã xong" : current ? "Đang học" : done > 0 ? "Đang học" : "Chưa mở"} · {done}/{p.days.length} ngày
              </span>
            </li>
          );
        })}
      </ol>

      {/* Dòng thời gian từng ngày, nhóm theo giai đoạn. */}
      <ol className="grid gap-8">
        {PHASES.map((p, i) => (
          <li key={p.no} className="grid gap-3">
            <div className="grid gap-1">
              <Chip tone={PHASE_TONE[i]}>
                Giai đoạn {p.no} · Ngày {p.days[0]}–{p.days[p.days.length - 1]}
              </Chip>
              <h3 className="text-xl font-semibold tracking-tight">{p.titleVi}</h3>
              <p className="max-w-prose text-muted">{p.goalVi}</p>
            </div>
            <ul className="grid">
              {p.days.map((d, k) => (
                <PathDay key={d} day={d} state={dayState(d)} moduleId={moduleId} tone={PHASE_TONE[i]} last={k === p.days.length - 1} />
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Một ngày: nốt tròn trên đường dọc (dấu tích / nút bắt đầu / ổ khóa), tên ngày, mục tiêu, thời lượng. Luôn có chữ trạng thái. */
function PathDay({ day, state, moduleId, tone, last }: { day: number; state: DayState; moduleId: string; tone: Tone; last: boolean }) {
  const info = DAY_INFO[day];
  const active = state === "open" || state === "next";
  const status = state === "done" ? "Đã xong" : state === "open" ? "Đang làm" : state === "next" ? "Tiếp theo" : "Chưa mở";
  return (
    <li className="grid grid-cols-[2.75rem_1fr] gap-x-4">
      <div className="relative flex justify-center">
        {!last && <span aria-hidden className="absolute bottom-0 top-11 w-0.5 bg-line" />}
        <span
          className={`relative grid size-11 place-items-center rounded-full ${
            state === "done" ? `${DOT[tone]} text-white` : active ? "bg-brand text-on-brand ring-4 ring-brand-tonal" : "bg-sunken text-muted"
          }`}
        >
          {state === "done" ? <Check className="size-5" strokeWidth={3} aria-hidden /> : active ? <Play className="size-5 fill-current" aria-hidden /> : <Lock className="size-4" aria-hidden />}
        </span>
      </div>
      <div className={`mb-3 grid gap-2 rounded-3xl px-5 py-4 ${active ? "bg-brand-soft" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`font-medium ${state === "locked" ? "text-muted" : ""}`}>
            Ngày {day}: {info.titleVi}
          </p>
          <span className="text-sm font-medium text-muted">{status}</span>
        </div>
        {(active || state === "done") && <p className={state === "done" ? "text-sm text-muted" : ""}>{info.goalVi}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Clock className="size-4" aria-hidden />
            Khoảng {info.minutes} phút
          </span>
          {active && (
            <form action={startLesson}>
              <input type="hidden" name="moduleId" value={moduleId} />
              <input type="hidden" name="day" value={day} />
              <button
                type="submit"
                aria-label={`Ngày ${day}: ${info.titleVi}. ${state === "open" ? "Học tiếp" : "Bắt đầu"}`}
                className="press inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 font-medium text-on-brand hover:shadow-card"
              >
                <Play className="size-4 fill-current" aria-hidden />
                {state === "open" ? "Học tiếp" : "Bắt đầu"}
              </button>
            </form>
          )}
        </div>
        {active && <p className="text-sm text-muted">Xong bài khi: {info.doneVi}</p>}
      </div>
    </li>
  );
}
