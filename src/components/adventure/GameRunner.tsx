"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, CircleAlert, RotateCcw, Sparkles, Timer, X } from "lucide-react";
import Mascot from "@/components/penguin/Mascot";
import ListenButton from "@/components/module/Listen";
import { answerItem, startRound, type AnswerView } from "@/app/(student)/student/phieu-luu/actions";
import type { GameItem, GameReveal } from "@/lib/adventure/minigames";
import { QUICK_THINK_MS } from "@/lib/adventure/minigames";
import type { GameKey } from "@/lib/adventure/world";

type Done = { i: number; a: string | string[] | null; reveal: GameReveal };
type Result = { correct: number; total: number; xp: number; coins: number; firstTime: boolean; passed: boolean; rewards: boolean };

/**
 * Một lượt mini-game: máy chủ chọn câu và chấm từng câu (trình duyệt không biết đáp án trước). Ngắn, 1–3 phút.
 * Đồng hồ (Quick Think) chỉ để chơi: không ghi vào kết quả học hay nghiên cứu.
 */
export default function GameRunner({ moduleId, game, title, how }: { moduleId: string; game: GameKey; title: string; how: string }) {
  const [phase, setPhase] = useState<"intro" | "loading" | "play" | "done">("intro");
  const [error, setError] = useState<string | null>(null);
  const [roundId, setRoundId] = useState("");
  const [items, setItems] = useState<GameItem[]>([]);
  const [done, setDone] = useState<Done[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const begin = async () => {
    setPhase("loading");
    setError(null);
    const r = await startRound({ moduleId, game });
    if (!r.ok) {
      setError(r.error);
      setPhase("intro");
      return;
    }
    setRoundId(r.roundId);
    setItems(r.items);
    setDone(r.answers.map((a) => ({ i: a.i, a: a.a, reveal: a.reveal })));
    setResult(null);
    setPhase("play");
  };

  const answer = useCallback(
    async (index: number, a: string | string[] | null, ms: number | null): Promise<AnswerView | null> => {
      if (busy) return null;
      setBusy(true);
      const r = await answerItem({ roundId, index, answer: a, ms });
      setBusy(false);
      if (!r.ok) {
        setError(r.error);
        return null;
      }
      setError(null);
      setDone((d) => [...d, { i: index, a, reveal: r.reveal }]);
      if (r.finished) setResult({ correct: r.correct, total: r.total, xp: r.xp, coins: r.coins, firstTime: r.firstTime, passed: r.passed, rewards: r.rewards });
      return r;
    },
    [busy, roundId],
  );

  if (phase === "intro" || phase === "loading")
    return (
      <div className="grid justify-items-start gap-5">
        <p className="max-w-prose text-lg">{how}</p>
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <button type="button" onClick={begin} disabled={phase === "loading"} className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-7 text-lg font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-60">
          {phase === "loading" ? "Đang chuẩn bị…" : `Bắt đầu: ${title}`}
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
    );

  if (phase === "done" && result)
    return (
      <div className="grid justify-items-center gap-5 rounded-[2rem] bg-tint px-6 py-8 text-center">
        <Mascot state={result.passed ? "celebrating" : "encouraging"} size={130} className="adv-burst" />
        <h2 className="text-3xl font-semibold tracking-tight">Xong lượt chơi!</h2>
        <p className="text-xl">
          Đúng <span className="font-semibold tabular-nums">{result.correct}/{result.total}</span> câu
        </p>
        {!result.rewards ? null : !result.passed ? (
          <p className="max-w-prose text-muted">Đúng từ một nửa số câu trở lên thì được thưởng. Xem lại lời giải rồi chơi lượt mới nhé, không vội.</p>
        ) : result.firstTime ? (
          <p className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-gold-soft px-4 py-2 text-lg font-semibold text-warn">
            <Sparkles className="size-5" aria-hidden />+{result.xp} EXP{result.coins ? ` · +${result.coins} LC` : ""} (lần đầu chơi đạt trò này ở Unit này)
          </p>
        ) : (
          <p className="max-w-prose text-muted">Em đã nhận thưởng của trò này ở Unit này rồi. Chơi lại để ôn thêm, không có thêm EXP.</p>
        )}
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={begin} className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-soft px-6 font-semibold text-brand-strong hover:bg-brand-tonal">
            <RotateCcw className="size-5" aria-hidden />
            Chơi lượt mới
          </button>
          <Link href={`/student/phieu-luu?m=${moduleId}`} className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
            Về bản đồ
          </Link>
        </div>
      </div>
    );

  const answered = new Map(done.map((d) => [d.i, d]));
  const toDone = () => setPhase("done");
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-3">
        <div role="progressbar" aria-label="Số câu đã làm" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done.length} className="h-3 flex-1 overflow-hidden rounded-full bg-sunken">
          <span className="block h-full rounded-full bg-gold transition-[width] duration-500" style={{ width: `${(done.length / Math.max(1, items.length)) * 100}%` }} />
        </div>
        <span className="text-sm font-medium tabular-nums text-muted">
          {done.length}/{items.length}
        </span>
      </div>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {game === "vocab_match" ? (
        <MatchBoard items={items} answered={answered} busy={busy} onAnswer={answer} finished={!!result} onFinish={toDone} />
      ) : (
        <Sequential game={game} items={items} answered={answered} busy={busy} onAnswer={answer} finished={!!result} onFinish={toDone} />
      )}
    </div>
  );
}

