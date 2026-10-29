"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Lightbulb,
  LoaderCircle,
  MicOff,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { discardRecording, finishSession, requestFeedback, saveAnswer, type FeedbackView } from "@/app/(student)/student/practice/actions";
import FeedbackPanel, { AttemptCompare } from "@/components/FeedbackPanel";
import type { RunnerQuestion } from "@/lib/practice";
import { nextHintLevel } from "@/lib/speaking/hints";
import { countWords } from "@/lib/speaking/onset";
import { useRecorder } from "@/lib/speaking/useRecorder";

type Phase = "ready" | "reading" | "listening" | "processing" | "review" | "saved" | "done";
type Transcribed = { audioPath: string | null; transcript: string; confidence: number | null; mock: boolean };
/** Một lần trả lời đã lưu của câu đang làm, kèm phản hồi của lần đó. */
type Attempt = { answerId: string; attemptNo: number; view: FeedbackView | null; loading: boolean; error: string | null };
const MAX_ATTEMPTS = 3;

const secs = (ms: number | null) => (ms === null ? "chưa đo được" : `${(ms / 1000).toFixed(1).replace(".", ",")} giây`);

/**
 * Phát câu hỏi: giọng đọc từ máy chủ → giọng có sẵn của trình duyệt (dự phòng) → chỉ chữ.
 * Trả về khi đọc xong, kèm nguồn giọng đã dùng để giao diện báo khi phải dùng giọng dự phòng.
 */
async function playQuestion(q: RunnerQuestion, audioRef: React.RefObject<HTMLAudioElement | null>): Promise<"server" | "browser" | "none"> {
  try {
    const res = await fetch(`/api/tts/${q.id}`);
    if (res.ok) {
      const url = URL.createObjectURL(await res.blob());
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
      return "server";
    }
  } catch {
    // dùng giọng đọc của trình duyệt
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(q.text);
      u.lang = "en-US";
      u.rate = 0.9;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      setTimeout(resolve, 15_000); // phòng trình duyệt không gọi onend
    });
    return "browser";
  }
  return "none";
}

