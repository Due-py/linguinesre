"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff, Square, Volume2 } from "lucide-react";
import type { Recording } from "@/lib/speaking/useRecorder";
import type { useRecorder } from "@/lib/speaking/useRecorder";
import { primeAudio } from "./audio";

type Rec = ReturnType<typeof useRecorder>;
type State = "idle" | "prompt" | "listening" | "processing";

/**
 * Nút nói chung cho mọi bước của module. Bấm → (đọc câu hỏi nếu có) → ghi âm ngay khi đọc xong → bấm dừng hoặc tự dừng khi
 * im lặng → gửi. lagMs = thời gian từ lúc đọc xong tới lúc bắt đầu ghi, để máy chủ tính thời gian bắt đầu nói.
 *
 * Bốn trạng thái khác nhau đồng thời ở biểu tượng, chữ, màu và chuyển động:
 *  - chờ: nút xanh dương có micro (hoặc loa nếu sẽ đọc câu hỏi trước);
 *  - đang đọc câu hỏi: sóng âm nhún nhịp nhàng;
 *  - đang ghi: nút đỏ có ô vuông dừng, vòng sáng lan ra, sóng âm theo giọng thật, đồng hồ đếm thời gian ghi;
 *    Speed Q&A thêm vòng đếm ngược quanh nút tới mục tiêu riêng của học sinh;
 *  - đang xử lý: vòng quay.
 */
export default function RecordButton({
  rec,
  before,
  onRecorded,
  label = "Bấm để nói",
  disabled,
  targetMs,
}: {
  rec: Rec;
  before?: () => Promise<unknown>;
  onRecorded: (r: Recording, lagMs: number) => Promise<void>;
  label?: string;
  disabled?: boolean;
  /** Speed Q&A: vòng đếm ngược tới mục tiêu khi đang ghi. */
  targetMs?: number | null;
}) {
  const [state, setState] = useState<State>("idle");
  const [elapsed, setElapsed] = useState(0);
  const promptEnd = useRef(0);
  const stopping = useRef(false);

  // Đồng hồ thời gian ghi (chỉ để học sinh thấy, không dùng để chấm).
  useEffect(() => {
    if (state !== "listening") return;
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - t0), 250);
    return () => clearInterval(id);
  }, [state]);

  async function stop() {
    if (stopping.current) return;
    stopping.current = true;
    const r = await rec.stop();
    stopping.current = false;
    if (!r) return;
    setState("processing");
    await onRecorded(r, Math.max(0, r.startedAt - promptEnd.current));
    setState("idle");
  }

  async function start() {
    // Mở khóa âm thanh ngay trong cú bấm (trước mọi await), để câu hỏi đọc được kể cả sau khi chờ micro và chờ máy chủ.
    rec.unlock(); // AudioContext của bộ lọc ồn phải được mở trong cú bấm (Safari trên iPhone)
    if (before) primeAudio();
    if (!(await rec.ensureMic())) return;
    if (before) {
      setState("prompt");
      await before();
    }
    promptEnd.current = Date.now();
    setElapsed(0);
    const ok = await rec.start(() => void stop());
    setState(ok ? "listening" : "idle");
  }

  return (
    <div className="grid justify-items-center gap-4 py-2">
      {state === "idle" && (
        <Round onClick={() => void start()} disabled={disabled || rec.status === "requesting"} label={label} icon={before ? <Volume2 className="size-9" aria-hidden /> : <Mic className="size-9" aria-hidden />} />
      )}
      {state === "prompt" && (
        <div className="grid justify-items-center gap-3" role="status">
          <span className="grid size-24 place-items-center rounded-full bg-brand-soft text-brand-strong">
            <Volume2 className="size-9" aria-hidden />
          </span>
          <Wave />
          <p className="font-medium">Đang đọc, nghe kỹ nhé</p>
        </div>
      )}
      {state === "listening" && (
        <>
          <Round
            onClick={() => void stop()}
            label={rec.speaking ? "Xong, gửi câu trả lời" : "Đang nghe, em nói khi sẵn sàng"}
            icon={<Square className="size-8 fill-current" aria-hidden />}
            listening
            targetMs={targetMs ?? null}
          />
          <Meter level={rec.level} />
          <p className="inline-flex items-center gap-2 text-sm font-medium tabular-nums text-muted" aria-hidden>
            <span className="size-2 rounded-full bg-danger-bright motion-safe:animate-pulse" />
            Đang ghi {Math.floor(elapsed / 60000)}:{String(Math.floor(elapsed / 1000) % 60).padStart(2, "0")}
            {rec.filter === "rnnoise" ? " · đang lọc tiếng ồn" : ""}
          </p>
          {targetMs ? <p className="text-center text-sm font-medium text-muted">Mục tiêu: bắt đầu nói trong {(targetMs / 1000).toString().replace(".", ",")} giây</p> : null}
        </>
      )}
      {state === "processing" && (
        <div className="grid justify-items-center gap-3" role="status">
          <span className="grid size-24 place-items-center rounded-full bg-sunken text-brand">
            <LoaderCircle className="size-9 animate-spin" aria-hidden />
          </span>
          <p className="font-medium">Đang nghe lại bản ghi</p>
        </div>
      )}
      <MicHelp status={rec.status} />
    </div>
  );
}

