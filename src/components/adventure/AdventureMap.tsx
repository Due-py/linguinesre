"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Blocks,
  BookOpen,
  Check,
  Clock,
  Flag,
  Gauge,
  Lock,
  MessageCircle,
  MessagesSquare,
  Mic,
  Mountain,
  Play,
  Repeat,
  Shuffle,
  Signpost,
  Sprout,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Linguine from "@/components/Linguine";
import { GAME_ICON } from "./icons";
import { SubmitButton } from "@/components/form";
import { startLesson } from "@/app/(student)/student/module/actions";
import { buildLayout, progressFraction, type MapLayout, type PlacedNode } from "@/lib/adventure/layout";
import { DIFFICULTY_VI, difficultyOf, GAME_INFO, REGIONS, SKILL_VI, regionOf, worldNodes, type GameKey, type NodeState, type QuestIcon, type WorldNode } from "@/lib/adventure/world";
import { questXp, XP } from "@/lib/adventure/game";
import { Decorations, Ground, Road, Sky, type Season, type Trail } from "./Scenery";

const QUEST_ICON: Record<QuestIcon, LucideIcon> = {
  book: BookOpen,
  repeat: Repeat,
  puzzle: Blocks,
  blocks: Blocks,
  grow: Sprout,
  signpost: Signpost,
  flag: Flag,
  shuffle: Shuffle,
  zap: Zap,
  bolt: Gauge,
  chat: MessageCircle,
  chats: MessagesSquare,
  mic: Mic,
  mountain: Mountain,
};

const FLAG_COLOR: Record<string, string> = { green: "#1b7d43", red: "#d62327", gold: "#f4b824", blue: "#1967d2" };
const STATE_VI: Record<NodeState, string> = { done: "Đã xong", current: "Nhiệm vụ hiện tại", available: "Đã mở", locked: "Chưa mở" };

export type MapProps = {
  moduleId: string;
  unitNo: number;
  states: Record<string, NodeState>;
  inProgress: boolean;
  gameXpTaken: GameKey[];
  cosmetics: { flag: string; season: Season; trail: Trail };
};

const themes = Object.fromEntries(REGIONS.map((r) => [r.phase, r.theme]));

/** Bản đồ phiêu lưu: ngang trên máy tính (cuộn ngang), dọc trên điện thoại. Cùng dữ liệu thật, cùng thứ tự. */
export default function AdventureMap(props: MapProps) {
  const nodes = useMemo(() => worldNodes(), []);
  const horizontal = useMemo(() => buildLayout(nodes, "horizontal", themes), [nodes]);
  const vertical = useMemo(() => buildLayout(nodes, "vertical", themes), [nodes]);
  const [open, setOpen] = useState<WorldNode | null>(null);
  const currentIdx = nodes.filter((n) => n.kind === "quest").findIndex((n) => props.states[n.id] === "current");
  const doneCount = nodes.filter((n) => n.kind === "quest" && props.states[n.id] === "done").length;
  const upto = currentIdx >= 0 ? currentIdx : doneCount === 14 ? 13 : -1;

  return (
    <>
      <div className="hidden min-w-0 md:block">
        <HorizontalFrame layout={horizontal} upto={upto} {...props} onOpen={setOpen} />
      </div>
      <div className="min-w-0 md:hidden">
        <VerticalFrame layout={vertical} upto={upto} {...props} onOpen={setOpen} />
      </div>
      <QuestSheet node={open} onClose={() => setOpen(null)} {...props} />
    </>
  );
}

type FrameProps = MapProps & { layout: MapLayout; upto: number; onOpen: (n: WorldNode) => void };