export default function SessionRunner({
  sessionId,
  unitTitle,
  questions,
}: {
  sessionId: string;
  unitTitle: string;
  questions: RunnerQuestion[];
}) {
  const firstOpen = questions.findIndex((q) => !q.answered);
  const [index, setIndex] = useState(firstOpen === -1 ? questions.length : firstOpen);
  const [phase, setPhase] = useState<Phase>(firstOpen === -1 ? "done" : "ready");
  const [hintLevel, setHintLevel] = useState(0);
  const [result, setResult] = useState<Transcribed | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [voiceSource, setVoiceSource] = useState<"server" | "browser" | "none">("server");
  const [timing, setTiming] = useState<{ thinkMs: number | null; speakMs: number | null }>({ thinkMs: null, speakMs: null });
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const rec = useRecorder();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shownAtRef = useRef<string>("");
  const promptEndedRef = useRef<number>(0);
  const stoppingRef = useRef(false);
  const q = questions[index];
  const answeredCount = questions.filter((x, i) => x.answered || i < index).length;

  const finishListening = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    const r = await rec.stop();
    stoppingRef.current = false;
    if (!r) return;
    // Thời gian suy nghĩ: từ lúc đọc xong câu hỏi tới lúc bắt đầu nói (bản ghi bắt đầu ngay khi đọc xong).
    const lag = r.startedAt - promptEndedRef.current;
    const thinkMs = r.onsetMs === null ? null : Math.max(0, Math.round(lag + r.onsetMs));
    const speakMs = r.onsetMs === null ? null : Math.max(0, Math.round(r.durationMs - r.onsetMs));
    setTiming({ thinkMs, speakMs });
    if (r.onsetMs === null) {
      setError("Mình chưa nghe thấy bạn nói. Kiểm tra micro rồi bấm “Nói lại” nhé.");
    }
    setPhase("processing");
    try {
      const res = await fetch(`/api/transcribe?session=${sessionId}&question=${q.id}`, {
        method: "POST",
        headers: { "Content-Type": r.mime },
        body: r.blob,
      });
      const data = await res.json();
      if (!res.ok || typeof data.transcript !== "string") {
        setResult({ audioPath: data.audioPath ?? null, transcript: "", confidence: null, mock: false });
        setError(data.error ?? "Chưa chép lời được. Hãy nói lại.");
      } else if (data.transcript.trim() === "") {
        setResult({ audioPath: data.audioPath, transcript: "", confidence: null, mock: !!data.mock });
        setError("Máy chưa nghe rõ câu trả lời. Hãy nói to và gần micro hơn, rồi bấm “Nói lại”.");
      } else {
        setResult({ audioPath: data.audioPath, transcript: data.transcript, confidence: data.confidence, mock: !!data.mock });
        setDraft(data.transcript);
        setError(null);
      }
    } catch {
      setError("Mất kết nối khi gửi bản ghi. Kiểm tra mạng rồi bấm “Nói lại”.");
      setResult(null);
    }
    setPhase("review");
  }, [rec, sessionId, q]);

  async function begin() {
    setError(null);
    setResult(null);
    setDraft("");
    setHintLevel(0);
    // Xin micro trước khi đọc câu hỏi để hộp thoại xin quyền không làm sai thời gian suy nghĩ.
    if (!(await rec.ensureMic())) return;
    shownAtRef.current = new Date().toISOString();
    setPhase("reading");
    setVoiceSource(await playQuestion(q, audioRef));
    promptEndedRef.current = Date.now();
    const ok = await rec.start(() => void finishListening());
    setPhase(ok ? "listening" : "ready");
  }

  async function retry() {
    if (result?.audioPath) void discardRecording(result.audioPath);
    await begin();
  }

  async function save() {
    if (!q || !result) return;
    setSaving(true);
    const r = await saveAnswer({
      sessionId,
      questionId: q.id,
      shownAt: shownAtRef.current,
      promptEndedAt: new Date(promptEndedRef.current).toISOString(),
      thinkMs: timing.thinkMs,
      speakMs: timing.speakMs,
      transcriptRaw: result.transcript,
      transcriptFinal: draft,
      transcriptConfidence: result.confidence,
      hintLevel,
      audioPath: result.audioPath,
    });
    setSaving(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAttempts((xs) => [...xs, { answerId: r.answerId, attemptNo: r.attemptNo, view: null, loading: true, error: null }]);
    setPhase("saved");
    void loadFeedback(r.answerId);
  }

  async function loadFeedback(answerId: string) {
    const patch = (p: Partial<Attempt>) => setAttempts((xs) => xs.map((a) => (a.answerId === answerId ? { ...a, ...p } : a)));
    patch({ loading: true, error: null });
    try {
      const r = await requestFeedback(answerId);
      patch(r.ok ? { loading: false, view: r.view } : { loading: false, error: r.error });
    } catch {
      patch({ loading: false, error: "Mất kết nối khi lấy nhận xét. Kiểm tra mạng rồi thử lại." });
    }
  }

  function next() {
    setAttempts([]);
    const i = questions.findIndex((x, k) => k > index && !x.answered);
    if (i === -1) {
      setIndex(questions.length);
      setPhase("done");
    } else {
      setIndex(i);
      setPhase("ready");
    }
  }

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const current = attempts.at(-1);
  const previous = attempts.at(-2);
  const busy = current?.loading ?? false;

  if (phase === "done" || !q) {
    return (
      <Shell unitTitle={unitTitle} progress={`${questions.length}/${questions.length}`}>
        <section className="grid gap-5 rounded-[2rem] bg-forest px-6 py-10 text-on-forest sm:px-10">
          <h1 className="text-balance text-4xl font-extrabold tracking-tight">Bạn đã trả lời đủ {questions.length} câu</h1>
          <p className="max-w-prose text-on-forest-muted">
            Các câu trả lời và nhận xét đã được lưu. Xem lại cả buổi và mục tiêu cho buổi sau ở trang tổng kết.
          </p>
          <form action={finishSession}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <button
              type="submit"
              className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-on-forest px-6 font-bold text-forest hover:bg-white"
            >
              Xem tổng kết buổi luyện
              <ArrowRight className="size-5" aria-hidden />
            </button>
          </form>
        </section>
      </Shell>
    );
  }

  return (
    <Shell unitTitle={unitTitle} progress={`Câu ${index + 1}/${questions.length}`} answered={answeredCount} total={questions.length}>
      <div className="grid gap-6">
        {/* Câu hỏi: chữ lớn nhất màn hình. Chưa bắt đầu thì chưa hiện để không tính sai thời gian suy nghĩ. */}
        <section aria-live="polite" className="grid min-h-40 content-center gap-3 rounded-[2rem] bg-surface px-6 py-8 shadow-[0_1px_0_var(--line)] sm:px-10">
          {phase === "ready" ? (
            <p className="text-lg text-muted">
              Bấm nút bên dưới để nghe câu hỏi. Máy bắt đầu nghe ngay sau khi đọc xong, bạn nói khi sẵn sàng.
            </p>
          ) : (
            <p lang="en" className="text-balance text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
              {q.text}
            </p>
          )}
        </section>

        {phase !== "ready" && voiceSource !== "server" && (
          <p className="-mt-3 text-sm text-muted">
            {voiceSource === "browser"
              ? "Đang dùng giọng đọc dự phòng của trình duyệt, nên nghe có thể không tự nhiên."
              : "Thiết bị này không đọc được câu hỏi. Bạn đọc câu hỏi trên màn hình nhé."}
          </p>
        )}

        {phase !== "ready" && phase !== "saved" && (
          <Hints hints={q.hints} level={hintLevel} onOpen={(l) => setHintLevel((c) => nextHintLevel(c, l))} />
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-warn-soft px-4 py-3 font-semibold text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {error}
          </p>
        )}

        <MicHelp status={rec.status} />

        {phase === "review" && result && result.transcript !== "" && (
          <section className="grid gap-4" aria-labelledby="review-title">
            <h2 id="review-title" className="text-xl font-extrabold">
              Máy nghe được
            </h2>
            {result.mock && (
              <p className="w-fit rounded-full bg-warn-soft px-3 py-1 text-sm font-bold text-warn">Dữ liệu mô phỏng, không phải lời bạn nói</p>
            )}
            <label className="grid gap-1.5">
              <span className="text-sm font-bold">Máy nghe chưa đúng? Sửa lại cho khớp với điều bạn đã nói.</span>
              <textarea
                lang="en"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border-2 border-line bg-surface px-4 py-3 text-lg font-medium focus:border-ink focus:outline-none"
              />
            </label>
            <dl className="grid grid-cols-3 divide-x divide-line rounded-2xl border border-line bg-surface text-center">
              <Metric label="Suy nghĩ" value={secs(timing.thinkMs)} />
              <Metric label="Thời lượng nói" value={secs(timing.speakMs)} />
              <Metric label="Số từ" value={String(countWords(draft))} />
            </dl>
            <p className="text-sm text-muted">Thời gian do trình duyệt ước lượng, có thể lệch khi phòng ồn. Chậm không bị trừ điểm.</p>
          </section>
        )}

        {phase === "saved" && (
          <>
            <p role="status" className="flex items-center gap-2 rounded-xl bg-brand-soft px-4 py-3 font-bold text-brand-strong">
              <Check className="size-5" aria-hidden />
              Đã lưu câu trả lời{current && current.attemptNo > 1 ? ` (lần ${current.attemptNo})` : ""}.
            </p>
            {current && (
              <FeedbackPanel view={current.view} loading={current.loading} error={current.error} onRetry={() => void loadFeedback(current.answerId)} />
            )}
            {previous?.view?.status === "ok" && current?.view?.status === "ok" && <AttemptCompare before={previous.view} after={current.view} />}
          </>
        )}

        {/* Vùng hành động ở nửa dưới, nút chính to cho ngón cái. */}
        <div className="grid justify-items-center gap-3 pt-2">
          {phase === "ready" && (
            <RoundButton onClick={begin} label="Nghe câu hỏi" icon={<Volume2 className="size-10" aria-hidden />} busy={rec.status === "requesting"} />
          )}
          {phase === "reading" && <StateBadge icon={<Volume2 className="size-10" aria-hidden />} label="Đang đọc câu hỏi" pulse />}
          {phase === "listening" && (
            <>
              <RoundButton
                onClick={() => void finishListening()}
                label={rec.speaking ? "Xong, gửi câu trả lời" : "Đang nghe, bạn nói khi sẵn sàng"}
                icon={<Square className="size-9 fill-current" aria-hidden />}
                tone="listening"
              />
              <LevelMeter level={rec.level} />
              <button type="button" onClick={() => void playQuestion(q, audioRef)} className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 font-bold text-muted hover:text-ink">
                <Volume2 className="size-4" aria-hidden />
                Nghe lại câu hỏi
              </button>
            </>
          )}
          {phase === "processing" && <StateBadge icon={<LoaderCircle className="size-10 animate-spin" aria-hidden />} label="Đang chép lời" />}
          {phase === "review" && (
            <div className="flex flex-wrap justify-center gap-3">
              <button type="button" onClick={retry} className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-ink/80 bg-surface px-6 font-bold hover:bg-sunken">
                <RotateCcw className="size-5" aria-hidden />
                Nói lại
              </button>
              {result && result.transcript !== "" && (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || draft.trim() === ""}
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-bold text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong disabled:opacity-60"
                >
                  {saving ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Check className="size-5" aria-hidden />}
                  {saving ? "Đang lưu…" : "Lưu câu trả lời"}
                </button>
              )}
            </div>
          )}
          {phase === "saved" && (
            <div className="flex flex-wrap justify-center gap-3">
              {current && current.attemptNo < MAX_ATTEMPTS && (
                <button
                  type="button"
                  onClick={begin}
                  disabled={busy}
                  className="inline-flex min-h-14 items-center gap-2 rounded-full border-2 border-ink/80 bg-surface px-6 font-bold hover:bg-sunken disabled:opacity-60"
                >
                  <RotateCcw className="size-5" aria-hidden />
                  Nói lại câu này (còn {MAX_ATTEMPTS - current.attemptNo} lần)
                </button>
              )}
              <button
                type="button"
                onClick={next}
                disabled={busy}
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-brand px-8 text-lg font-bold text-on-brand shadow-[0_3px_0_var(--brand-strong)] hover:bg-brand-strong disabled:opacity-60"
              >
                {questions.some((x, k) => k > index && !x.answered) ? "Câu tiếp theo" : "Xem kết quả"}
                <ArrowRight className="size-5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  unitTitle,
  progress,
  answered,
  total,
  children,
}: {
  unitTitle: string;
  progress: string;
  answered?: number;
  total?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-2xl content-start gap-6 px-4 pb-10 pt-3 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Link href="/student/practice" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden />
          <span>Thoát</span>
        </Link>
        <p lang="en" className="truncate font-bold">
          {unitTitle}
        </p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-muted">{progress}</p>
      </header>
      {total !== undefined && (
        <div
          role="progressbar"
          aria-label="Số câu đã trả lời"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={answered}
          className="flex gap-1.5"
        >
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i < (answered ?? 0) ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>
      )}
      <main id="main">{children}</main>
    </div>
  );
}

function Hints({ hints, level, onOpen }: { hints: RunnerQuestion["hints"]; level: number; onOpen: (l: number) => void }) {
  const opened = hints.filter((h) => h.level <= level);
  const nextHint = hints.find((h) => h.level > level);
  return (
    <section aria-label="Gợi ý" className="grid gap-3">
      {opened.map((h) => (
        <div key={h.level} className="grid gap-1 rounded-2xl bg-brand-soft px-5 py-4">
          <p className="text-sm font-bold text-brand-strong">
            Gợi ý {h.level}: {h.title}
          </p>
          <p lang={h.lang} className="text-lg font-semibold">
            {h.body}
          </p>
          {h.note && <p className="text-sm text-muted">{h.note}</p>}
        </div>
      ))}
      {nextHint && (
        <button
          type="button"
          onClick={() => onOpen(nextHint.level)}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border-2 border-line bg-surface px-4 font-bold hover:border-ink/40"
        >
          <Lightbulb className="size-4" aria-hidden />
          {opened.length === 0 ? "Bí ý? Xem gợi ý" : `Thêm gợi ý: ${nextHint.title.toLowerCase()}`}
        </button>
      )}
    </section>
  );
}

function RoundButton({
  onClick,
  label,
  icon,
  tone = "brand",
  busy,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  tone?: "brand" | "listening";
  busy?: boolean;
}) {
  return (
    <div className="grid justify-items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-label={label}
        className={`relative grid size-[104px] place-items-center rounded-full transition-transform active:scale-95 disabled:opacity-60 ${
          tone === "listening" ? "bg-forest text-on-forest" : "bg-brand text-on-brand shadow-[0_4px_0_var(--brand-strong)]"
        }`}
      >
        {tone === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-forest/30 motion-reduce:hidden" aria-hidden />}
        {icon}
      </button>
      <p className="text-center font-bold">{label}</p>
    </div>
  );
}

function StateBadge({ icon, label, pulse }: { icon: React.ReactNode; label: string; pulse?: boolean }) {
  return (
    <div className="grid justify-items-center gap-2" role="status">
      <span className={`grid size-[104px] place-items-center rounded-full border-2 border-dashed border-ink/40 bg-sunken ${pulse ? "animate-pulse" : ""}`}>
        {icon}
      </span>
      <p className="font-bold">{label}</p>
    </div>
  );
}

/** Thanh âm lượng trực tiếp: cho học sinh thấy micro đang thu tiếng (thông tin thật, không phải trang trí). */
function LevelMeter({ level }: { level: number }) {
  const bars = 12;
  const active = Math.min(bars, Math.round(Math.sqrt(level) * bars * 2.2));
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={`w-2 rounded-full transition-[height] duration-75 ${i < active ? "bg-forest" : "bg-line"}`} style={{ height: `${30 + ((i * 37) % 70)}%` }} />
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 px-2 py-3">
      <dt className="text-xs font-bold text-muted">{label}</dt>
      <dd className={value === "chưa đo được" ? "text-sm font-semibold text-muted" : "font-extrabold tabular-nums"}>{value}</dd>
    </div>
  );
}

/** Hướng dẫn rõ khi trình duyệt chưa cho dùng micro. */
function MicHelp({ status }: { status: string }) {
  if (!["denied", "nomic", "unsupported", "error"].includes(status)) return null;
  const text =
    status === "denied"
      ? "Trình duyệt đang chặn micro. Bấm vào biểu tượng ổ khóa cạnh địa chỉ trang, chọn Cho phép micro, rồi tải lại trang."
      : status === "nomic"
        ? "Không tìm thấy micro. Hãy cắm tai nghe có micro hoặc dùng điện thoại, rồi thử lại."
        : status === "unsupported"
          ? "Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari bản mới."
          : "Chưa mở được micro. Hãy đóng các ứng dụng khác đang dùng micro rồi thử lại.";
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 font-semibold text-danger">
      <MicOff className="mt-0.5 size-5 shrink-0" aria-hidden />
      {text}
    </p>
  );
}