const RING_R = 58;
const RING_LEN = 2 * Math.PI * RING_R;

function Round({
  onClick,
  label,
  icon,
  listening,
  disabled,
  targetMs = null,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  listening?: boolean;
  disabled?: boolean;
  targetMs?: number | null;
}) {
  return (
    <div className="grid justify-items-center gap-3">
      <div className="relative grid size-32 place-items-center">
        {/* Speed Q&A: vòng đếm ngược rút ngắn dần tới mục tiêu thời gian (có chữ mục tiêu bên dưới). */}
        {listening && targetMs ? (
          <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="64" cy="64" r={RING_R} fill="none" stroke="var(--line)" strokeWidth="5" />
            <circle
              cx="64"
              cy="64"
              r={RING_R}
              fill="none"
              stroke="var(--gold)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_LEN}
              className="ring-countdown motion-reduce:hidden"
              style={{ ["--len" as string]: `${RING_LEN}`, ["--dur" as string]: `${targetMs}ms` }}
            />
          </svg>
        ) : null}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={`press relative grid size-24 place-items-center rounded-full shadow-float disabled:opacity-60 ${
            listening ? "bg-danger-bright text-white" : "bg-brand text-on-brand hover:bg-brand-strong"
          }`}
        >
          {/* Vòng sáng lan ra khi đang ghi (kèm chữ trạng thái bên dưới, không chỉ dựa vào hình). */}
          {listening && (
            <>
              <span className="listen-ring absolute inset-0 rounded-full bg-danger-bright/40 motion-reduce:hidden" aria-hidden />
              <span className="listen-ring absolute inset-0 rounded-full bg-danger-bright/25 [animation-delay:0.8s] motion-reduce:hidden" aria-hidden />
            </>
          )}
          <span className="relative">{icon}</span>
        </button>
      </div>
      <p className="text-center font-medium">{label}</p>
    </div>
  );
}

/** Sóng âm theo âm lượng thật của micro: các cột giữa cao hơn, nhích theo level. */
function Meter({ level }: { level: number }) {
  const bars = 24;
  const amp = Math.min(1, Math.sqrt(level) * 2.6);
  return (
    <div className="flex h-12 items-center gap-1" aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const shape = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / bars);
        const jitter = 0.75 + 0.25 * Math.abs(Math.sin(i * 1.7));
        const h = Math.max(0.12, amp * shape * jitter);
        return <span key={i} className="w-1.5 rounded-full bg-brand transition-[height] duration-100" style={{ height: `${Math.round(h * 100)}%` }} />;
      })}
    </div>
  );
}

/** Sóng âm nhún nhịp nhàng khi máy đang đọc câu hỏi. */
function Wave() {
  return (
    <div className="wave-live flex h-8 items-center gap-1" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} className="block h-full w-1.5 rounded-full bg-brand" style={{ ["--i" as string]: i }} />
      ))}
    </div>
  );
}

function MicHelp({ status }: { status: string }) {
  if (!["denied", "nomic", "unsupported", "error"].includes(status)) return null;
  const text =
    status === "denied"
      ? "Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang, chọn Cho phép micro, rồi tải lại trang."
      : status === "nomic"
        ? "Không tìm thấy micro. Hãy cắm tai nghe có micro hoặc dùng điện thoại."
        : status === "unsupported"
          ? "Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari bản mới."
          : "Chưa mở được micro. Hãy đóng ứng dụng khác đang dùng micro rồi thử lại.";
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-4 py-3 font-medium text-danger">
      <MicOff className="mt-0.5 size-5 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
