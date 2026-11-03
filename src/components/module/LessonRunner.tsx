"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, CircleCheck, CircleDashed, Info, Lightbulb, LoaderCircle, MessageSquareText, RotateCcw, Undo2, X } from "lucide-react";
import { answerQuiz, completeLesson, loadReport, markStep, requestAssess, submitArrange } from "@/app/(student)/student/module/actions";
import type { ModuleReport } from "@/lib/module/report";
import type { VerifiedAssessment } from "@/lib/module/assessCore";
import type { SpeechMeasures } from "@/lib/module/measure";
import { DAY_INFO, type PlannedStep, type StepHint } from "@/lib/module/plan";
import { ERROR_TAGS, type ErrorTag, type ModuleContent } from "@/lib/module/schema";
import { useRecorder, type Recording } from "@/lib/speaking/useRecorder";
import { moduleAudio, playAudio, postAudio } from "./audio";
import { AssessPanel, MeasuredPanel, ReportView, SourceBadge } from "./Panels";
import RecordButton from "./RecordButton";
import HeardWords from "./HeardWords";
import { missedWords } from "@/lib/module/measure";
import ListenButton from "./Listen";
import CountUp from "@/components/CountUp";
import Mascot from "@/components/Mascot";

/** Một lượt đã lưu (để học tiếp đúng chỗ sau khi tải lại trang). */
export type SavedRow = { step: number; turn: number; attemptNo: number; attemptId: string; answer: string | null; reply: string | null; correct: boolean | null };

type Ctx = {
  lessonId: string;
  moduleId: string;
  content: ModuleContent;
  rec: ReturnType<typeof useRecorder>;
  rows: SavedRow[];
};

type TurnResult = {
  attemptId: string;
  attemptNo: number;
  transcript: string;
  measures: SpeechMeasures;
  correct: boolean | null;
  check: { keywordsUsed?: string[]; reason?: "yes" | "no" | "not_required"; heard?: number; used?: boolean; parts?: boolean[] };
  inTarget: boolean | null;
  targetMs: number | null;
  mock?: boolean;
};

const UNCLEAR = "Máy chưa nghe rõ, nên lượt này không được tính. Có thể do micro hoặc phòng ồn: em nói to, gần micro hơn rồi nói lại nhé.";

async function sendTurn(ctx: Ctx, step: number, turn: number, r: Recording, lag: number, hint = 0): Promise<{ ok: TurnResult } | { message: string }> {
  const q = new URLSearchParams({ lesson: ctx.lessonId, step: String(step), turn: String(turn), hint: String(hint), lag: String(Math.round(lag)), onset: r.onsetMs === null ? "" : String(r.onsetMs) });
  const data = await postAudio(`/api/module/turn?${q}`, r);
  if (data.unclear) return { message: UNCLEAR };
  if (data.error) return { message: String(data.error) };
  return { ok: data as unknown as TurnResult };
}

// ---- Khung bài học ----------------------------------------------------------------------------------------------

