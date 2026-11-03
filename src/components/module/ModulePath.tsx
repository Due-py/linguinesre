import { Check, Lock, Play } from "lucide-react";
import { startLesson } from "@/app/(student)/student/module/actions";
import { DAY_INFO, PHASES } from "@/lib/module/plan";

/**
 * Lộ trình 14 ngày dạng đường đi (lấy hình thức từ Duolingo): mỗi giai đoạn có băng tiêu đề màu riêng, các ngày là nút tròn
 * lượn trái phải. Chỉ dùng dữ liệu thật: ngày đã xong, ngày tiếp theo, ngày chưa mở.
 */
export default function ModulePath({ moduleId, completed, nextDay, open }: { moduleId: string; completed: number[]; nextDay: number | null; open: boolean }) {
  return (
    <ol className="grid gap-8">
      {PHASES.map((p) => (
        <li key={p.no} className="grid gap-5">
          <div className={`rounded-2xl px-5 py-4 ${PHASE_TONE[p.no - 1]}`}>
            <p className="text-sm font-extrabold opacity-90">
              Giai đoạn {p.no} · Ngày {p.days[0]}–{p.days[p.days.length - 1]}
            </p>
            <h3 className="text-xl font-extrabold">{p.titleVi}</h3>
            <p className="opacity-90">{p.goalVi}</p>
          </div>
          <ul className="grid gap-4">
            {p.days.map((d) => (
              <PathDay key={d} day={d} state={completed.includes(d) ? "done" : d === nextDay ? (open ? "open" : "next") : "locked"} moduleId={moduleId} />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export const phaseOf = (day: number) => PHASES.find((p) => (p.days as readonly number[]).includes(day))!;

// Băng tiêu đề giai đoạn: mỗi giai đoạn một màu (chữ trắng ≥ 4.6:1, riêng nền vàng dùng chữ đậm).
const PHASE_TONE = [
  "bg-forest text-on-forest",
  "bg-sky-strong text-white",
  "bg-gold text-ink",
  "bg-berry text-white",
  "bg-brand-strong text-white",
];

// Độ lệch ngang của nút theo ngày, lượn trái phải như đường đi (px). Hằng số, không phải dữ liệu.
const OFFSET = [0, 44, 72, 44, 0, -44, -72, -44];

/**
 * Một ngày trên đường đi. Chỉ ngày tiếp theo bấm được (bắt đầu hoặc học tiếp); ngày đã xong và ngày chưa mở chỉ để xem.
 * Trạng thái luôn có cả biểu tượng và chữ, không chỉ dựa vào màu. Nhãn nằm phía ngược với hướng lệch của nút.
 */
function PathDay({ day, state, moduleId }: { day: number; state: "done" | "open" | "next" | "locked"; moduleId: string }) {
  const off = OFFSET[(day - 1) % OFFSET.length];
  const status = state === "done" ? "Đã xong" : state === "open" ? "Đang làm" : state === "next" ? "Tiếp theo" : "Chưa mở";
  const label = (
    <span className={`grid gap-0.5 text-sm ${off > 0 ? "col-start-1 row-start-1 text-right" : "col-start-3 row-start-1"}`}>
      <span className={`font-extrabold ${state === "locked" ? "text-muted" : "text-ink"}`}>Ngày {day}</span>
      <span className="text-muted">{DAY_INFO[day].titleVi}</span>
      <span className="font-bold text-muted">{status}</span>
    </span>
  );
  const node =
    state === "done" ? (
      <span className="grid size-16 place-items-center rounded-full bg-brand text-on-brand shadow-[0_5px_0_var(--brand-strong)]">
        <Check className="size-8" strokeWidth={3.5} aria-hidden />
      </span>
    ) : state === "locked" ? (
      <span className="grid size-16 place-items-center rounded-full bg-line text-muted shadow-[0_5px_0_var(--line-strong)]">
        <Lock className="size-6" aria-hidden />
      </span>
    ) : (
      <form action={startLesson} className="relative">
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="day" value={day} />
        <span aria-hidden className="nudge absolute -top-11 left-1/2 whitespace-nowrap rounded-xl border-2 border-line bg-surface px-3 py-1 text-sm font-extrabold text-brand-strong">
          {state === "open" ? "Học tiếp" : "Bắt đầu"}
        </span>
        <button
          type="submit"
          aria-label={`Ngày ${day}: ${DAY_INFO[day].titleVi}. ${state === "open" ? "Học tiếp" : "Bắt đầu"}`}
          className="grid size-[4.5rem] place-items-center rounded-full bg-brand text-on-brand ring-4 ring-brand-soft ring-offset-4 transition-transform btn-3d [--depth:var(--brand-strong)]"
        >
          <Play className="size-8 fill-current" aria-hidden />
        </button>
      </form>
    );
  return (
    <li className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3">
      {/* Lệch ngang ở khung ngoài, hiệu ứng nảy ở khung trong (hai transform không đè nhau). */}
      <span className="col-start-2 row-start-1" style={{ transform: `translateX(${off}px)` }}>
        <span className="pop-in block" style={{ ["--i" as string]: day }}>
          {node}
        </span>
      </span>
      {label}
    </li>
  );
}