function HorizontalFrame(p: FrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Đưa nhiệm vụ hiện tại vào giữa khung (chỉ cuộn khung bản đồ, không cuộn trang).
    const el = ref.current;
    const cur = p.layout.nodes.find((n) => p.states[n.node.id] === "current") ?? p.layout.nodes.findLast((n) => p.states[n.node.id] === "done");
    if (el && cur) el.scrollLeft = Math.max(0, cur.x - el.clientWidth / 2);
  }, [p.layout, p.states]);
  return (
    <div ref={ref} className="overflow-x-auto overscroll-x-contain rounded-[2rem] shadow-card [scrollbar-width:thin]" tabIndex={-1}>
      <Canvas {...p} />
    </div>
  );
}

function VerticalFrame(p: FrameProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1.25, Math.max(0.8, el.clientWidth / p.layout.w)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [p.layout.w]);
  return (
    <div ref={ref} className="-mx-4 overflow-hidden sm:mx-0 sm:rounded-[2rem]">
      <div className="mx-auto" style={{ width: p.layout.w * scale, height: p.layout.h * scale }}>
        <div style={{ width: p.layout.w, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <Canvas {...p} />
        </div>
      </div>
    </div>
  );
}

function Canvas({ layout, upto, states, cosmetics, onOpen, inProgress }: FrameProps) {
  const progress = progressFraction(layout, upto);
  const current = layout.nodes.find((n) => states[n.node.id] === "current");
  return (
    <div className="relative select-none" style={{ width: layout.w, height: layout.h }}>
      <svg viewBox={`0 0 ${layout.w} ${layout.h}`} width={layout.w} height={layout.h} className="absolute inset-0" aria-hidden focusable="false">
        <Ground layout={layout} season={cosmetics.season} />
        <Road layout={layout} progress={progress} trail={cosmetics.trail} />
        <Decorations layout={layout} season={cosmetics.season} />
        <Sky layout={layout} />
      </svg>

      {layout.regions.map((r) => {
        const reg = regionOf(r.phase);
        return (
          <div key={r.phase} aria-hidden className="absolute flex items-center gap-2 rounded-full bg-surface/90 py-1.5 pl-1.5 pr-4 shadow-card" style={{ left: r.banner.x, top: r.banner.y }}>
            <span className="grid size-7 place-items-center rounded-full bg-brand text-sm font-semibold text-on-brand">{r.phase}</span>
            <span className="grid leading-tight">
              <span className="text-sm font-semibold">{reg.nameVi}</span>
              <span lang="en" className="text-xs text-muted">
                {reg.nameEn}
              </span>
            </span>
          </div>
        );
      })}

      <ol aria-label="Các nhiệm vụ trên bản đồ" className="contents">
        {layout.nodes.map((n) => (
          <li key={n.node.id} className="contents">
            <NodeButton n={n} state={states[n.node.id] ?? "locked"} flag={cosmetics.flag} inProgress={inProgress} onOpen={onOpen} />
          </li>
        ))}
      </ol>

      {current && (
        // Linguine đứng cạnh nhiệm vụ hiện tại, ở phía không có nhãn.
        <div
          aria-hidden
          className="pointer-events-none absolute adv-float"
          style={{ left: current.label.x + current.label.w / 2 > current.x ? current.x - current.r - 42 : current.x + current.r - 4, top: current.y - current.r - 58 }}
        >
          <Linguine pose="full" size={78} />
        </div>
      )}
    </div>
  );
}

function NodeButton({ n, state, flag, inProgress, onOpen }: { n: PlacedNode; state: NodeState; flag: string; inProgress: boolean; onOpen: (n: WorldNode) => void }) {
  const node = n.node;
  const size = n.r * 2;
  const Icon = node.kind === "quest" ? QUEST_ICON[node.icon] : GAME_ICON[node.game];
  const isGame = node.kind === "game";
  const tone =
    state === "done"
      ? isGame
        ? "bg-gold text-ink shadow-[0_5px_0_#a86f00]"
        : "bg-brand text-on-brand shadow-[0_5px_0_var(--brand-strong)]"
      : state === "current"
        ? "bg-surface text-brand-strong ring-4 ring-gold shadow-[0_5px_0_#d99e10]"
        : state === "available"
          ? "bg-gold-soft text-warn ring-2 ring-gold shadow-[0_5px_0_#e2c56a]"
          : "bg-[#ebe7dc] text-[#7d796e] shadow-[0_5px_0_#cfc9b9]";
  const eyebrow =
    node.kind === "quest" ? `Ngày ${node.day}${node.challenge ? " · Thử thách" : ""}` : `Mini-game · tùy chọn`;
  const label = `${eyebrow}: ${node.titleVi}. ${state === "current" && inProgress ? "Đang làm dở" : STATE_VI[state]}.`;
  return (
    <>
      <button
        type="button"
        onClick={() => onOpen(node)}
        aria-label={label}
        aria-current={state === "current" ? "step" : undefined}
        className={`press absolute grid place-items-center transition-transform hover:-translate-y-0.5 ${isGame ? "rounded-[1.1rem]" : "rounded-full"} ${tone}`}
        style={{ left: n.x - n.r, top: n.y - n.r, width: size, height: size }}
      >
        {state === "current" && <span aria-hidden className={`adv-pulse absolute inset-0 ${isGame ? "rounded-[1.1rem]" : "rounded-full"} ring-4 ring-gold`} />}
        {state === "done" ? <Check className={isGame ? "size-6" : "size-8"} strokeWidth={3} aria-hidden /> : state === "locked" ? <Lock className="size-6" aria-hidden /> : <Icon className={n.r > 36 ? "size-9" : isGame ? "size-6" : "size-8"} aria-hidden />}
        {state === "done" && !isGame && (
          <svg aria-hidden width="22" height="26" viewBox="0 0 22 26" className="absolute -right-2 -top-4">
            <line x1="3" y1="2" x2="3" y2="25" stroke="#5f4632" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M4 3 L20 8 L4 14 Z" fill={FLAG_COLOR[flag] ?? FLAG_COLOR.green} />
          </svg>
        )}
      </button>
      <div
        aria-hidden
        onClick={() => onOpen(node)}
        className={`absolute grid cursor-pointer content-center rounded-2xl px-3 shadow-card ${state === "locked" ? "bg-surface/80" : "bg-surface/95"}`}
        style={{ left: n.label.x, top: n.label.y, width: n.label.w, height: n.label.h }}
      >
        <span className={`truncate text-xs font-medium ${state === "current" ? "text-brand-strong" : "text-muted"}`}>{state === "current" ? `${inProgress ? "Đang làm dở" : "Tiếp theo"} · ${node.kind === "quest" ? `Ngày ${node.day}` : "Mini-game"}` : eyebrow}</span>
        <span className={`line-clamp-1 text-sm font-semibold leading-snug ${state === "locked" ? "text-muted" : ""}`}>{shortTitle(node)}</span>
      </div>
    </>
  );
}

/** Tên ngắn trên nhãn bản đồ (tên đầy đủ ở bảng chi tiết). */
function shortTitle(n: WorldNode) {
  if (n.kind === "game") return n.titleVi;
  return n.titleVi.split(/,| và /)[0];
}

function QuestSheet({ node, onClose, states, moduleId, inProgress, gameXpTaken }: MapProps & { node: WorldNode | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (node && !d.open) d.showModal();
    if (!node && d.open) d.close();
  }, [node]);
  const state = node ? (states[node.id] ?? "locked") : "locked";
  const region = node ? regionOf(node.phase) : null;
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="quest-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-[2rem] bg-surface p-0 text-ink shadow-float backdrop:bg-ink/40"
    >
      {node && region && (
        <div className="sheet-up grid gap-5 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-muted">
              {node.kind === "quest" ? `Ngày ${node.day}` : "Mini-game tùy chọn"} · {region.nameVi}
            </p>
            <button type="button" onClick={onClose} className="press -m-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-sunken" aria-label="Đóng">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <h2 id="quest-title" className="-mt-3 text-balance text-3xl font-semibold tracking-tight">
            {node.titleVi}
          </h2>
          <p className="text-lg">{node.storyVi}</p>
          {node.kind === "quest" && (
            <p>
              <span className="font-semibold">Mục tiêu: </span>
              {node.goalVi}
            </p>
          )}
          {node.kind === "game" && <p className="text-muted">{GAME_INFO[node.game].howVi}</p>}
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Fact label="Thời gian">
              <Clock className="size-4" aria-hidden /> {node.kind === "quest" ? `~${node.minutes} phút` : `${node.minutes}–3 phút`}
            </Fact>
            <Fact label="Độ khó">{node.kind === "quest" ? DIFFICULTY_VI[node.challenge ? 5 : difficultyOf(node.phase)] : "Ôn nhẹ"}</Fact>
            <Fact label="Phần thưởng">
              {node.kind === "quest"
                ? state === "done"
                  ? "Đã nhận EXP"
                  : `Tới ${questXp(node.day)} EXP`
                : gameXpTaken.includes(node.game)
                  ? "Đã nhận EXP lần đầu"
                  : `${XP.game} EXP khi đạt`}
            </Fact>
          </dl>
          <div className="grid gap-2">
            <p className="text-sm font-medium text-muted">Kỹ năng được luyện</p>
            <ul className="flex flex-wrap gap-2">
              {node.skills.map((s) => (
                <li key={s} className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">
                  {SKILL_VI[s]}
                </li>
              ))}
            </ul>
          </div>
          {node.kind === "quest" && node.challenge && (
            <p className="rounded-2xl bg-sunken px-4 py-3 text-sm text-muted">
              Nhiệm vụ thử thách có phần kiểm tra: không gợi ý, không đồng hồ trò chơi. EXP tính khi làm xong bài, không phụ thuộc điểm đúng sai.
            </p>
          )}
          <SheetAction node={node} state={state} moduleId={moduleId} inProgress={inProgress} />
        </div>
      )}
    </dialog>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 rounded-2xl bg-tint px-4 py-3">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="flex items-center gap-1.5 font-semibold">{children}</dd>
    </div>
  );
}