export default function LessonRunner({
  lessonId,
  moduleId,
  day,
  titleVi,
  notesVi,
  steps,
  content,
  rows,
  startAt,
}: {
  lessonId: string;
  moduleId: string;
  day: number;
  titleVi: string;
  notesVi: string[];
  steps: PlannedStep[];
  content: ModuleContent;
  rows: SavedRow[];
  startAt: number;
}) {
  const rec = useRecorder();
  const [index, setIndex] = useState(startAt);
  const ctx: Ctx = { lessonId, moduleId, content, rec, rows };
  const st = steps[index];
  const openedAt = useRef(0);
  const [elapsed, setElapsed] = useState<number | null>(null);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);
  const next = () => {
    if (index + 1 >= steps.length && openedAt.current) setElapsed(Date.now() - openedAt.current);
    setIndex((i) => i + 1);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  return (
    <div className="mx-auto grid min-h-dvh w-full max-w-2xl grid-cols-1 content-start gap-5 px-4 pb-12 pt-3 sm:px-6">
      {/* Kiểu màn hình bài học Duolingo: nút đóng, thanh tiến độ dày có vệt sáng, số bước. */}
      <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <Link
          href={`/student/module/${moduleId}`}
          aria-label="Thoát"
          className="grid size-11 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <X className="size-7" aria-hidden />
        </Link>
        <div role="progressbar" aria-label="Số bước đã xong" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={index} className="h-4 overflow-hidden rounded-full bg-line">
          <span
            className="relative block h-full rounded-full bg-brand-bright transition-[width] duration-500 after:absolute after:inset-x-2 after:top-1 after:h-1 after:rounded-full after:bg-white/40"
            style={{ width: `${Math.max(index / steps.length, 0.04) * 100}%` }}
          />
        </div>
        <p className="shrink-0 text-sm font-extrabold tabular-nums text-muted">
          {Math.min(index + 1, steps.length)}/{steps.length}
        </p>
      </header>
      <p className="min-w-0 truncate text-sm font-bold text-muted">
        Ngày {day}: {titleVi}
      </p>
      <main id="main" className="grid gap-5">
        {/* Mục tiêu và tiêu chí hoàn thành của bài hôm nay (Lesson). */}
        {index === 0 && (
          <section className="grid gap-1 rounded-2xl border-2 border-line px-5 py-4">
            <p>
              <span className="font-extrabold">Mục tiêu hôm nay: </span>
              {DAY_INFO[day].goalVi}
            </p>
            <p className="text-muted">
              <span className="font-bold">Xong bài khi: </span>
              {DAY_INFO[day].doneVi}
            </p>
          </section>
        )}
        {index === 0 && notesVi.length > 0 && (
          <section className="grid gap-2 rounded-2xl bg-sunken px-5 py-4">
            <h2 className="flex items-center gap-2 font-extrabold">
              <Info className="size-5" aria-hidden />
              Vì sao bài hôm nay như vậy
            </h2>
            <ul className="grid list-disc gap-1 pl-5 text-muted">
              {notesVi.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        )}
        {st ? (
          <StepView key={st.n} st={st} ctx={ctx} onDone={next} />
        ) : (
          <section className="grid justify-items-center gap-6 py-6 text-center">
            <Mascot mood="cheer" className="size-36" />
            <h1 className="text-balance text-3xl font-extrabold">Em đã làm xong bài ngày {day}</h1>
            <p className="max-w-prose text-muted">Bấm hoàn thành để lưu và mở bài ngày tiếp theo. Mỗi ngày học một bài là vừa đủ.</p>
            {/* Ô số liệu kiểu Duolingo nhưng chỉ có số đo thật: không điểm, không XP. */}
            <dl className="grid w-full max-w-md grid-cols-3 gap-3">
              <Tile i={0} label="Số bước" tone="border-gold bg-gold text-ink">
                <CountUp value={steps.length} />
              </Tile>
              <Tile i={1} label="Ngày" tone="border-brand bg-brand text-on-brand">
                <CountUp value={day} format={(n) => `${n}/14`} />
              </Tile>
              {elapsed !== null && (
                <Tile i={2} label="Lần mở này" tone="border-sky-strong bg-sky-strong text-white">
                  <CountUp value={Math.round(elapsed / 1000)} format={(n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`} />
                </Tile>
              )}
            </dl>
            <form action={completeLesson} className="w-full max-w-md">
              <input type="hidden" name="lessonId" value={lessonId} />
              <button type="submit" className="btn-3d inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-extrabold text-on-brand">
                Hoàn thành bài hôm nay
                <ArrowRight className="size-5" aria-hidden />
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function label(st: PlannedStep): string {
  switch (st.t) {
    case "learn_word":
      return "Từ mới";
    case "recall_word":
      return st.review ? "Ôn lại từ (đến hạn ôn)" : "Nhớ lại từ";
    case "known_words":
      return "Từ em đã biết";
    case "card":
      return st.ref.startsWith("err:") ? "Ôn lỗi hay gặp" : "Kiến thức";
    case "say":
      return "Nghe và nói theo";
    case "quiz":
      return { entry: "Bài đầu module: kiến thức", check1: "Kiểm tra kiến thức", check2: "Kiểm tra nhỏ", final: "Đánh giá cuối: kiến thức", practice: "Luyện tập", review: "Ôn lỗi hay gặp" }[st.set];
    case "use_word":
      return "Từ vựng thành câu";
    case "arrange":
      return "Xếp câu";
    case "expand":
      return "Mở rộng câu";
    case "speak":
      return st.test ? "Nói độc lập, không gợi ý" : st.retry ? "Sửa lỗi và nói lại" : st.targetMs ? "Speed Q&A" : "Trả lời câu hỏi";
    case "roleplay":
      return st.test ? "Đánh giá cuối: Micro-Roleplay" : "Micro-Roleplay";
    case "report":
      return "Kết quả";
  }
}

function StepView({ st, ctx, onDone }: { st: PlannedStep; ctx: Ctx; onDone: () => void }) {
  return (
    <section className="rise-in grid gap-5">
      <p className={`w-fit rounded-full px-3 py-1 text-sm font-extrabold ${st.t === "learn_word" ? "bg-berry-soft text-berry" : "bg-sky-soft text-sky-strong"}`}>{label(st)}</p>
      {st.t === "learn_word" && <LearnWord st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "recall_word" && <RecallWord st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "known_words" && <KnownWords st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "card" && <Card st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "say" && <Say st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "quiz" && <Quiz st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "use_word" && <UseWord st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "arrange" && <Arrange st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "expand" && <Expand st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "speak" && <Speak st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "roleplay" && <Roleplay st={st} ctx={ctx} onDone={onDone} />}
      {st.t === "report" && <Report st={st} ctx={ctx} onDone={onDone} />}
    </section>
  );
}

type P<T extends PlannedStep["t"]> = { st: Extract<PlannedStep, { t: T }>; ctx: Ctx; onDone: () => void };

// ---- Nút dùng chung -------------------------------------------------------------------------------------------------

function NextButton({ onClick, children = "Tiếp tục", disabled }: { onClick: () => void; children?: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="btn-3d inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-8 text-lg font-extrabold text-on-brand disabled:opacity-60 sm:w-auto sm:min-w-56"
    >
      {children}
      <ArrowRight className="size-5" aria-hidden />
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

function Verdict({ ok, yes, no }: { ok: boolean | null; yes: string; no: string }) {
  return (
    <p role="status" className={`sheet-up flex items-start gap-3 rounded-2xl px-5 py-4 text-lg font-extrabold ${ok ? "bg-brand-soft text-brand-strong" : "bg-warn-soft text-warn"}`}>
      {ok ? <CircleCheck className="mt-0.5 size-6 shrink-0" aria-hidden /> : <CircleDashed className="mt-0.5 size-6 shrink-0" aria-hidden />}
      {ok ? yes : no}
    </p>
  );
}

/** Ghi nhận bỏ qua phần nói (không có micro...). Vẫn đi tiếp được, thầy cô thấy là "bỏ qua". */
function SkipLink({ st, ctx, onDone, children = "Không nói được lúc này? Bỏ qua phần nói" }: { st: PlannedStep; ctx: Ctx; onDone: () => void; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await markStep({ lessonId: ctx.lessonId, step: st.n, skipped: true });
        onDone();
      }}
      className="min-h-11 w-fit text-sm font-semibold text-muted underline underline-offset-4 hover:text-ink"
    >
      {children}
    </button>
  );
}

/**
 * Một chỗ nói có tối đa `max` lần: nút nói, kết quả lần gần nhất, nói lại, tiếp tục.
 * Máy nghe không rõ thì không tính lần đó.
 */
function SpeakBox({
  st,
  ctx,
  turn = 0,
  max = 3,
  hint = 0,
  before,
  label,
  targetMs,
  initial = 0,
  onSaved,
  render,
}: {
  st: PlannedStep;
  ctx: Ctx;
  turn?: number;
  max?: number;
  hint?: number;
  before?: () => Promise<unknown>;
  label?: string;
  targetMs?: number | null;
  initial?: number;
  onSaved?: (r: TurnResult) => void;
  render: (r: TurnResult) => React.ReactNode;
}) {
  const [count, setCount] = useState(initial);
  const [last, setLast] = useState<TurnResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="grid gap-4">
      {msg && <Alert>{msg}</Alert>}
      {last && render(last)}
      {count < max && (
        <RecordButton
          rec={ctx.rec}
          before={before}
          targetMs={targetMs}
          label={count === 0 ? (label ?? "Bấm để nói") : `Nói lại (còn ${max - count} lần)`}
          onRecorded={async (r, lag) => {
            const res = await sendTurn(ctx, st.n, turn, r, lag, hint);
            if ("message" in res) return setMsg(res.message);
            setMsg(null);
            setLast(res.ok);
            setCount(res.ok.attemptNo);
            onSaved?.(res.ok);
          }}
        />
      )}
    </div>
  );
}

/** Giọng đọc mẫu của máy chủ cho từ có trong Kho từ vựng (so khớp không phân biệt hoa thường); từ khác dùng giọng trình duyệt. */
const wordAudio = (ctx: Ctx) => (w: string) => {
  const v = ctx.content.vocab.find((x) => x.en.toLowerCase() === w.toLowerCase());
  return v ? moduleAudio(ctx.moduleId, v.id) : null;
};

const savedTurns = (ctx: Ctx, step: number, turn: number) => ctx.rows.filter((r) => r.step === step && r.turn === turn).length;

// ---- Nền tảng: từ vựng, phát âm, ngữ pháp ---------------------------------------------------------------------------

function WordCard({ ctx, id }: { ctx: Ctx; id: string }) {
  const v = ctx.content.vocab.find((x) => x.id === id);
  if (!v) return null;
  return (
    <div className="grid gap-3 rounded-2xl bg-surface px-6 py-6 shadow-card">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p lang="en" className="text-4xl font-extrabold tracking-tight">
          {v.en}
        </p>
        <p className="text-lg text-muted">
          {v.ipa} <span className="text-sm">({v.pos})</span>
        </p>
      </div>
      <p className="text-xl font-semibold">{v.vi}</p>
      <p lang="en" className="text-lg">
        {v.example}
      </p>
      {v.collocations.length > 0 && (
        <p className="text-muted">
          Hay đi với:{" "}
          <span lang="en" className="font-semibold text-ink">
            {v.collocations.join(" · ")}
          </span>
        </p>
      )}
      {(v.synonyms.length > 0 || v.antonyms.length > 0) && (
        <p className="text-muted">
          {v.synonyms.length > 0 && (
            <>
              Gần nghĩa: <span lang="en" className="font-semibold text-ink">{v.synonyms.join(", ")}</span>
            </>
          )}
          {v.synonyms.length > 0 && v.antonyms.length > 0 && " · "}
          {v.antonyms.length > 0 && (
            <>
              Trái nghĩa: <span lang="en" className="font-semibold text-ink">{v.antonyms.join(", ")}</span>
            </>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <ListenButton url={moduleAudio(ctx.moduleId, v.id)} text={v.en}>
          Nghe từ
        </ListenButton>
        <ListenButton url={moduleAudio(ctx.moduleId, `${v.id}.ex`)} text={v.example}>
          Nghe câu ví dụ
        </ListenButton>
        <SourceBadge src={v.src} />
        {v.ipaFrom === "dictionary" && <span className="text-xs text-muted">Phiên âm tra từ điển (SGK không có trong Glossary)</span>}
      </div>
    </div>
  );
}

function LearnWord({ st, ctx, onDone }: P<"learn_word">) {
  const v = ctx.content.vocab.find((x) => x.id === st.ref)!;
  const initial = savedTurns(ctx, st.n, 0);
  const [done, setDone] = useState(initial > 0);
  return (
    <>
      <WordCard ctx={ctx} id={st.ref} />
      <p className="font-semibold">Nghe mẫu, rồi nói to từ này.</p>
      <SpeakBox
        st={st}
        ctx={ctx}
        initial={initial}
        label="Nói từ này"
        onSaved={() => setDone(true)}
        render={(r) => <Verdict ok={r.correct} yes={`Máy nghe ra “${v.en}”.`} no={`Máy nghe thành “${r.transcript}”. Nghe mẫu lại, đọc chậm và rõ từng âm rồi nói lại nhé.`} />}
      />
      <div className="flex flex-wrap items-center gap-4">
        {done && <NextButton onClick={onDone} />}
        {!done && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
      </div>
    </>
  );
}

function blank(sentence: string, phrase: string) {
  const re = new RegExp(phrase.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\w*").join("\\s+"), "i");
  return re.test(sentence) ? sentence.replace(re, "_____") : sentence;
}

function RecallWord({ st, ctx, onDone }: P<"recall_word">) {
  const v = ctx.content.vocab.find((x) => x.id === st.ref)!;
  const initial = savedTurns(ctx, st.n, 0);
  const [result, setResult] = useState<TurnResult | null>(null);
  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-surface px-6 py-6 shadow-card">
        <p className="text-muted">Nói từ tiếng Anh có nghĩa:</p>
        <p className="text-3xl font-extrabold tracking-tight">{v.vi}</p>
        <p lang="en" className="text-lg">
          {blank(v.example, v.en)}
        </p>
      </div>
      <SpeakBox
        st={st}
        ctx={ctx}
        initial={initial}
        max={2}
        label="Nói từ đó"
        onSaved={(r) => {
          setResult(r);
          void playAudio(moduleAudio(ctx.moduleId, v.id), v.en);
        }}
        render={(r) => <Verdict ok={r.correct} yes={`Đúng rồi: ${v.en} ${v.ipa}.`} no={`Đáp án: ${v.en} ${v.ipa}. Máy nghe em nói “${r.transcript}”.`} />}
      />
      <div className="flex flex-wrap items-center gap-4">
        {(result || initial > 0) && <NextButton onClick={onDone} />}
        {!result && initial === 0 && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
      </div>
    </>
  );
}

function KnownWords({ st, ctx, onDone }: P<"known_words">) {
  const words = st.refs.map((id) => ctx.content.vocab.find((v) => v.id === id)!).filter(Boolean);
  return (
    <>
      <h2 className="text-2xl font-extrabold tracking-tight">Em đã biết các từ này từ bài đầu module</h2>
      <ul className="divide-y divide-line border-y border-line">
        {words.map((v) => (
          <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span>
              <span lang="en" className="font-bold">
                {v.en}
              </span>{" "}
              <span className="text-muted">
                {v.ipa}: {v.vi}
              </span>
            </span>
            <ListenButton url={moduleAudio(ctx.moduleId, v.id)} text={v.en}>
              Nghe
            </ListenButton>
          </li>
        ))}
      </ul>
      <MarkAndNext st={st} ctx={ctx} onDone={onDone} />
    </>
  );
}

function MarkAndNext({ st, ctx, onDone, children = "Đã hiểu, tiếp tục" }: { st: PlannedStep; ctx: Ctx; onDone: () => void; children?: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  return (
    <NextButton
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await markStep({ lessonId: ctx.lessonId, step: st.n, skipped: false });
        onDone();
      }}
    >
      {children}
    </NextButton>
  );
}

function Card({ st, ctx, onDone }: P<"card">) {
  const c = ctx.content;
  let body: React.ReactNode = null;
  if (st.ref === "expressions") {
    body = (
      <>
        <h2 className="text-2xl font-extrabold tracking-tight">Cụm câu hay dùng</h2>
        <ul className="divide-y divide-line border-y border-line">
          {c.expressions.map((e) => (
            <li key={e.id} className="grid gap-1 py-3">
              <p lang="en" className="text-lg font-bold">
                {e.en}
              </p>
              <p className="text-muted">
                {e.vi}. {e.useVi}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span lang="en">{e.example}</span>
                <ListenButton url={moduleAudio(ctx.moduleId, e.id)} text={e.example}>
                  Nghe
                </ListenButton>
                <SourceBadge src={e.src} />
              </div>
            </li>
          ))}
        </ul>
      </>
    );
  } else if (st.ref.startsWith("err:")) {
    const tag = st.ref.slice(4) as ErrorTag;
    const g = c.grammar.find((x) => x.errorTag === tag);
    body = (
      <>
        <h2 className="text-2xl font-extrabold tracking-tight">Lỗi em hay gặp: {ERROR_TAGS[tag]}</h2>
        <p className="text-muted">Máy ghi lại lỗi này nhiều lần trong các câu em nói hoặc bài em làm, nên mình ôn riêng một chút.</p>
        {g ? <GrammarBody g={g} /> : <p>Khi nói, để ý phần này và tự kiểm tra lại câu của mình trước khi nói tiếp.</p>}
      </>
    );
  } else if (st.ref.startsWith("g")) {
    const g = c.grammar.find((x) => x.id === st.ref)!;
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight">{g.nameVi}</h2>
          <SourceBadge src={g.src} />
        </div>
        <p lang="en" className="text-muted">
          {g.name}
        </p>
        <GrammarBody g={g} />
      </>
    );
  } else if (st.ref.startsWith("p")) {
    const p = c.pronunciation.find((x) => x.id === st.ref)!;
    body = (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-extrabold tracking-tight">Phát âm: {p.focus}</h2>
          <SourceBadge src={p.src} />
        </div>
        <p>{p.tipVi}</p>
        <div className="flex flex-wrap gap-2">
          {p.words.map((w) => (
            <span key={w} lang="en" className="rounded-full border border-line bg-surface px-4 py-2 font-bold">
              {w}
            </span>
          ))}
        </div>
        <ListenButton url={moduleAudio(ctx.moduleId, `${p.id}.w`)} text={p.words.join(", ")}>
          Nghe các từ
        </ListenButton>
      </>
    );
  }
  return (
    <>
      <div className="grid gap-4">{body}</div>
      <MarkAndNext st={st} ctx={ctx} onDone={onDone} />
    </>
  );
}

function GrammarBody({ g }: { g: ModuleContent["grammar"][number] }) {
  return (
    <div className="grid gap-4">
      <p>{g.explainVi}</p>
      <p className="rounded-xl bg-sunken px-4 py-3 font-semibold">{g.formula}</p>
      <div className="grid gap-1">
        <p className="font-bold">Câu đúng</p>
        <ul className="grid gap-1">
          {g.examples.map((e) => (
            <li key={e} lang="en" className="flex gap-2">
              <Check className="mt-1 size-4 shrink-0 text-brand-strong" aria-hidden />
              {e}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-2">
        <p className="font-bold">Câu sai thường gặp</p>
        {g.wrong.map((w) => (
          <div key={w.sentence} className="grid gap-0.5 rounded-xl border border-line px-4 py-3">
            <p lang="en">
              <s>{w.sentence}</s>
            </p>
            <p lang="en" className="font-semibold">
              → {w.fix}
            </p>
            <p className="text-sm text-muted">{w.whyVi}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Say({ st, ctx, onDone }: P<"say">) {
  const initial = savedTurns(ctx, st.n, 0);
  const [done, setDone] = useState(initial > 0);
  const key = st.ref;
  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-surface px-6 py-6 shadow-card">
        <p lang="en" className="text-2xl font-extrabold leading-snug tracking-tight">
          {st.text}
        </p>
        <ListenButton url={moduleAudio(ctx.moduleId, key)} text={st.text}>
          Nghe mẫu
        </ListenButton>
      </div>
      <p className="font-semibold">Nghe mẫu, rồi đọc to cả câu.</p>
      <SpeakBox
        st={st}
        ctx={ctx}
        initial={initial}
        label="Đọc to câu này"
        onSaved={() => setDone(true)}
        render={(r) => (
          <>
            <Verdict ok={r.correct} yes={`Máy nghe ra gần đủ câu (${Math.round((r.check.heard ?? 0) * 100)}% số từ).`} no={`Máy nghe ra ${Math.round((r.check.heard ?? 0) * 100)}% số từ: “${r.transcript}”. Đọc chậm, rõ từng từ rồi thử lại.`} />
            <HeardWords transcript={r.transcript} lowWords={r.measures.lowWords} missed={missedWords(r.transcript, st.text)} audioFor={wordAudio(ctx)} />
          </>
        )}
      />
      <div className="flex flex-wrap items-center gap-4">
        {done && <NextButton onClick={onDone} />}
        {!done && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
      </div>
    </>
  );
}

function Quiz({ st, ctx, onDone }: P<"quiz">) {
  const prev = ctx.rows.find((r) => r.step === st.n && r.turn === 0);
  const [chosen, setChosen] = useState<number | null>(prev ? st.q.options.indexOf(prev.answer ?? "") : null);
  const [result, setResult] = useState<{ correct: boolean; answer: number; explainVi: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answered = result !== null || !!prev;
  return (
    <>
      <h2 lang={st.q.promptLang} className="text-balance text-2xl font-extrabold leading-snug tracking-tight">
        {st.q.prompt}
      </h2>
      <div className="grid gap-2" role="group" aria-label="Các lựa chọn">
        {st.q.options.map((o, i) => {
          const isAnswer = result && i === result.answer;
          const isWrongPick = result && chosen === i && !result.correct;
          return (
            <button
              key={o}
              type="button"
              lang={st.q.optionsLang}
              disabled={answered || busy}
              onClick={async () => {
                setChosen(i);
                setBusy(true);
                const r = await answerQuiz({ lessonId: ctx.lessonId, step: st.n, choice: i });
                setBusy(false);
                if (r.ok) setResult(r);
                else setError(r.error);
              }}
              className={`option-card flex min-h-14 items-center justify-between gap-3 px-5 py-3 text-left text-lg font-bold ${
                isAnswer ? "border-brand! bg-brand-soft! text-brand-strong" : isWrongPick ? "bg-sunken! text-muted" : chosen === i ? "border-sky! bg-sky-soft! text-sky-strong" : ""
              }`}
            >
              {o}
              {isAnswer && <CircleCheck className="size-5 shrink-0 text-brand-strong" aria-label="Đáp án đúng" />}
              {isWrongPick && <span className="shrink-0 text-sm font-bold text-muted">Em chọn</span>}
            </button>
          );
        })}
      </div>
      {error && <Alert>{error}</Alert>}
      {result && (
        <Verdict ok={result.correct} yes={`Đúng rồi. ${result.explainVi}`} no={`Chưa đúng. ${result.explainVi}`} />
      )}
      {prev && !result && <p className="text-muted">Em đã trả lời câu này rồi.</p>}
      {answered && <NextButton onClick={onDone} />}
    </>
  );
}

// ---- Nói có hướng dẫn: Pyramid Scaffolding ---------------------------------------------------------------------------

function UseWord({ st, ctx, onDone }: P<"use_word">) {
  const v = ctx.content.vocab.find((x) => x.id === st.ref)!;
  const initial = savedTurns(ctx, st.n, 0);
  const [done, setDone] = useState(initial > 0);
  const [showEx, setShowEx] = useState(false);
  return (
    <>
      <div className="grid gap-2 rounded-2xl bg-surface px-6 py-6 shadow-card">
        <p className="text-muted">Nói một câu hoàn chỉnh có dùng cụm:</p>
        <p lang="en" className="text-3xl font-extrabold tracking-tight">
          {st.phrase}
        </p>
        <p className="text-muted">
          {v.en}: {v.vi}
        </p>
      </div>
      {showEx ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3">
          Ví dụ: <span lang="en" className="font-semibold">{v.example}</span> Nói câu của riêng em nhé.
        </p>
      ) : (
        <button type="button" onClick={() => setShowEx(true)} className="option-card inline-flex min-h-11 w-fit items-center gap-2 px-4 font-extrabold text-sky-strong">
          <Lightbulb className="size-4" aria-hidden />
          Bí ý? Xem một câu ví dụ
        </button>
      )}
      <SpeakBox
        st={st}
        ctx={ctx}
        initial={initial}
        hint={showEx ? 4 : 0}
        label="Nói câu của em"
        onSaved={() => setDone(true)}
        render={(r) => (
          <Verdict
            ok={r.correct}
            yes={`Câu của em có dùng “${st.phrase}”: “${r.transcript}”.`}
            no={r.check.used ? `Câu còn ngắn: “${r.transcript}”. Thử nói thành câu đủ chủ ngữ và động từ.` : `Máy chưa nghe thấy “${st.phrase}” trong câu: “${r.transcript}”.`}
          />
        )}
      />
      <div className="flex flex-wrap items-center gap-4">
        {done && <NextButton onClick={onDone} />}
        {!done && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
      </div>
    </>
  );
}

function Arrange({ st, ctx, onDone }: P<"arrange">) {
  const b = ctx.content.build.find((x) => x.id === st.ref)!;
  const orderedBefore = ctx.rows.some((r) => r.step === st.n && r.turn === 0 && r.correct);
  const spokenBefore = savedTurns(ctx, st.n, 1);
  const [picked, setPicked] = useState<string[]>(orderedBefore ? b.chunks : []);
  const [state, setState] = useState<"order" | "wrong" | "right">(orderedBefore ? "right" : "order");
  const [tries, setTries] = useState(ctx.rows.filter((r) => r.step === st.n && r.turn === 0).length);
  const [spoken, setSpoken] = useState(spokenBefore > 0);
  const left = st.shuffled.filter((c) => !picked.includes(c));
  const sentence = b.chunks.join(" ");
  return (
    <>
      <div className="grid gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Xếp các mảnh thành câu đúng</h2>
        <p className="text-muted">Nghĩa: {b.vi}</p>
      </div>
      <div className="min-h-20 rounded-2xl border border-dashed border-line-strong bg-surface px-4 py-3" aria-live="polite">
        {picked.length === 0 ? (
          <p className="text-muted">Bấm các mảnh bên dưới theo thứ tự.</p>
        ) : (
          <p lang="en" className="flex flex-wrap gap-2">
            {picked.map((c) => (
              <button
                key={c}
                type="button"
                disabled={state === "right"}
                onClick={() => setPicked((xs) => xs.filter((x) => x !== c))}
                className="min-h-11 rounded-xl bg-brand-soft px-3 py-2 text-lg font-semibold"
              >
                {c}
              </button>
            ))}
          </p>
        )}
      </div>
      {state !== "right" && (
        <div lang="en" className="flex flex-wrap gap-2">
          {left.map((c) => (
            <button key={c} type="button" onClick={() => setPicked((xs) => [...xs, c])} className="option-card pop-in min-h-11 px-3 py-2 text-lg font-bold">
              {c}
            </button>
          ))}
        </div>
      )}
      {state === "wrong" && <Verdict ok={false} yes="" no={tries >= 2 ? `Câu đúng là: “${sentence}”. Xếp lại theo câu này nhé.` : "Chưa đúng thứ tự. Bấm vào mảnh đã chọn để bỏ ra, rồi xếp lại."} />}
      {state !== "right" && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={left.length > 0}
            onClick={async () => {
              const r = await submitArrange({ lessonId: ctx.lessonId, step: st.n, order: picked });
              if (!r.ok) return;
              setTries((n) => n + 1);
              setState(r.correct ? "right" : "wrong");
            }}
            className="btn-3d inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand px-6 font-extrabold text-on-brand disabled:bg-line disabled:text-muted disabled:shadow-none"
          >
            <Check className="size-5" aria-hidden />
            Kiểm tra
          </button>
          <button type="button" onClick={() => setPicked([])} className="option-card inline-flex min-h-12 items-center gap-2 px-5 font-extrabold text-sky-strong">
            <Undo2 className="size-5" aria-hidden />
            Xếp lại
          </button>
        </div>
      )}
      {state === "right" && (
        <>
          <Verdict ok yes={`Đúng rồi: “${sentence}”. Giờ đọc to cả câu.`} no="" />
          <ListenButton url={moduleAudio(ctx.moduleId, b.id)} text={sentence}>
            Nghe mẫu
          </ListenButton>
          <SpeakBox
            st={st}
            ctx={ctx}
            turn={1}
            initial={spokenBefore}
            label="Đọc to câu đã xếp"
            onSaved={() => setSpoken(true)}
            render={(r) => <Verdict ok={r.correct} yes="Máy nghe ra gần đủ câu." no={`Máy nghe thành “${r.transcript}”. Thử đọc lại rõ hơn.`} />}
          />
          <div className="flex flex-wrap items-center gap-4">
            {spoken && <NextButton onClick={onDone} />}
            {!spoken && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
          </div>
        </>
      )}
    </>
  );
}

function Expand({ st, ctx, onDone }: P<"expand">) {
  const x = ctx.content.expand.find((e) => e.id === st.ref)!;
  const savedStages = ctx.rows.filter((r) => r.step === st.n && r.turn < 10).map((r) => r.turn);
  const [stage, setStage] = useState(savedStages.length ? Math.min(x.steps.length + 1, Math.max(...savedStages) + 1) : 0);
  const [heard, setHeard] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const finished = stage > x.steps.length;
  const ask = stage >= 1 && !finished ? x.steps[stage - 1] : null;
  return (
    <>
      <div className="grid gap-1">
        <h2 className="text-2xl font-extrabold tracking-tight">Từ câu ngắn thành câu dài</h2>
        <p className="text-muted">Mỗi bước thêm một ý. Nói lại CẢ CÂU, có thêm ý mới.</p>
      </div>
      <ol className="grid gap-2">
        <li className="rounded-xl bg-surface px-4 py-3 shadow-card">
          <span className="text-sm font-bold text-muted">Câu ngắn</span>
          <p lang="en" className="text-xl font-bold">
            {x.base}
          </p>
        </li>
        {x.steps.slice(0, Math.max(0, stage - 1)).map((s) => (
          <li key={s.ask} className="rounded-xl bg-surface px-4 py-3">
            <span className="text-sm font-bold text-muted">
              <span lang="en">{s.ask}</span> → đã thêm
            </span>
            <p lang="en" className="font-semibold">
              + {s.add}
            </p>
          </li>
        ))}
      </ol>
      {heard && <p className="text-muted">Máy nghe em nói: “<span lang="en">{heard}</span>”</p>}
      {!finished && (
        <>
          <div className="grid gap-1 rounded-2xl bg-brand-soft px-5 py-4">
            {ask ? (
              <>
                <p lang="en" className="text-2xl font-extrabold">
                  {ask.ask}
                </p>
                <p className="text-muted">{ask.askVi}</p>
                {hint ? (
                  <p>
                    Gợi ý: <span lang="en" className="font-bold">{ask.add}</span>
                  </p>
                ) : (
                  <button type="button" onClick={() => setHint(true)} className="inline-flex min-h-11 w-fit items-center gap-2 font-bold text-brand-strong">
                    <Lightbulb className="size-4" aria-hidden />
                    Xem gợi ý
                  </button>
                )}
              </>
            ) : (
              <p className="text-lg font-bold">Đọc to câu ngắn trước.</p>
            )}
          </div>
          <SpeakBox
            key={stage}
            st={st}
            ctx={ctx}
            turn={stage}
            hint={hint ? 2 : 0}
            label={stage === 0 ? "Đọc câu ngắn" : "Nói cả câu dài hơn"}
            onSaved={(r) => {
              setHeard(r.transcript);
              if (r.correct || r.attemptNo >= 3) {
                setStage((s) => s + 1);
                setHint(false);
              }
            }}
            render={(r) => (r.correct ? null : <Verdict ok={false} yes="" no={`Máy chưa nghe thấy đủ ý mới trong câu. ${r.attemptNo < 3 ? "Thử lại, nhớ nói cả câu." : ""}`} />)}
          />
        </>
      )}
      {finished && (
        <>
          <div className="grid gap-2 rounded-2xl bg-surface px-5 py-5 shadow-card">
            <p className="text-sm font-bold text-muted">Câu đầy đủ mẫu</p>
            <p lang="en" className="text-xl font-bold">
              {x.full}
            </p>
            <ListenButton url={moduleAudio(ctx.moduleId, x.id)} text={x.full}>
              Nghe câu mẫu
            </ListenButton>
          </div>
          <NextButton onClick={onDone} />
        </>
      )}
      {!finished && stage === 0 && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
    </>
  );
}

// ---- Trả lời câu hỏi: Rescue Cascade, Speed Q&A, sửa lỗi và nói lại, bài kiểm tra ------------------------------------

function Hints({ hints, level, onOpen }: { hints: StepHint[]; level: number; onOpen: (l: number) => void }) {
  const opened = hints.filter((h) => h.level <= level);
  const nextHint = hints.find((h) => h.level > level);
  if (hints.length === 0) return null;
  return (
    <div className="grid gap-2">
      {opened.map((h) => (
        <div key={h.level} className="grid gap-0.5 rounded-2xl bg-brand-soft px-5 py-3">
          <p className="text-sm font-bold text-brand-strong">Gợi ý: {h.title}</p>
          <p lang={h.lang} className="text-lg font-semibold">
            {h.body}
          </p>
          {h.note && <p className="text-sm text-muted">{h.note}</p>}
        </div>
      ))}
      {nextHint && (
        <button type="button" onClick={() => onOpen(nextHint.level)} className="option-card inline-flex min-h-11 w-fit items-center gap-2 px-4 font-extrabold text-sky-strong">
          <Lightbulb className="size-4" aria-hidden />
          {opened.length === 0 ? "Bí ý? Xem gợi ý" : `Thêm gợi ý: ${nextHint.title.toLowerCase()}`}
        </button>
      )}
    </div>
  );
}

function useAssess() {
  const [state, setState] = useState<{ loading: boolean; a: VerifiedAssessment | null; mock: boolean; error: string | null; asked: boolean }>({ loading: false, a: null, mock: false, error: null, asked: false });
  async function run(attemptId: string) {
    setState((s) => ({ ...s, loading: true, error: null, asked: true }));
    try {
      const r = await requestAssess(attemptId);
      setState(r.ok ? { loading: false, a: r.assessment, mock: r.mock, error: null, asked: true } : { loading: false, a: null, mock: false, error: r.error, asked: true });
    } catch {
      setState({ loading: false, a: null, mock: false, error: "Mất kết nối khi lấy nhận xét. Em vẫn đi tiếp được.", asked: true });
    }
  }
  return { ...state, run };
}

function AssessArea({ s, onAsk }: { s: ReturnType<typeof useAssess>; onAsk?: () => void }) {
  if (s.loading)
    return (
      <p role="status" className="flex items-center gap-2 rounded-2xl bg-sunken px-5 py-4 font-bold">
        <LoaderCircle className="size-5 animate-spin" aria-hidden />
        AI đang đọc câu trả lời…
      </p>
    );
  if (s.a) return <AssessPanel a={s.a} mock={s.mock} />;
  if (s.error) return <Alert>{s.error}</Alert>;
  if (onAsk && !s.asked)
    return (
      <button type="button" onClick={onAsk} className="option-card inline-flex min-h-12 w-fit items-center gap-2 px-6 font-extrabold text-sky-strong">
        <MessageSquareText className="size-5" aria-hidden />
        Xem nhận xét của AI
      </button>
    );
  return null;
}

function questionAudio(ctx: Ctx, st: Extract<PlannedStep, { t: "speak" }>, retry: boolean) {
  if (retry && st.retry) return moduleAudio(ctx.moduleId, st.retry.ref);
  return st.qid ? `/api/tts/${st.qid}` : moduleAudio(ctx.moduleId, st.ref);
}

function Speak({ st, ctx, onDone }: P<"speak">) {
  const initial = savedTurns(ctx, st.n, 0);
  const [shown, setShown] = useState(initial > 0);
  const [hintLevel, setHintLevel] = useState(0);
  const [result, setResult] = useState<TurnResult | null>(null);
  const [rescue, setRescue] = useState<string | null>(null);
  const a1 = useAssess();
  const [retryResult, setRetryResult] = useState<TurnResult | null>(null);
  const a2 = useAssess();
  const retryDone = ctx.rows.some((r) => r.step === st.n && r.turn === 1) || retryResult !== null;
  const answered = initial > 0 || result !== null;
  // Speed Q&A: gợi ý chỉ mở sau lượt đầu, để lượt đầu đo đúng phản xạ.
  const hintsVisible = shown && !st.test && (!st.targetMs || answered);
  const canGo = answered && (!st.retry || retryDone);
  // Phần nói lại hiện sau khi có nhận xét của AI (hoặc AI lỗi), hoặc ngay khi quay lại một câu đã trả lời trước đó.
  const showRetry = !!st.retry && !retryDone ? (result ? !!(a1.a || a1.error) : initial > 0) : !!st.retry && retryResult !== null;

  return (
    <>
      <div aria-live="polite" className="grid min-h-32 content-center gap-2 rounded-2xl bg-surface px-6 py-7 shadow-card">
        {shown ? (
          <p lang="en" className="text-balance text-[1.75rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
            {st.text}
          </p>
        ) : (
          <p className="text-lg text-muted">
            {st.test ? "Câu hỏi mới, không có gợi ý. " : ""}Bấm nút để nghe câu hỏi. Máy bắt đầu nghe ngay khi đọc xong{st.targetMs ? `; mục tiêu là bắt đầu nói trong ${(st.targetMs / 1000).toString().replace(".", ",")} giây` : ""}.
          </p>
        )}
      </div>
      {hintsVisible && <Hints hints={st.hints} level={hintLevel} onOpen={(l) => setHintLevel((c) => Math.max(c, l))} />}
      {rescue && <p className="rounded-xl bg-sunken px-4 py-3 font-semibold">{rescue}</p>}
      {result && (
        <>
          <MeasuredPanel m={result.measures} keywords={st.keywords} keywordsUsed={result.check.keywordsUsed} reason={result.check.reason} targetMs={result.targetMs} inTarget={result.inTarget} />
          <HeardWords transcript={result.transcript} lowWords={result.measures.lowWords} audioFor={wordAudio(ctx)} />
        </>
      )}
      {result && st.assess !== "none" && <AssessArea s={a1} onAsk={st.assess === "ask" ? () => void a1.run(result.attemptId) : undefined} />}
      {!retryResult && !(initial > 0 && !result && st.retry) && (
        <SpeakBox
          st={st}
          ctx={ctx}
          initial={initial}
          max={st.test ? 1 : 3}
          hint={hintLevel}
          targetMs={st.targetMs}
          before={async () => {
            setShown(true);
            await playAudio(questionAudio(ctx, st, false), st.text);
          }}
          label="Nghe câu hỏi và trả lời"
          onSaved={(r) => {
            setResult(r);
            setRescue(null);
            if (st.assess === "auto") void a1.run(r.attemptId);
            // Adaptive Rescue Cascade: câu quá ngắn hoặc thiếu lý do thì tự mở thêm một mức gợi ý và mời nói lại.
            const weak = r.measures.words < 4 || r.check.reason === "no";
            const nextHint = st.hints.find((h) => h.level > hintLevel);
            if (!st.test && weak && nextHint && r.attemptNo < 3) {
              setHintLevel(nextHint.level);
              setRescue(r.measures.words < 4 ? "Câu còn ngắn. Mình mở thêm một gợi ý, em thử nói lại dài hơn nhé." : "Câu hỏi cần lý do. Mình mở thêm một gợi ý, em thử thêm “because…”.");
            }
          }}
          render={() => null}
        />
      )}
      {st.retry && showRetry && (
        <section className="grid gap-4 rounded-2xl border border-line px-5 py-5">
          <h3 className="flex items-center gap-2 text-lg font-extrabold">
            <RotateCcw className="size-5" aria-hidden />
            Nói lại với câu hỏi tương tự
          </h3>
          <p className="text-muted">Áp dụng nhận xét vừa rồi vào câu trả lời mới.</p>
          <p lang="en" className="text-2xl font-extrabold leading-snug">
            {st.retry.text}
          </p>
          {retryResult && <MeasuredPanel m={retryResult.measures} keywords={st.keywords} keywordsUsed={retryResult.check.keywordsUsed} reason={retryResult.check.reason} />}
          {retryResult && <HeardWords transcript={retryResult.transcript} lowWords={retryResult.measures.lowWords} audioFor={wordAudio(ctx)} />}
          {retryResult && <AssessArea s={a2} />}
          {retryResult && a1.a && a2.a && a1.a.grammar.status === "assessed" && a2.a.grammar.status === "assessed" && (
            <p className="rounded-xl bg-sunken px-4 py-3 font-semibold">
              Lỗi ngữ pháp: lần đầu {a1.a.grammar.issues.length}, lần nói lại {a2.a.grammar.issues.length}.
            </p>
          )}
          {!retryResult && (
            <SpeakBox
              st={st}
              ctx={ctx}
              turn={1}
              max={1}
              before={() => playAudio(questionAudio(ctx, st, true), st.retry!.text)}
              label="Nghe và trả lời câu mới"
              onSaved={(r) => {
                setRetryResult(r);
                void a2.run(r.attemptId);
              }}
              render={() => null}
            />
          )}
        </section>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {canGo && <NextButton onClick={onDone} />}
        {!answered && <SkipLink st={st} ctx={ctx} onDone={onDone}>{st.test ? "Không trả lời được câu này? Bỏ qua" : undefined}</SkipLink>}
      </div>
    </>
  );
}

// ---- Micro-Roleplay ---------------------------------------------------------------------------------------------------

type Bubble = { who: "ai" | "me"; text: string; attemptId?: string };

function Roleplay({ st, ctx, onDone }: P<"roleplay">) {
  const r = ctx.content.roleplays.find((x) => x.id === st.ref)!;
  const prev = ctx.rows.filter((x) => x.step === st.n && x.turn >= 1 && x.turn <= 6).sort((a, b) => a.turn - b.turn);
  const initialBubbles: Bubble[] = [{ who: "ai", text: r.opener }];
  for (const p of prev) {
    initialBubbles.push({ who: "me", text: p.answer ?? "" });
    if (p.reply) initialBubbles.push({ who: "ai", text: p.reply, attemptId: p.attemptId });
  }
  const [bubbles, setBubbles] = useState<Bubble[]>(initialBubbles);
  const [turn, setTurn] = useState(prev.length + 1);
  const [started, setStarted] = useState(prev.length > 0);
  const [msg, setMsg] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<boolean[] | null>(null);
  const [lastId, setLastId] = useState<string | null>(prev.find((p) => p.turn === r.turns)?.attemptId ?? null);
  const assess = useAssess();
  const done = turn > r.turns;

  const lastAi = [...bubbles].reverse().find((b) => b.who === "ai")!;
  const playLast = () => playAudio(lastAi.attemptId ? `/api/module/tts?a=${lastAi.attemptId}` : moduleAudio(ctx.moduleId, `${r.id}.open`), lastAi.text);

  return (
    <>
      <div className="grid gap-3 rounded-2xl bg-surface px-6 py-6 shadow-card">
        <h2 className="text-2xl font-extrabold tracking-tight">{r.titleVi}</h2>
        <p>{r.contextVi}</p>
        <dl className="grid gap-1 text-sm">
          <div>
            <dt className="inline font-bold">Em: </dt>
            <dd className="inline">{r.studentRoleVi}</dd>
          </div>
          <div>
            <dt className="inline font-bold">Bạn trò chuyện (AI): </dt>
            <dd lang="en" className="inline">
              {r.aiRole}
            </dd>
          </div>
          <div>
            <dt className="inline font-bold">Nhiệm vụ: </dt>
            <dd className="inline">{r.goalVi}</dd>
          </div>
        </dl>
        <ul className="grid gap-1">
          {r.requirements.map((q, i) => (
            <li key={q.vi} className="flex items-start gap-2">
              {requirements ? (
                requirements[i] ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-label="Đạt" />
                ) : (
                  <CircleDashed className="mt-0.5 size-5 shrink-0" aria-label="Chưa đạt" />
                )
              ) : (
                <CircleDashed className="mt-0.5 size-5 shrink-0 text-muted" aria-hidden />
              )}
              {q.vi}
            </li>
          ))}
        </ul>
        {!st.test && (
          <ul className="grid gap-1 text-sm text-muted">
            {r.tipsVi.map((t) => (
              <li key={t} className="flex gap-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted">AI trả lời theo lời em nói. Nếu AI lỗi, bạn trò chuyện dùng câu viết sẵn để buổi học không bị dừng. Em nói {r.turns} lượt.</p>
      </div>
      {started && (
        <ol className="grid gap-3" aria-live="polite">
          {bubbles.map((b, i) => (
            <li key={i} className={`max-w-[85%] rounded-2xl px-4 py-3 ${b.who === "ai" ? "justify-self-start bg-surface shadow-card" : "justify-self-end bg-brand-soft"}`}>
              <span className="block text-xs font-bold text-muted">{b.who === "ai" ? r.aiRole.split(",")[0] : "Em"}</span>
              <span lang="en" className="text-lg">
                {b.text}
              </span>
            </li>
          ))}
        </ol>
      )}
      {msg && <Alert>{msg}</Alert>}
      {!done && (
        <RecordButton
          rec={ctx.rec}
          label={started ? `Lượt ${turn}/${r.turns}: bấm để nói` : "Bắt đầu: nghe bạn nói rồi trả lời"}
          before={async () => {
            setStarted(true);
            await playLast();
          }}
          onRecorded={async (rc, lag) => {
            const q = new URLSearchParams({ lesson: ctx.lessonId, step: String(st.n), turn: String(turn), lag: String(Math.round(lag)), onset: rc.onsetMs === null ? "" : String(rc.onsetMs) });
            const data = await postAudio(`/api/module/roleplay?${q}`, rc);
            if (data.unclear) return setMsg(UNCLEAR);
            if (data.error) return setMsg(String(data.error));
            setMsg(null);
            const add: Bubble[] = [{ who: "me", text: String(data.transcript) }];
            if (data.reply) add.push({ who: "ai", text: String(data.reply), attemptId: String(data.attemptId) });
            setBubbles((xs) => [...xs, ...add]);
            setTurn((t) => t + 1);
            if (data.done) {
              setRequirements(data.requirements as boolean[]);
              setLastId(String(data.attemptId));
              if (st.test) void assess.run(String(data.attemptId));
            }
          }}
        />
      )}
      {done && (
        <>
          <p role="status" className="rounded-xl bg-brand-soft px-4 py-3 font-bold text-brand-strong">
            Kết thúc cuộc trò chuyện.{requirements ? ` Em đạt ${requirements.filter(Boolean).length}/${requirements.length} yêu cầu (máy kiểm tra bằng quy tắc).` : ""}
          </p>
          {lastId && <AssessArea s={assess} onAsk={() => void assess.run(lastId)} />}
          <NextButton onClick={onDone} />
        </>
      )}
      {!started && <SkipLink st={st} ctx={ctx} onDone={onDone} />}
    </>
  );
}

function Report({ st, ctx, onDone }: P<"report">) {
  const [r, setR] = useState<ModuleReport | null | undefined>(undefined);
  useEffect(() => {
    void loadReport(ctx.lessonId).then(setR);
  }, [ctx.lessonId]);
  return (
    <>
      <h2 className="text-2xl font-extrabold tracking-tight">{st.ref === "final" ? "Kết quả cả module" : `Kết quả kiểm tra cuối giai đoạn ${st.ref.slice(-1)}`}</h2>
      {r === undefined ? (
        <p role="status" className="flex items-center gap-2 text-muted">
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
          Đang tính kết quả…
        </p>
      ) : r ? (
        <ReportView r={r} />
      ) : (
        <Alert>Chưa tải được kết quả. Em xem lại ở trang module nhé.</Alert>
      )}
      <MarkAndNext st={st} ctx={ctx} onDone={onDone}>
        Tiếp tục
      </MarkAndNext>
    </>
  );
}

/** Ô số liệu cuối bài: nảy vào lần lượt (--i). */
function Tile({ i, label, tone, children }: { i: number; label: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`pop-in grid overflow-hidden rounded-2xl border-2 ${tone}`} style={{ ["--i" as string]: i + 2 }}>
      <dt className="px-2 py-1 text-xs font-extrabold">{label}</dt>
      <dd className="grid place-items-center rounded-b-xl bg-surface px-2 py-3 text-xl font-extrabold text-ink">{children}</dd>
    </div>
  );
}
