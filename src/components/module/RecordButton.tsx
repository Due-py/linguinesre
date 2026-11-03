"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Mic, MicOff, Square, Volume2 } from "lucide-react";
import type { Recording } from "@/lib/speaking/useRecorder";
import type { useRecorder } from "@/lib/speaking/useRecorder";

type Rec = ReturnType<typeof useRecorder>;
type State = "idle" | "prompt" | "listening" | "processing";

/**
 * Nút nói chung cho mọi bước của module. Bấm → (đọc câu hỏi nếu có) → ghi âm ngay khi đọc xong → bấm dừng hoặc tự dừng khi
 * im lặng → gửi. lagMs = thời gian từ lúc đọc xong tới lúc bắt đầu ghi, để máy chủ tính thời gian bắt đầu nói.
 * Các trạng thái khác nhau ở biểu tượng, chữ và chuyển động, không chỉ ở màu.
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
  /** Speed Q&A: hiện vạch thời gian tới mục tiêu khi đang nghe. */
  targetMs?: number | null;
}) {
  const [state, setState] = useState<State>("idle");
  const promptEnd = useRef(0);
  const stopping = useRef(false);

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
    if (!(await rec.ensureMic())) return;
    if (before) {
      setState("prompt");
      await before();
    }
    promptEnd.current = Date.now();
    const ok = await rec.start(() => void stop());
    setState(ok ? "listening" : "idle");
  }

  return (
    <div className="grid justify-items-center gap-3">
      {state === "idle" && (
        <Round onClick={() => void start()} disabled={disabled || rec.status === "requesting"} label={label} icon={before ? <Volume2 className="size-9" aria-hidden /> : <Mic className="size-9" aria-hidden />} />
      )}
      {state === "prompt" && <Badge icon={<Volume2 className="size-9" aria-hidden />} label="Đang đọc, nghe kỹ nhé" pulse />}
      {state === "listening" && (
        <>
          <Round onClick={() => void stop()} label={rec.speaking ? "Xong, gửi câu trả lời" : "Đang nghe, em nói khi sẵn sàng"} icon={<Square className="size-8 fill-current" aria-hidden />} listening />
          {targetMs ? (
            <div className="grid w-full max-w-xs gap-1" aria-hidden>
              <div className="h-2 overflow-hidden rounded-full bg-line">
                <span className="block h-full origin-left rounded-full bg-forest motion-reduce:hidden" style={{ animation: `grow ${targetMs}ms linear forwards` }} />
              </div>
              <p className="text-center text-sm font-semibold text-muted">Mục tiêu: bắt đầu nói trong {(targetMs / 1000).toString().replace(".", ",")} giây</p>
            </div>
          ) : (
            <Meter level={rec.level} />
          )}
        </>
      )}
      {state === "processing" && <Badge icon={<LoaderCircle className="size-9 animate-spin" aria-hidden />} label="Đang nghe lại bản ghi" />}
      <MicHelp status={rec.status} />
    </div>
  );
}

function Round({ onClick, label, icon, listening, disabled }: { onClick: () => void; label: string; icon: React.ReactNode; listening?: boolean; disabled?: boolean }) {
  return (
    <div className="grid justify-items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`relative grid size-24 place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-60 ${
          listening ? "bg-forest text-on-forest" : "bg-brand text-on-brand shadow-button hover:bg-brand-strong"
        }`}
      >
        {listening && <span className="absolute inset-0 animate-ping rounded-full bg-forest/30 motion-reduce:hidden" aria-hidden />}
        {icon}
      </button>
      <p className="text-center font-bold">{label}</p>
    </div>
  );
}

function Badge({ icon, label, pulse }: { icon: React.ReactNode; label: string; pulse?: boolean }) {
  return (
    <div className="grid justify-items-center gap-2" role="status">
      <span className={`grid size-24 place-items-center rounded-full border border-dashed border-ink/40 bg-sunken ${pulse ? "animate-pulse" : ""}`}>{icon}</span>
      <p className="font-bold">{label}</p>
    </div>
  );
}

function Meter({ level }: { level: number }) {
  const bars = 12;
  const active = Math.min(bars, Math.round(Math.sqrt(level) * bars * 2.2));
  return (
    <div className="flex h-7 items-end gap-1" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={`w-2 rounded-full transition-[height] duration-75 ${i < active ? "bg-forest" : "bg-line"}`} style={{ height: `${30 + ((i * 37) % 70)}%` }} />
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
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
      <MicOff className="mt-0.5 size-5 shrink-0" aria-hidden />
      {text}
    </p>
  );
}
