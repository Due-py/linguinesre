import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import GameRunner from "@/components/adventure/GameRunner";
import { GAME_ICON } from "@/components/adventure/icons";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { getModule, moduleLessons } from "@/lib/module/server";
import { GAME_AFTER, GAME_INFO, GAMES, SKILL_VI, regionOf, type GameKey } from "@/lib/adventure/world";

export const metadata: Metadata = { title: "Mini-game" };
export const dynamic = "force-dynamic";

/** Một mini-game tùy chọn của một Unit. Mở khi nhiệm vụ đứng trước nó trên bản đồ đã xong. */
export default async function GamePage({ params, searchParams }: { params: Promise<{ game: string }>; searchParams: Promise<{ m?: string }> }) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { game } = await params;
  const { m } = await searchParams;
  if (!(GAMES as readonly string[]).includes(game)) notFound();
  const g = game as GameKey;
  const mod = m ? await getModule(m) : null;
  if (!mod || mod.grade !== profile.grade) redirect("/student/phieu-luu");
  const lessons = await moduleLessons(profile.id, mod.id);
  const open = lessons.some((l) => l.day === GAME_AFTER[g] && l.status === "completed");
  const info = GAME_INFO[g];
  const Icon = GAME_ICON[g];

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/phieu-luu">
      <div className="grid max-w-3xl gap-8">
        <div className="grid gap-3">
          <Link href={`/student/phieu-luu?m=${mod.id}`} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
            ← Về bản đồ Unit {mod.unitNo}
          </Link>
          <div className="flex items-center gap-4">
            <span aria-hidden className="grid size-16 shrink-0 place-items-center rounded-[1.25rem] bg-gold text-ink shadow-[0_5px_0_#a86f00]">
              <Icon className="size-8" />
            </span>
            <div className="grid gap-0.5">
              <p className="text-sm font-medium text-muted">
                Mini-game tùy chọn · {regionOf(info.phase).nameVi} · <span lang="en">{info.titleEn}</span>
              </p>
              <h1 className="text-balance text-4xl font-semibold tracking-tight">{info.titleVi}</h1>
            </div>
          </div>
          <p className="max-w-prose text-lg text-muted">{info.storyVi}</p>
          <p className="text-sm text-muted">
            Luyện: {info.skills.map((s) => SKILL_VI[s]).join(", ")} · khoảng {info.minutes}–3 phút · nội dung lấy từ Unit {mod.unitNo}: <span lang="en">{mod.title}</span>
          </p>
        </div>
        {open ? (
          <GameRunner moduleId={mod.id} game={g} title={info.titleVi} how={info.howVi} />
        ) : (
          <p className="rounded-2xl bg-sunken px-5 py-4 font-medium text-muted">Trò chơi này mở sau khi em xong nhiệm vụ ngày {GAME_AFTER[g]} trên bản đồ.</p>
        )}
      </div>
    </AppShell>
  );
}
