"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Mic as MicIcon, Square } from "lucide-react";
import { Meter, Status } from "@/components/TestRunner";
import { finishModeSession } from "@/app/(student)/student/luyen/actions";
import { closeMic, micLevel, openMic, type Mic, type MicError } from "@/lib/research/testRecorder";
import { recordTurn, type TurnRecording } from "@/lib/research/turnRecorder";
import type { PlanStep } from "@/lib/research/modes";

/**
 * Buổi luyện CHẾ ĐỘ B (đọc to, mục 2.4): hiện bài hội thoại / đoạn văn cùng Unit, học sinh bấm ghi âm và đọc to,
 * mỗi bài đọc hai lần. Không chấm, không nhận xét, không gợi ý: chỉ lưu bản ghi và thời gian luyện.
 */

type Phase =
  | { kind: "intro" }
  | { kind: "ready" }
  | { kind: "recording" }
  | { kind: "sending" }
  | { kind: "finishing" }
  | { kind: "done" }
  | { kind: "error"; message: string; retry: () => void };

const MIC_HELP: Record<MicError, string> = {
  denied: "Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang, cho phép micro, rồi tải lại trang.",
  nomic: "Không tìm thấy micro. Cắm tai nghe có micro hoặc dùng điện thoại, rồi thử lại.",
  unsupported: "Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari bản mới.",
  error: "Chưa mở được micro. Đóng các ứng dụng khác đang dùng micro rồi thử lại.",
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

export default function ReadRunner({
  sessionId,
  sessionNo,
  unitNo,
  unitTitle,
  steps,
  savedSteps,
  activeMs: initialActive,
}: {
  sessionId: string;
  sessionNo: number;
  unitNo: number;
  unitTitle: string;
  steps: PlanStep[];
  savedSteps: number[];
  activeMs: number;
}) {
  const firstTodo = steps.findIndex((s) => !savedSteps.includes(s.step));
  const [idx, setIdx] = useState(firstTodo === -1 ? steps.length : firstTodo);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(initialActive);
  const micRef = useRef<Mic | null>(null);
  const stopRef = useRef({ current: false });
  const activeRef = useRef(initialActive);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    let ticks = 0;
    const t = setInterval(() => {
      const k = phaseRef.current.kind;
      if (document.visibilityState !== "visible" || k === "intro" || k === "done") return;
      activeRef.current += 1000;
      setActive(activeRef.current);
      if (++ticks % 15 === 0) void beat();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => () => closeMic(micRef.current), []);

  function beat() {
    return fetch(`/api/mode/heartbeat?session=${sessionId}&active=${activeRef.current}`, { method: "POST", keepalive: true }).catch(() => null);
  }

  async function enableMic() {
    const m = await openMic();
    if (typeof m === "string") return setMicError(m);
    setMicError(null);
    micRef.current = m;
    setMicReady(true);
    const t = setInterval(() => {
      if (phaseRef.current.kind !== "intro") return clearInterval(t);
      setLevel(micLevel(m));
    }, 80);
  }

  const st = steps[idx] as PlanStep | undefined;

  async function read() {
    if (!st || !micRef.current) return;
    stopRef.current = { current: false };
    setPhase({ kind: "recording" });
    const rec = await recordTurn(micRef.current, { beep: false, maxMs: st.maxMs, endSilenceMs: 0, startLimitMs: st.maxMs, stop: stopRef.current, onLevel: setLevel });
    await send(rec);
  }

  async function send(rec: TurnRecording) {
    if (!st) return;
    setPhase({ kind: "sending" });
    let res: Response | null = null;
    for (let i = 0; i < 3; i++) {
      res = await fetch(`/api/mode/turn?session=${sessionId}&step=${st.step}&attempt=1&beep=0&dur=${rec.durationMs}&hint=0`, {
        method: "POST",
        headers: { "Content-Type": rec.mime },
        body: rec.blob,
      }).catch(() => null);
      if (res?.ok || res?.status === 409) break;
      await wait(1500 * (i + 1));
    }
    if (!res?.ok && res?.status !== 409)
      return setPhase({ kind: "error", message: "Chưa gửi được bản ghi. Kiểm tra mạng rồi bấm thử lại.", retry: () => void send(rec) });
    if (idx + 1 >= steps.length) return void finish();
    setIdx(idx + 1);
    setPhase({ kind: "ready" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function finish() {
    setPhase({ kind: "finishing" });
    await beat();
    const r = await finishModeSession(sessionId).catch(() => ({ ok: false }));
    if (!r.ok) return setPhase({ kind: "error", message: "Chưa lưu được buổi luyện. Bấm thử lại.", retry: () => void finish() });
    closeMic(micRef.current);
    micRef.current = null;
    setPhase({ kind: "done" });
  }

  const progress = Math.round((Math.min(idx, steps.length) / steps.length) * 100);
  const rd = st?.reading;

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-2xl content-start gap-6 px-4 pb-10 pt-4 sm:px-6">
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student" className="font-bold underline-offset-4 hover:underline">
            Chế độ B · Buổi {sessionNo}
          </Link>
          <p className="text-sm font-bold tabular-nums text-muted">Đã luyện {mmss(active)}</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ buổi luyện">
          <div className="h-full rounded-full bg-forest transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main id="main" className="grid gap-6">
        {phase.kind === "intro" && (
          <section className="grid gap-5">
            <h1 className="text-3xl font-extrabold tracking-tight">Buổi đọc to hôm nay</h1>
            <p className="text-lg">
              Unit {unitNo}: {unitTitle}. Có {steps.length / 2} bài, mỗi bài đọc to 2 lần, khoảng 10–15 phút.
            </p>
            <ul className="grid list-disc gap-2 pl-5 text-lg">
              <li>Bấm “Bắt đầu đọc”, đọc to và rõ cả bài, rồi bấm “Đọc xong”.</li>
              <li>Hội thoại thì đọc cả lời của mọi người.</li>
              <li>Đọc vấp thì cứ đọc tiếp, không cần đọc lại từ đầu.</li>
            </ul>
            {!micReady ? (
              <BigButton onClick={enableMic}>
                <MicIcon className="size-5" aria-hidden />
                Bật micro
              </BigButton>
            ) : (
              <div className="grid gap-4">
                <p className="text-lg">Nói thử “Hello”: các vạch bên dưới phải nhảy lên.</p>
                <Meter level={level} />
                <BigButton onClick={() => (idx >= steps.length ? void finish() : setPhase({ kind: "ready" }))}>{idx > 0 ? "Làm tiếp" : "Bắt đầu"}</BigButton>
              </div>
            )}
            {micError && <Alert>{MIC_HELP[micError]}</Alert>}
          </section>
        )}

        {rd && ["ready", "recording", "sending"].includes(phase.kind) && (
          <section className="grid gap-4 rounded-[2rem] bg-surface px-6 py-7 shadow-[0_1px_0_var(--line)] sm:px-10">
            <p className="text-sm font-bold text-muted">
              Bài {Math.floor(idx / 2) + 1}/{steps.length / 2} · Đọc lần {rd.round}
            </p>
            <h1 lang="en" className="text-2xl font-extrabold tracking-tight">
              {rd.title}
            </h1>
            <div lang="en" className="grid gap-3 text-lg leading-relaxed">
              {rd.lines.map((l, i) =>
                rd.kind === "dialogue" ? (
                  <p key={i}>
                    <span className="font-bold">{l.speaker}: </span>
                    {l.text}
                  </p>
                ) : (
                  <p key={i}>{l.text}</p>
                ),
              )}
            </div>
          </section>
        )}

        {phase.kind === "ready" && (
          <BigButton onClick={() => void read()}>
            <MicIcon className="size-5" aria-hidden />
            Bắt đầu đọc
          </BigButton>
        )}
        {phase.kind === "recording" && (
          <div className="sticky bottom-4 grid justify-items-center gap-3 rounded-2xl bg-bg/95 py-3">
            <Meter level={level} />
            <button type="button" onClick={() => (stopRef.current.current = true)} className="inline-flex min-h-14 items-center gap-2 rounded-full bg-forest px-8 text-lg font-bold text-on-forest">
              <Square className="size-4" aria-hidden />
              Đọc xong
            </button>
          </div>
        )}
        {phase.kind === "sending" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Đang lưu bản đọc" />}
        {phase.kind === "finishing" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Đang lưu buổi luyện" />}

        {phase.kind === "done" && (
          <section className="grid gap-5 rounded-[2rem] bg-forest px-6 py-10 text-on-forest sm:px-10">
            <CircleCheck className="size-10" aria-hidden />
            <h1 className="text-3xl font-extrabold tracking-tight">Xong buổi luyện hôm nay</h1>
            <p className="text-lg text-on-forest-muted">Thời gian luyện: khoảng {Math.max(1, Math.round(active / 60000))} phút.</p>
            <Link href="/student" className="inline-flex min-h-12 w-fit items-center rounded-full bg-on-forest px-6 font-bold text-forest">
              Về trang chính
            </Link>
          </section>
        )}

        {phase.kind === "error" && (
          <div className="grid gap-3">
            <Alert>{phase.message}</Alert>
            <button type="button" onClick={phase.retry} className="inline-flex min-h-12 w-fit items-center rounded-full border-2 border-ink/80 bg-surface px-6 font-bold hover:bg-sunken">
              Thử lại
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function BigButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex min-h-14 w-fit items-center gap-2 rounded-full bg-brand px-8 text-lg font-bold text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong">
      {children}
    </button>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
      <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