/** Đo thời gian trả lời (chỉ để lưu kèm lượt chơi, không dùng cho kết quả học). */
const stamp = (t: { current: number }) => {
  t.current = Date.now();
};
const since = (t: { current: number }) => Date.now() - t.current;
function useClock() {
  const t = useRef(0);
  useEffect(() => stamp(t), []);
  return t;
}

type AnswerFn = (index: number, a: string | string[] | null, ms: number | null) => Promise<AnswerView | null>;

/** Ghép từ: chọn một từ tiếng Anh, rồi chọn nghĩa. Mỗi từ được chấm một lần. */
function MatchBoard({ items, answered, busy, onAnswer, finished, onFinish }: { items: GameItem[]; answered: Map<number, Done>; busy: boolean; onAnswer: AnswerFn; finished: boolean; onFinish: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const [last, setLast] = useState<Done | null>(null);
  const start = useClock();
  const meanings = items[0]?.options ?? [];
  const usedMeanings = new Set([...answered.values()].map((d) => d.reveal.answer as string));
  const choose = async (m: string) => {
    if (pick === null) return;
    const r = await onAnswer(pick, m, since(start));
    if (r?.ok) {
      setLast({ i: pick, a: m, reveal: r.reveal });
      setPick(null);
      stamp(start);
    }
  };
  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-5">
        <ul className="grid content-start gap-2" aria-label="Từ tiếng Anh">
          {items.map((it, i) => {
            const d = answered.get(i);
            return (
              <li key={it.ref}>
                <button
                  type="button"
                  lang="en"
                  disabled={!!d || busy}
                  onClick={() => setPick(i)}
                  aria-pressed={pick === i}
                  className={`press min-h-14 w-full rounded-2xl px-3 py-2 text-left text-lg font-semibold ${
                    d ? (d.reveal.correct ? "bg-success-soft text-success-strong" : "bg-danger-soft text-danger") : pick === i ? "bg-brand text-on-brand" : "bg-surface shadow-card hover:bg-brand-soft"
                  }`}
                >
                  {it.prompt}
                  {d && <span className="block text-sm font-medium">{d.reveal.correct ? "Đúng" : `Nghĩa: ${d.reveal.answer}`}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="grid content-start gap-2" aria-label="Nghĩa tiếng Việt">
          {meanings.map((m) => {
            const used = usedMeanings.has(m);
            return (
              <li key={m}>
                <button
                  type="button"
                  disabled={used || pick === null || busy}
                  onClick={() => choose(m)}
                  className={`press min-h-14 w-full rounded-2xl px-3 py-2 text-left font-medium ${used ? "bg-sunken text-muted line-through decoration-2" : "bg-surface shadow-card hover:bg-gold-soft disabled:opacity-60"}`}
                >
                  {m}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {pick === null ? "Chọn một từ ở cột trái." : `Chọn nghĩa của "${items[pick].prompt}".`}
      </p>
      {last && <Reveal d={last} />}
      {finished && (
        <button type="button" onClick={onFinish} className="press inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
          Xem kết quả <ArrowRight className="size-5" aria-hidden />
        </button>
      )}
    </div>
  );
}

function Reveal({ d }: { d: Done }) {
  return (
    <div role="status" className={`sheet-up grid gap-1 rounded-2xl px-4 py-3 ${d.reveal.correct ? "bg-success-soft" : "bg-danger-soft"}`}>
      <p className={`flex items-center gap-2 font-semibold ${d.reveal.correct ? "text-success-strong" : "text-danger"}`}>
        {d.reveal.correct ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
        {d.reveal.correct ? "Đúng rồi" : d.a === null ? "Hết giờ" : "Chưa đúng"}
      </p>
      <p>{d.reveal.explainVi}</p>
    </div>
  );
}

/** Các trò từng câu một: xếp câu, đúng/sai, chọn ý câu hỏi (có đồng hồ), chọn câu nói hợp tình huống. */
function Sequential({ game, items, answered, busy, onAnswer, finished, onFinish }: { game: GameKey; items: GameItem[]; answered: Map<number, Done>; busy: boolean; onAnswer: AnswerFn; finished: boolean; onFinish: () => void }) {
  const firstOpen = items.findIndex((_, i) => !answered.has(i));
  const [view, setView] = useState(firstOpen === -1 ? items.length - 1 : firstOpen);
  const it = items[view];
  const d = answered.get(view);
  const next = () => {
    const n = items.findIndex((_, i) => !answered.has(i));
    if (n === -1) onFinish();
    else setView(n);
  };
  if (!it) return null;
  return (
    <div className="grid gap-5">
      {game === "sentence_builder" && <Builder key={view} it={it} d={d} busy={busy} onSubmit={(order) => onAnswer(view, order, null)} />}
      {(game === "grammar_fix" || game === "conversation_choice") && <Choice key={view} game={game} it={it} d={d} busy={busy} onPick={(a, ms) => onAnswer(view, a, ms)} />}
      {game === "quick_think" && <QuickThink key={view} it={it} d={d} busy={busy} onPick={(a, ms) => onAnswer(view, a, ms)} />}
      {d && (
        <>
          <Reveal d={d} />
          <button type="button" onClick={next} autoFocus className="press inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
            {finished && items.every((_, i) => answered.has(i)) ? "Xem kết quả" : "Câu tiếp"}
            <ArrowRight className="size-5" aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

function Builder({ it, d, busy, onSubmit }: { it: GameItem; d: Done | undefined; busy: boolean; onSubmit: (order: string[]) => void }) {
  const [order, setOrder] = useState<number[]>([]);
  const used = new Set(order);
  return (
    <div className="grid gap-4">
      <p className="text-sm font-medium text-muted">Xếp thành câu có nghĩa:</p>
      <p className="text-xl font-semibold">{it.prompt}</p>
      <div lang="en" aria-label="Câu em đang xếp" className="flex min-h-16 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-3 py-2">
        {order.length === 0 && <span className="text-muted">Bấm các mảnh bên dưới theo thứ tự.</span>}
        {order.map((k, i) => (
          <button key={i} type="button" disabled={!!d} onClick={() => setOrder(order.filter((_, j) => j !== i))} className="press rounded-xl bg-brand px-3 py-2 text-lg font-semibold text-on-brand">
            {it.options[k]}
          </button>
        ))}
      </div>
      <div lang="en" className="flex flex-wrap gap-2">
        {it.options.map((c, k) => (
          <button key={k} type="button" disabled={used.has(k) || !!d} onClick={() => setOrder([...order, k])} className="press rounded-xl bg-surface px-3 py-2 text-lg font-semibold shadow-card hover:bg-brand-soft disabled:invisible">
            {c}
          </button>
        ))}
      </div>
      {!d && (
        <button type="button" disabled={order.length !== it.options.length || busy} onClick={() => onSubmit(order.map((k) => it.options[k]))} className="press inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong disabled:opacity-50">
          Kiểm tra
        </button>
      )}
    </div>
  );
}

function Choice({ game, it, d, busy, onPick }: { game: GameKey; it: GameItem; d: Done | undefined; busy: boolean; onPick: (a: string, ms: number) => void }) {
  const t0 = useClock();
  return (
    <div className="grid gap-4">
      <p className="text-sm font-medium text-muted">{game === "grammar_fix" ? "Câu này đúng hay sai ngữ pháp?" : "Tình huống: em muốn…"}</p>
      <p lang={it.promptLang} className={`text-2xl font-semibold ${game === "conversation_choice" ? "first-letter:uppercase" : ""}`}>
        {it.prompt}
      </p>
      <OptionList it={it} d={d} busy={busy} onPick={(a) => onPick(a, since(t0))} row={game === "grammar_fix"} />
    </div>
  );
}

function OptionList({ it, d, busy, onPick, row }: { it: GameItem; d: Done | undefined; busy: boolean; onPick: (a: string) => void; row?: boolean }) {
  return (
    <ul className={row ? "grid grid-cols-2 gap-3" : "grid gap-2"}>
      {it.options.map((o) => {
        const chosen = d?.a === o;
        const right = d && d.reveal.answer === o;
        return (
          <li key={o}>
            <button
              type="button"
              lang={it.optionsLang}
              disabled={!!d || busy}
              onClick={() => onPick(o)}
              className={`press min-h-14 w-full rounded-2xl px-4 py-3 text-left text-lg font-medium ${
                right ? "bg-success-soft text-success-strong ring-2 ring-success" : chosen ? "bg-danger-soft text-danger ring-2 ring-danger" : "bg-surface shadow-card hover:bg-brand-soft disabled:opacity-70"
              } ${row ? "text-center" : ""}`}
            >
              {o}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function QuickThink({ it, d, busy, onPick }: { it: GameItem; d: Done | undefined; busy: boolean; onPick: (a: string | null, ms: number) => void }) {
  const [left, setLeft] = useState(QUICK_THINK_MS);
  const t0 = useClock();
  const sent = useRef(false);
  const latest = useRef(onPick);
  useEffect(() => {
    latest.current = onPick;
  }, [onPick]);
  // Câu cuối vừa chấm thì xem lời giải trước, bấm tiếp mới sang màn kết quả (Sequential lo phần đó).
  const pick = useCallback((a: string | null) => {
    if (sent.current) return;
    sent.current = true;
    latest.current(a, since(t0));
  }, [t0]);
  useEffect(() => {
    if (d) return;
    const id = setInterval(() => {
      const l = QUICK_THINK_MS - since(t0);
      setLeft(Math.max(0, l));
      if (l <= 0) {
        clearInterval(id);
        pick(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [d, pick, t0]);
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Timer className="size-5 text-warn" aria-hidden />
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
          <span className="block h-full rounded-full bg-gold" style={{ width: `${(left / QUICK_THINK_MS) * 100}%` }} />
        </div>
        <span className="w-14 text-right text-sm font-medium tabular-nums text-muted" aria-live="off">
          {Math.ceil(left / 1000)} giây
        </span>
      </div>
      <p className="text-sm font-medium text-muted">Câu hỏi này đang hỏi ý gì?</p>
      <div className="flex flex-wrap items-center gap-3">
        <p lang="en" className="text-2xl font-semibold">
          {it.prompt}
        </p>
        <ListenButton url="" text={it.prompt}>
          Nghe
        </ListenButton>
      </div>
      <OptionList it={it} d={d} busy={busy} onPick={(a) => pick(a)} />
      <p className="text-xs text-muted">Đồng hồ chỉ để chơi, không tính vào kết quả học.</p>
    </div>
  );
}
