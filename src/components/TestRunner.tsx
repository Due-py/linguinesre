"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Mic as MicIcon, MicOff, Volume2 } from "lucide-react";
import { finishTest } from "@/app/(student)/student/test/actions";
import { closeMic, micLevel, openMic, playAudio, recordAnswer, type Mic, type MicError, type TestRecording } from "@/lib/research/testRecorder";

type Item = { id: string; text: string; warmup: boolean; number: number; total: number; warmupCount: number };
type Step =
  | { kind: "mic" }
  | { kind: "loading" }
  | { kind: "question"; item: Item }
  | { kind: "recording"; item: Item }
  | { kind: "sending"; item: Item }
  | { kind: "warmupDone" }
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

/**
 * Bài kiểm tra phản xạ nói (mục 3.5). Mỗi câu: hiện chữ + đọc câu hỏi → bíp → ghi âm (tối đa 10 giây để bắt đầu,
 * 20 giây cả câu) → tự sang câu sau. Không đồng hồ đếm ngược, không nhận xét, không gợi ý.
 * Bản ghi chưa gửi được thì giữ lại và tự gửi lại (3 lần), học sinh không phải nói lại.
 */
export default function TestRunner({ attemptId, phaseLabel }: { attemptId: string; phaseLabel: string }) {
  const [step, setStep] = useState<Step>({ kind: "mic" });
  const [micError, setMicError] = useState<MicError | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [level, setLevel] = useState(0);
  const micRef = useRef<Mic | null>(null);
  const meterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (meterRef.current) clearInterval(meterRef.current);
      closeMic(micRef.current);
    },
    [],
  );

  async function enableMic() {
    const m = await openMic();
    if (typeof m === "string") {
      setMicError(m);
      return;
    }
    setMicError(null);
    micRef.current = m;
    setMicReady(true);
    meterRef.current = setInterval(() => setLevel(micLevel(m)), 80);
  }

  function begin() {
    if (meterRef.current) clearInterval(meterRef.current);
    void loop();
  }

  async function loop() {
    for (;;) {
      setStep({ kind: "loading" });
      const res = await fetch(`/api/test/next?attempt=${attemptId}`).catch(() => null);
      const data = res?.ok ? await res.json() : null;
      if (!data) return fail("Mất kết nối khi tải câu hỏi. Kiểm tra mạng rồi bấm thử lại.");
      const item: Item | null = data.item;
      if (!item) return finish();

      setStep({ kind: "question", item });
      const audio = await fetch(`/api/test/audio?attempt=${attemptId}&item=${item.id}`).catch(() => null);
      if (!audio || (audio.status !== 200 && audio.status !== 204))
        return fail("Không tải được giọng đọc câu hỏi. Báo người coi thi, rồi bấm thử lại.");
      if (audio.status === 200) await playAudio(micRef.current!, await audio.arrayBuffer());
      else await wait(1500); // chế độ thử không có giọng đọc

      setStep({ kind: "recording", item });
      const recording = await recordAnswer(micRef.current!, setLevel);
      setStep({ kind: "sending", item });
      if (!(await send(item, recording))) return fail("Chưa gửi được bản ghi vừa rồi. Kiểm tra mạng rồi bấm thử lại.", () => resend(item, recording));

      if (item.warmup && item.number === item.warmupCount) {
        setStep({ kind: "warmupDone" });
        return;
      }
      await wait(800);
    }
  }

  async function send(item: Item, r: TestRecording): Promise<boolean> {
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`/api/test/response?attempt=${attemptId}&item=${item.id}&beep=${r.beepEndMs}&dur=${r.durationMs}`, {
        method: "POST",
        headers: { "Content-Type": r.mime },
        body: r.blob,
      }).catch(() => null);
      if (res?.ok || res?.status === 409) return true; // 409: câu này đã lưu ở lần gửi trước
      await wait(1500 * (i + 1));
    }
    return false;
  }

  async function resend(item: Item, r: TestRecording) {
    setStep({ kind: "sending", item });
    if (await send(item, r)) void loop();
    else fail("Vẫn chưa gửi được. Kiểm tra mạng rồi bấm thử lại.", () => resend(item, r));
  }

  async function finish() {
    setStep({ kind: "finishing" });
    const r = await finishTest(attemptId).catch(() => ({ ok: false }));
    if (!r.ok) return fail("Chưa lưu được kết quả bài kiểm tra. Bấm thử lại.", () => void finish());
    closeMic(micRef.current);
    micRef.current = null;
    setStep({ kind: "done" });
  }

  function fail(message: string, retry: () => void = () => void loop()) {
    setStep({ kind: "error", message, retry });
  }

  const item = "item" in step ? step.item : null;

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-2xl content-start gap-6 px-4 pb-10 pt-4 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <p className="font-bold">{phaseLabel}</p>
        {item && (
          <p className="text-sm font-bold tabular-nums text-muted">
            {item.warmup ? `Câu làm mẫu ${item.number}/${item.warmupCount}` : `Câu ${item.number - item.warmupCount}/${item.total - item.warmupCount}`}
          </p>
        )}
      </header>

      <main id="main" className="grid gap-6">
        {step.kind === "mic" && (
          <section className="grid gap-5">
            <h1 className="text-3xl font-extrabold tracking-tight">Trước khi bắt đầu</h1>
            <ol className="grid list-decimal gap-2 pl-5 text-lg">
              <li>Mỗi câu, máy đọc câu hỏi rồi phát một tiếng bíp.</li>
              <li>Nghe tiếng bíp xong thì trả lời bằng tiếng Anh, nói thành câu.</li>
              <li>Máy tự ghi âm và tự sang câu sau. Bạn không cần bấm gì.</li>
              <li>Hai câu đầu là câu làm mẫu, không tính điểm.</li>
              <li>Không biết trả lời thì cứ im lặng, máy sẽ tự sang câu sau.</li>
            </ol>
            {!micReady ? (
              <button type="button" onClick={enableMic} className="inline-flex min-h-14 w-fit items-center gap-2 rounded-full bg-brand px-8 text-lg font-bold text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong">
                <MicIcon className="size-5" aria-hidden />
                Bật micro
              </button>
            ) : (
              <div className="grid gap-4">
                <p className="text-lg">Nói thử “Hello” để kiểm tra: các vạch bên dưới phải nhảy lên.</p>
                <Meter level={level} />
                <button type="button" onClick={begin} className="inline-flex min-h-14 w-fit items-center gap-2 rounded-full bg-brand px-8 text-lg font-bold text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong">
                  Bắt đầu câu làm mẫu
                </button>
              </div>
            )}
            {micError && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
                <MicOff className="mt-0.5 size-5 shrink-0" aria-hidden />
                {MIC_HELP[micError]}
              </p>
            )}
          </section>
        )}

        {item && (
          <section aria-live="polite" className="grid min-h-48 content-center gap-3 rounded-[2rem] bg-surface px-6 py-8 shadow-[0_1px_0_var(--line)] sm:px-10">
            <p lang="en" className="text-balance text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
              {item.text}
            </p>
          </section>
        )}

        {step.kind === "loading" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Đang tải câu hỏi" />}
        {step.kind === "question" && <Status icon={<Volume2 className="size-8" aria-hidden />} label="Nghe câu hỏi" />}
        {step.kind === "recording" && (
          <div className="grid justify-items-center gap-3">
            <Status icon={<MicIcon className="size-8" aria-hidden />} label="Đang ghi âm. Trả lời ngay khi bạn sẵn sàng." live />
            <Meter level={level} />
          </div>
        )}
        {step.kind === "sending" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Đang lưu câu trả lời" />}

        {step.kind === "warmupDone" && (
          <section className="grid gap-5">
            <h1 className="text-3xl font-extrabold tracking-tight">Xong phần làm mẫu</h1>
            <p className="text-lg">Bây giờ là bài thật, gồm 15 câu. Làm giống hệt hai câu vừa rồi.</p>
            <button type="button" onClick={() => void loop()} className="inline-flex min-h-14 w-fit items-center gap-2 rounded-full bg-brand px-8 text-lg font-bold text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong">
              Bắt đầu bài thật
            </button>
          </section>
        )}

        {step.kind === "finishing" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Đang lưu bài kiểm tra" />}

        {step.kind === "done" && (
          <section className="grid gap-5 rounded-[2rem] bg-forest px-6 py-10 text-on-forest sm:px-10">
            <CircleCheck className="size-10" aria-hidden />
            <h1 className="text-3xl font-extrabold tracking-tight">Bạn đã làm xong bài kiểm tra</h1>
            <p className="text-on-forest-muted">Các câu trả lời đã được lưu. Cảm ơn bạn. Bạn có thể đưa máy lại cho người coi thi.</p>
            <Link href="/student" className="inline-flex min-h-12 w-fit items-center rounded-full bg-on-forest px-6 font-bold text-forest">
              Về trang chính
            </Link>
          </section>
        )}

        {step.kind === "error" && (
          <div className="grid gap-3">
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              {step.message}
            </p>
            <button type="button" onClick={step.retry} className="inline-flex min-h-12 w-fit items-center rounded-full border-2 border-ink/80 bg-surface px-6 font-bold hover:bg-sunken">
              Thử lại
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Status({ icon, label, live }: { icon: React.ReactNode; label: string; live?: boolean }) {
  return (
    <div role="status" className="grid justify-items-center gap-2">
      <span className={`grid size-20 place-items-center rounded-full ${live ? "bg-forest text-on-forest" : "border-2 border-dashed border-ink/40 bg-sunken"}`}>{icon}</span>
      <p className="text-center font-bold">{label}</p>
    </div>
  );
}

function Meter({ level }: { level: number }) {
  const bars = 12;
  const active = Math.min(bars, Math.round(Math.sqrt(level) * bars * 2.2));
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={`w-2 rounded-full ${i < active ? "bg-forest" : "bg-line"}`} style={{ height: `${30 + ((i * 37) % 70)}%` }} />
      ))}
    </div>
  );
}