function SheetAction({ node, state, moduleId, inProgress }: { node: WorldNode; state: NodeState; moduleId: string; inProgress: boolean }) {
  if (node.kind === "game") {
    if (state === "locked") return <p className="rounded-2xl bg-sunken px-4 py-3 font-medium text-muted">Mở sau khi xong nhiệm vụ ngày {node.after}.</p>;
    return (
      <Link href={`/student/phieu-luu/tro-choi/${node.game}?m=${moduleId}`} className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 font-semibold text-on-brand hover:bg-brand-strong">
        <Play className="size-5" aria-hidden />
        {state === "done" ? "Chơi lại để ôn" : "Chơi"}
      </Link>
    );
  }
  if (state === "current")
    return (
      <form action={startLesson}>
        <input type="hidden" name="moduleId" value={moduleId} />
        <input type="hidden" name="day" value={node.day} />
        <SubmitButton pendingLabel="Đang chuẩn bị bài…" className="w-full">
          {inProgress ? "Làm tiếp nhiệm vụ" : "Bắt đầu nhiệm vụ"}
        </SubmitButton>
      </form>
    );
  if (state === "done")
    return (
      <Link href={`/student/module/${moduleId}`} className="press inline-flex min-h-12 items-center justify-center rounded-full bg-brand-soft px-6 font-semibold text-brand-strong hover:bg-brand-tonal">
        Xem kết quả của Unit
      </Link>
    );
  return <p className="rounded-2xl bg-sunken px-4 py-3 font-medium text-muted">Các nhiệm vụ mở lần lượt. Hoàn thành nhiệm vụ trước để mở nhiệm vụ này.</p>;
}
