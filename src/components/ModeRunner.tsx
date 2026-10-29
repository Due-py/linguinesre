"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, Lightbulb, LoaderCircle, Mic as MicIcon, Square, Timer, Volume2 } from "lucide-react";
import FeedbackPanel from "@/components/FeedbackPanel";
import { Meter, Status } from "@/components/TestRunner";
import { finishModeSession } from "@/app/(student)/student/luyen/actions";
import type { FeedbackView } from "@/app/(student)/student/practice/actions";
import type { FeedbackPayload } from "@/lib/feedback/generate";
import { computeMeasures } from "@/lib/feedback/measures";
import { closeMic, micLevel, openMic, playAudio, type Mic, type MicError } from "@/lib/research/testRecorder";
import { recordTurn, type TurnRecording } from "@/lib/research/turnRecorder";
import type { Layer, PlanStep, TurnCheck } from "@/lib/research/modes";
import { median } from "@/lib/research/latency";

/**
 * Buổi luyện CHẾ ĐỘ A (LINGUA-REFLEX). Đi lần lượt các tầng của Pyramid:
 *  L0 từ vựng (nhớ lại từ nghĩa tiếng Việt → nghe mẫu → nói theo), L1 khung câu và Speed Q&A (giới hạn 5 → 3 → 1,5 giây),
 *  L2 mở rộng có lý do (có AI nhận xét), L3 Micro-Roleplay và nói một đoạn.
 * Rescue Cascade: gợi ý mở từng mức, từ nhẹ đến mạnh; lượt đầu chưa được (im lặng, trễ giờ, chưa đúng) thì tự mở thêm một
 * mức gợi ý và cho nói lại. Học sinh luôn tự nói câu trả lời; gợi ý không bị trừ gì.
 * Mỗi lượt nói được lưu ngay ở máy chủ (mode_turns), nên tắt máy giữa chừng thì mở lại làm tiếp từ bước chưa làm.
 */

type TurnResult = {
  turnId: string;
  transcript: string;
  rlMs: number | null;
  rlStatus: string;
  limitMs: number | null;
  inLimit: boolean | null;
  check: TurnCheck | null;
  nextLimit: number | null;
};

type Phase =
  | { kind: "intro" }
  | { kind: "section"; layer: Layer }
  | { kind: "ready" }
  | { kind: "listening" }
  | { kind: "recording"; limitMs: number | null }
  | { kind: "sending" }
  | { kind: "result"; res: TurnResult }
  | { kind: "model" }
  | { kind: "finishing" }
  | { kind: "done" }
  | { kind: "error"; message: string; retry: () => void };

const MIC_HELP: Record<MicError, string> = {
  denied: "Trình duyệt đang chặn micro. Bấm biểu tượng ổ khóa cạnh địa chỉ trang, cho phép micro, rồi tải lại trang.",
  nomic: "Không tìm thấy micro. Cắm tai nghe có micro hoặc dùng điện thoại, rồi thử lại.",
  unsupported: "Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari bản mới.",
  error: "Chưa mở được micro. Đóng các ứng dụng khác đang dùng micro rồi thử lại.",
};

const SECTION: Record<Layer, { title: string; body: string }> = {
  L0: { title: "Tầng 0 · Từ vựng", body: "Nhìn nghĩa tiếng Việt, nói từ tiếng Anh. Sau đó nghe máy đọc mẫu và nói theo." },
  L1: {
    title: "Tầng 1 · Khung câu và Speed Q&A",
    body: "Nói thành câu bằng khung câu. Sau đó là Speed Q&A: nghe câu hỏi, có tiếng bíp, cố bắt đầu trả lời trước khi vạch thời gian hết.",
  },
  L2: { title: "Tầng 2 · Mở rộng câu", body: "Trả lời và nêu lý do (because…). Không giới hạn thời gian. Nói xong có thể xem AI nhận xét." },
  L3: { title: "Tầng 3 · Hội thoại và nói đoạn", body: "Nói chuyện vài lượt với một người trong tình huống, rồi nói một đoạn ngắn về chủ đề của Unit." },
};

const sec = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ModeRunner({
  sessionId,
  sessionNo,
  unitNo,
  unitTitle,
  steps,
  savedSteps,
  startLimitMs,
  activeMs: initialActive,
}: {
  sessionId: string;
  sessionNo: number;
  unitNo: number;
  unitTitle: string;
  steps: PlanStep[];
  savedSteps: number[];
  startLimitMs: number;
  activeMs: number;
}) {
  const firstTodo = steps.findIndex((s) => !savedSteps.includes(s.step));
  const [idx, setIdx] = useState(firstTodo === -1 ? steps.length : firstTodo);
  const [attempt, setAttempt] = useState(1);
  const [hintLevel, setHintLevel] = useState(0);
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [micReady, setMicReady] = useState(false);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [onset, setOnset] = useState<number | null>(null);
  const [limit, setLimit] = useState(startLimitMs);
  const [chat, setChat] = useState<{ who: "partner" | "me"; text: string }[]>([]);
  const [feedback, setFeedback] = useState<{ loading: boolean; view: FeedbackView | null; error: string | null } | null>(null);
  const [stats, setStats] = useState<{ speed: { inLimit: boolean | null; rlMs: number | null }[]; turns: number }>({ speed: [], turns: 0 });

  const micRef = useRef<Mic | null>(null);
  const stopRef = useRef({ current: false });
  const activeRef = useRef(initialActive);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const st = steps[idx] as PlanStep | undefined;

  // Thời gian luyện: chỉ tính khi trang đang hiện trên màn hình; gửi về máy chủ mỗi 15 giây.
  useEffect(() => {
    let ticks = 0;
    const t = setInterval(() => {
      const k = phaseRef.current.kind;
      if (document.visibilityState !== "visible" || k === "intro" || k === "done") return;
      activeRef.current += 1000;
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

  function enterStep(i: number) {
    setIdx(i);
    setAttempt(1);
    setHintLevel(0);
    setFeedback(null);
    const s = steps[i];
    if (!s) return void finish();
    if (s.activity === "roleplay" && s.roleplay?.turn === 1) setChat([]);
    const prev = steps[i - 1];
    setPhase(!prev || prev.layer !== s.layer ? { kind: "section", layer: s.layer! } : { kind: "ready" });
  }

  async function speak(kind: "say" | "model", s: PlanStep) {
    const res = await fetch(`/api/mode/audio?session=${sessionId}&step=${s.step}&kind=${kind}`).catch(() => null);
    if (res?.status === 200) {
      try {
        await playAudio(micRef.current!, await res.arrayBuffer());
        return;
      } catch {
        /* giọng đọc lỗi: chỉ hiện chữ */
      }
    }
    await wait(1200);
  }

  async function run(att: number) {
    if (!st || !micRef.current) return;
    const timed = st.activity === "speed" && att === 1;
    if (st.say && att === 1) {
      setPhase({ kind: "listening" });
      if (st.activity === "roleplay") setChat((c) => [...c, { who: "partner", text: st.say! }]);
      await speak("say", st);
    }
    stopRef.current = { current: false };
    setElapsed(0);
    setOnset(null);
    setPhase({ kind: "recording", limitMs: timed ? limit : null });
    let frames = 0;
    const rec = await recordTurn(micRef.current, {
      beep: true,
      maxMs: st.maxMs,
      endSilenceMs: st.endSilenceMs,
      startLimitMs: st.activity === "talk" ? 15_000 : 10_000,
      stop: stopRef.current,
      onLevel: (v) => {
        setLevel(v);
        frames++;
        if (frames % 2 === 0) setElapsed(frames * 50);
      },
      onOnset: (ms) => setOnset(ms),
    });
    await send(att, rec);
  }

  async function send(att: number, rec: TurnRecording) {
    if (!st) return;
    setPhase({ kind: "sending" });
    let res: Response | null = null;
    for (let i = 0; i < 3; i++) {
      res = await fetch(
        `/api/mode/turn?session=${sessionId}&step=${st.step}&attempt=${att}&beep=${rec.beepEndMs}&dur=${rec.durationMs}&hint=${hintLevel}&onset=${rec.onsetMs ?? ""}`,
        { method: "POST", headers: { "Content-Type": rec.mime }, body: rec.blob },
      ).catch(() => null);
      if (res?.ok || res?.status === 409) break;
      await wait(1500 * (i + 1));
    }
    if (res?.status === 409) return next();
    if (!res?.ok) return setPhase({ kind: "error", message: "Chưa gửi được bản ghi. Kiểm tra mạng rồi bấm thử lại.", retry: () => void send(att, rec) });
    const r = (await res.json()) as TurnResult;
    if (r.nextLimit) setLimit(r.nextLimit);
    setStats((s) => ({ turns: s.turns + 1, speed: st.activity === "speed" && r.limitMs ? [...s.speed, { inLimit: r.inLimit, rlMs: r.rlMs }] : s.speed }));
    if (st.activity === "roleplay" && r.transcript) setChat((c) => [...c, { who: "me", text: r.transcript }]);

    // Rescue Cascade tự động: lượt đầu chưa được thì mở thêm một mức gợi ý.
    const struggled = r.rlStatus === "no_response" || r.inLimit === false || r.check?.target === false;
    if (att === 1 && struggled && st.activity !== "vocab") setHintLevel((h) => nextHint(st, h));
    setPhase({ kind: "result", res: r });
  }

  async function playModel() {
    if (!st) return;
    setPhase({ kind: "model" });
    await speak("model", st);
    setAttempt(2);
    setPhase({ kind: "ready" });
  }

  function retry() {
    setAttempt((a) => a + 1);
    setFeedback(null);
    setPhase({ kind: "ready" });
  }

  function next() {
    enterStep(idx + 1);
  }

  async function askFeedback(r: TurnResult) {
    if (!st) return;
    setFeedback({ loading: true, view: null, error: null });
    const res = await fetch(`/api/mode/feedback?turn=${r.turnId}`, { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => null) : null;
    if (!res?.ok || !data?.payload) return setFeedback({ loading: false, view: null, error: data?.error ?? "Chưa lấy được nhận xét." });
    const p = data.payload as FeedbackPayload;
    setFeedback({
      loading: false,
      error: null,
      view: {
        attemptNo: attempt,
        measures: computeMeasures({ thinkMs: r.rlMs, speakMs: null, transcript: r.transcript, keywords: st.keywords ?? [], expectsReason: true }),
        status: "ok",
        mock: p.mock,
        ai: p.feedback,
      },
    });
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

  const hints = st ? st.hints.filter((h) => h.level <= hintLevel) : [];
  const canHint = !!st && st.hints.some((h) => h.level > hintLevel);
  const progress = Math.round((Math.min(idx, steps.length) / steps.length) * 100);

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-2xl content-start gap-6 px-4 pb-10 pt-4 sm:px-6">
      <header className="grid gap-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/student" className="font-bold underline-offset-4 hover:underline">
            Chế độ A · Buổi {sessionNo}
          </Link>
          <p className="text-sm font-bold text-muted">
            Unit {unitNo}: {unitTitle}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ buổi luyện">
          <div className="h-full rounded-full bg-forest transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main id="main" className="grid gap-6">
        {phase.kind === "intro" && (
          <section className="grid gap-5">
            <h1 className="text-3xl font-extrabold tracking-tight">Buổi luyện hôm nay</h1>
            <ul className="grid list-disc gap-2 pl-5 text-lg">
              <li>Khoảng 12–15 phút, đi từ dễ (từ vựng) đến khó (hội thoại).</li>
              <li>Mỗi lần nói: nghe câu hỏi, có tiếng bíp, rồi nói. Nói xong máy tự dừng, hoặc bấm “Xong”.</li>
              <li>Không biết nói gì thì bấm “Gợi ý”. Dùng gợi ý không bị trừ gì.</li>
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
                <BigButton onClick={() => enterStep(idx)}>{idx > 0 ? "Làm tiếp buổi luyện" : "Bắt đầu"}</BigButton>
              </div>
            )}
            {micError && <Alert>{MIC_HELP[micError]}</Alert>}
          </section>
        )}

        {phase.kind === "section" && (
          <section className="grid gap-4 rounded-[2rem] bg-forest px-6 py-8 text-on-forest sm:px-10">
            <h1 className="text-3xl font-extrabold tracking-tight">{SECTION[phase.layer].title}</h1>
            <p className="text-lg text-on-forest-muted">{SECTION[phase.layer].body}</p>
            <button type="button" onClick={() => setPhase({ kind: "ready" })} className="inline-flex min-h-12 w-fit items-center rounded-full bg-on-forest px-6 font-bold text-forest hover:bg-white">
              Bắt đầu
            </button>
          </section>
        )}

        {st && !["intro", "section", "finishing", "done"].includes(phase.kind) && (
          <>
            {st.roleplay && (
              <section className="grid gap-1 rounded-2xl bg-sunken px-5 py-4">
                <p className="font-bold">{st.roleplay.title}</p>
                <p className="text-muted">{st.roleplay.situationVi}</p>
                <p className="text-sm font-bold text-muted">
                  Lượt {st.roleplay.turn}/{st.roleplay.of} · Người nói với em: {st.roleplay.partner}
                </p>
              </section>
            )}

            {st.activity === "roleplay" ? (
              <section aria-live="polite" className="grid gap-3">
                {chat.map((m, i) => (
                  <p
                    key={i}
                    lang="en"
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-lg ${m.who === "partner" ? "bg-surface font-bold shadow-[0_1px_0_var(--line)]" : "justify-self-end bg-forest text-on-forest"}`}
                  >
                    {m.text}
                  </p>
                ))}
                {chat.length === 0 && <p className="text-muted">Nghe người kia nói rồi trả lời.</p>}
              </section>
            ) : (
              <section aria-live="polite" className="grid min-h-40 content-center gap-3 rounded-[2rem] bg-surface px-6 py-8 shadow-[0_1px_0_var(--line)] sm:px-10">
                <p className="text-sm font-bold text-muted">{stepLabel(st, attempt)}</p>
                <p lang={st.activity === "vocab" ? "vi" : "en"} className="text-balance text-[1.6rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
                  {st.prompt}
                </p>
                {st.promptVi && <p className="text-muted">{st.promptVi}</p>}
                {st.activity === "vocab" && attempt === 2 && (
                  <p lang="en" className="text-2xl font-extrabold text-brand-strong">
                    {st.model}
                  </p>
                )}
              </section>
            )}

            {hints.length > 0 && (
              <section aria-label="Gợi ý" className="grid gap-2">
                {hints.map((h) => (
                  <div key={h.level} className="rounded-2xl border-2 border-dashed border-line bg-surface px-4 py-3">
                    <p className="text-sm font-bold text-muted">
                      Gợi ý {h.level} · {h.title}
                    </p>
                    <p lang={h.lang} className="text-lg">
                      {h.body}
                    </p>
                    {h.note && <p className="text-sm text-muted">{h.note}</p>}
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {phase.kind === "ready" && st && (
          <div className="flex flex-wrap items-center gap-3">
            <BigButton onClick={() => void run(attempt)}>
              <MicIcon className="size-5" aria-hidden />
              {readyLabel(st, attempt)}
            </BigButton>
            {canHint && (
              <button type="button" onClick={() => setHintLevel((h) => nextHint(st, h))} className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink/80 bg-surface px-5 font-bold hover:bg-sunken">
                <Lightbulb className="size-5" aria-hidden />
                Gợi ý
              </button>
            )}
          </div>
        )}

        {phase.kind === "listening" && <Status icon={<Volume2 className="size-8" aria-hidden />} label="Nghe" />}
        {phase.kind === "model" && <Status icon={<Volume2 className="size-8" aria-hidden />} label="Nghe máy đọc mẫu" />}

        {phase.kind === "recording" && (
          <div className="grid justify-items-center gap-4">
            {phase.limitMs !== null && <SpeedBar limitMs={phase.limitMs} elapsed={elapsed} onset={onset} />}
            <Status icon={<MicIcon className="size-8" aria-hidden />} label={onset === null ? "Nói đi, máy đang nghe" : "Đang ghi. Nói xong máy tự dừng"} live />
            <Meter level={level} />
            <button type="button" onClick={() => (stopRef.current.current = true)} className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink/80 bg-surface px-6 font-bold hover:bg-sunken">
              <Square className="size-4" aria-hidden />
              Xong
            </button>
          </div>
        )}

        {phase.kind === "sending" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Máy đang nghe lại câu trả lời" />}

        {phase.kind === "result" && st && (
          <section className="grid gap-4">
            <Result st={st} res={phase.res} />
            {st.activity === "expand" && phase.res.transcript && (
              <div className="grid gap-3">
                {feedback ? (
                  <FeedbackPanel view={feedback.view} loading={feedback.loading} error={feedback.error} onRetry={() => void askFeedback(phase.res)} level={2} />
                ) : (
                  <button type="button" onClick={() => void askFeedback(phase.res)} className="inline-flex min-h-12 w-fit items-center rounded-full border-2 border-ink/80 bg-surface px-5 font-bold hover:bg-sunken">
                    Xem AI nhận xét
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {st.activity === "vocab" && attempt === 1 ? (
                <BigButton onClick={() => void playModel()}>
                  <Volume2 className="size-5" aria-hidden />
                  Nghe mẫu rồi nói theo
                </BigButton>
              ) : (
                <BigButton onClick={next}>{idx + 1 < steps.length ? "Tiếp" : "Kết thúc buổi luyện"}</BigButton>
              )}
              {st.activity !== "vocab" && attempt < 2 && (
                <button type="button" onClick={retry} className="inline-flex min-h-12 items-center rounded-full border-2 border-ink/80 bg-surface px-5 font-bold hover:bg-sunken">
                  Nói lại
                </button>
              )}
            </div>
          </section>
        )}

        {phase.kind === "finishing" && <Status icon={<LoaderCircle className="size-8 animate-spin" aria-hidden />} label="Đang lưu buổi luyện" />}

        {phase.kind === "done" && <Done stats={stats} limit={limit} minutes={Math.round(activeRef.current / 60000)} />}

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

const maxHint = (s: PlanStep) => Math.max(0, ...s.hints.map((h) => h.level));
/** Mức gợi ý kế tiếp có nội dung (có bước không đủ cả 4 mức). */
const nextHint = (s: PlanStep, cur: number) => Math.min(...s.hints.filter((h) => h.level > cur).map((h) => h.level), Math.max(cur, maxHint(s)));

function stepLabel(s: PlanStep, attempt: number): string {
  switch (s.activity) {
    case "vocab":
      return attempt === 1 ? "Nói từ tiếng Anh có nghĩa là" : "Nghe mẫu rồi nói theo";
    case "frame":
      return "Nói một câu theo khung";
    case "speed":
      return attempt === 1 ? "Speed Q&A" : "Nói lại, không giới hạn thời gian";
    case "expand":
      return "Trả lời và nêu lý do";
    case "talk":
      return "Nói một đoạn ngắn (3–5 câu)";
    default:
      return "";
  }
}

function readyLabel(s: PlanStep, attempt: number): string {
  if (s.activity === "vocab") return attempt === 1 ? "Sẵn sàng nói" : "Nói theo";
  if (s.say && attempt === 1) return "Nghe và trả lời";
  return attempt === 1 ? "Sẵn sàng nói" : "Nói lại";
}

/** Vạch thời gian Speed Q&A: ngắn dần từ lúc hết tiếng bíp; dừng lại khi trình duyệt nghe thấy học sinh bắt đầu nói. */
function SpeedBar({ limitMs, elapsed, onset }: { limitMs: number; elapsed: number; onset: number | null }) {
  const used = onset ?? elapsed;
  const left = Math.max(0, 1 - used / limitMs);
  const late = used > limitMs;
  return (
    <div className="grid w-full gap-1">
      <div className="flex items-center justify-between text-sm font-bold">
        <span className="inline-flex items-center gap-1">
          <Timer className="size-4" aria-hidden />
          Bắt đầu nói trong {sec(limitMs)}
        </span>
        {onset !== null && <span>{late ? "Hơi trễ một chút" : "Kịp rồi"}</span>}
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className={`h-full rounded-full ${late ? "bg-warn" : "bg-forest"}`} style={{ width: `${left * 100}%` }} />
      </div>
    </div>
  );
}

function Result({ st, res }: { st: PlanStep; res: TurnResult }) {
  const heard = res.transcript || "(máy chưa nghe rõ)";
  return (
    <div className="grid gap-2 rounded-2xl bg-sunken px-5 py-4">
      {st.activity !== "roleplay" && (
        <p>
          <span className="font-bold">Máy nghe được: </span>
          <span lang="en">{heard}</span>
        </p>
      )}
      {res.limitMs !== null && (
        <p className="font-bold">
          {res.inLimit === true
            ? `Kịp giờ: bắt đầu nói sau ${sec(res.rlMs ?? 0)} (giới hạn ${sec(res.limitMs)}).`
            : res.inLimit === false
              ? res.rlStatus === "no_response"
                ? "Chưa nghe thấy câu trả lời. Mở gợi ý rồi nói lại nhé."
                : `Bắt đầu nói sau ${sec(res.rlMs ?? 0)}, hơi quá ${sec(res.limitMs)}. Nói lại không giới hạn để luyện câu này.`
              : "Chưa đo được thời gian lượt này."}
        </p>
      )}
      {res.limitMs === null && res.rlMs !== null && res.rlStatus === "ok" && <p className="text-muted">Bắt đầu nói sau {sec(res.rlMs)}.</p>}
      {res.rlStatus === "no_response" && res.limitMs === null && <p className="font-bold">Chưa nghe thấy câu trả lời. Có thể mở gợi ý rồi nói lại.</p>}
      {st.activity === "vocab" && res.check?.target !== null && (
        <p className="font-bold">{res.check?.target ? "Đúng từ cần nói." : `Từ cần nói là “${st.model}”. Nghe mẫu rồi nói theo nhé.`}</p>
      )}
      {st.activity === "frame" && res.check?.target === false && res.transcript && <p className="font-bold">Thử nói đủ cả khung câu, điền ý của em vào chỗ trống.</p>}
      {st.activity === "expand" && res.check?.reason === false && res.transcript && <p className="font-bold">Thử thêm lý do với “because …”.</p>}
      {(res.check?.keywordsUsed.length ?? 0) > 0 && <p className="text-muted">Từ khóa đã dùng: {res.check!.keywordsUsed.join(", ")}</p>}
      <p className="text-xs text-muted">Máy nghe có thể sai, nhất là khi nói nhỏ hoặc có tiếng ồn.</p>
    </div>
  );
}

function Done({ stats, limit, minutes }: { stats: { speed: { inLimit: boolean | null; rlMs: number | null }[]; turns: number }; limit: number; minutes: number }) {
  const rl = median(stats.speed.map((s) => s.rlMs).filter((x): x is number => x !== null));
  const hits = stats.speed.filter((s) => s.inLimit).length;
  return (
    <section className="grid gap-5 rounded-[2rem] bg-forest px-6 py-10 text-on-forest sm:px-10">
      <CircleCheck className="size-10" aria-hidden />
      <h1 className="text-3xl font-extrabold tracking-tight">Xong buổi luyện hôm nay</h1>
      <ul className="grid gap-1 text-lg text-on-forest-muted">
        <li>Thời gian luyện: khoảng {minutes} phút</li>
        {stats.speed.length > 0 && (
          <li>
            Speed Q&A: kịp giờ {hits}/{stats.speed.length} câu{rl !== null ? `, thời gian bắt đầu nói ở giữa là ${sec(rl)}` : ""}
          </li>
        )}
        <li>Buổi sau bắt đầu Speed Q&A với giới hạn {sec(limit)}</li>
      </ul>
      <Link href="/student" className="inline-flex min-h-12 w-fit items-center rounded-full bg-on-forest px-6 font-bold text-forest">
        Về trang chính
      </Link>
    </section>
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

