import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, CalendarCheck, CircleAlert, Compass, Sparkles } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import AdventureMap from "@/components/adventure/AdventureMap";
import { GAME_ICON } from "@/components/adventure/icons";
import CompletionDialog, { type CompletionData } from "@/components/adventure/CompletionDialog";
import type { Season, Trail } from "@/components/adventure/Scenery";
import { Highlight } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { moduleAttempts, moduleToday } from "@/lib/module/server";
import { median, nextOpenDay } from "@/lib/module/plan";
import { adventureState } from "@/lib/adventure/server";
import { ACHIEVEMENTS, dailySource, gameSource, lessonSource, levelTitle } from "@/lib/adventure/game";
import { GAME_INFO, GAMES, SKILL_VI, nodeStates, regionOf, worldNodes, type GameKey } from "@/lib/adventure/world";

export const metadata: Metadata = { title: "Phiêu lưu" };
export const dynamic = "force-dynamic";

const secs = (ms: number) => `${(ms / 1000).toFixed(1).replace(".", ",")} giây`;

/**
 * Bản đồ phiêu lưu: lối vào chính của việc học. Mỗi Unit là một vùng đất, mỗi nhiệm vụ là một bài học thật của Learning Module.
 * Trạng thái nút, EXP và gợi ý đều tính từ dữ liệu thật; không có tiến độ viết sẵn.
 */
export default async function AdventurePage({ searchParams }: { searchParams: Promise<{ m?: string; xong?: string }> }) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { m, xong } = await searchParams;

  const today = profile.grade ? await moduleToday(profile.id, profile.grade) : null;
  const wanted = m && /^[0-9a-f-]{36}$/.test(m) ? m : (today?.id ?? null);
  const s = await adventureState(profile.id, profile.grade, wanted);
  const mod = s.modules.find((x) => x.id === wanted) ?? s.modules.find((x) => x.id === today?.id) ?? s.modules[0] ?? null;

  const shell = (children: React.ReactNode) => (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/phieu-luu">
      {children}
    </AppShell>
  );

  if (!mod)
    return shell(
      <div className="grid max-w-prose gap-4">
        <h1 className="text-5xl font-semibold tracking-tight">
          Hành trình <Highlight>phiêu lưu</Highlight>
        </h1>
        <p className="text-lg text-muted">Khối của em chưa có Unit nào mở. Khi thầy cô hoặc nhóm mở Unit, vùng đất đầu tiên sẽ hiện ở đây.</p>
      </div>,
    );

  const lessons = s.lessons.filter((l) => l.module_id === mod.id);
  const completed = lessons.filter((l) => l.status === "completed").map((l) => l.day);
  const open = lessons.find((l) => l.status === "in_progress");
  const nextDay = open?.day ?? nextOpenDay(completed);
  const roundsHere = s.rounds.filter((r) => r.module_id === mod.id);
  const finished = GAMES.filter((g) => roundsHere.some((r) => r.game === g && r.finished_at && (Array.isArray(r.answers) ? r.answers.length : 0) >= r.total));
  const nodes = worldNodes();
  const states = Object.fromEntries(nodeStates(nodes, completed, nextDay, finished));
  const sources = new Set(s.events.map((e) => e.source));
  const gameXpTaken = GAMES.filter((g) => sources.has(gameSource(mod.id, g)));

  // Màn hình hoàn thành: chỉ cho bài của chính em, đã xong, thuộc Unit này.
  let completion: CompletionData | null = null;
  const done = xong ? lessons.find((l) => l.id === xong && l.status === "completed") : undefined;
  if (done) {
    const rows = (await moduleAttempts(profile.id, mod.id)).filter((a) => a.lesson_id === done.id);
    const speaks = rows.filter((a) => (a.kind === "speak" || a.kind === "roleplay") && a.attempt_no === 1 && a.turn === 0);
    const think = median(speaks.map((a) => a.think_ms).filter((n): n is number => n !== null));
    const words = speaks.map((a) => a.measures?.words).filter((n): n is number => typeof n === "number");
    const quiz = rows.filter((a) => a.kind === "quiz" && a.attempt_no === 1);
    const spoken = rows.filter((a) => a.answer && !["quiz", "arrange", "card", "report", "known_words"].includes(a.kind)).length;
    const hints = rows.filter((a) => a.hint_level > 0).length;
    const facts: CompletionData["facts"] = [];
    if (spoken > 0) facts.push({ label: "Lượt em đã nói", value: String(spoken) });
    if (think !== null) facts.push({ label: "Bắt đầu nói sau", value: secs(think), note: "Trung vị, lượt đầu mỗi câu" });
    if (words.length > 0) facts.push({ label: "Số từ mỗi câu trả lời", value: String(Math.round(words.reduce((a, b) => a + b, 0) / words.length)), note: "Trung bình" });
    if (quiz.length > 0) facts.push({ label: "Câu kiến thức đúng", value: `${quiz.filter((a) => a.correct).length}/${quiz.length}` });
    if (hints > 0) facts.push({ label: "Lần mở gợi ý", value: String(hints), note: "Dùng gợi ý không bị trừ gì" });
    const quest = nodes.find((n) => n.kind === "quest" && n.day === done.day);
    const next = nodes.find((n) => n.kind === "quest" && n.day === nextDay);
    const ev = s.events.find((e) => e.source === lessonSource(done.id));
    const daily = s.newEvents.find((e) => e.kind === "daily");
    completion = {
      day: done.day,
      titleVi: quest?.titleVi ?? "",
      regionVi: regionOf(quest?.phase ?? 1).nameVi,
      xp: s.available ? (ev?.xp ?? 0) : null,
      coins: s.shopAvailable ? s.newCoins.reduce((n, c) => n + c.delta, 0) : null,
      leveledUp: s.leveledUp,
      dailyXp: daily ? daily.xp : null,
      newAchievements: s.newAchievements.map((k) => ACHIEVEMENTS[k].titleVi),
      level: s.available ? { level: s.level.level, title: levelTitle(s.level.level), into: s.level.into, need: s.level.need } : null,
      facts,
      skills: (quest?.skills ?? []).map((k) => SKILL_VI[k]),
      next: next ? `Ngày ${next.kind === "quest" ? next.day : ""}: ${next.titleVi}` : null,
    };
  }

  const rec = s.recommendations[0];
  const dailyDone = s.daily && sources.has(dailySource(s.daily.date));
  const region = regionOf(nodes.find((n) => n.kind === "quest" && n.day === (nextDay ?? 14))?.phase ?? 5);

  return shell(
    <div className="grid min-w-0 gap-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-end">
        <div className="grid min-w-0 gap-3">
          <p className="text-sm font-medium text-muted">
            Unit {mod.unitNo} · {mod.titleVi}
          </p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Hành trình <Highlight>phiêu lưu</Highlight>
          </h1>
          <p className="max-w-prose text-lg text-muted">
            {nextDay === null ? "Em đã chinh phục cả vùng đất này. Chọn Unit khác để đi tiếp." : `Em đang ở ${region.nameVi}. ${region.introVi}`}
          </p>
          {s.modules.length > 1 && (
            <nav aria-label="Chọn vùng đất (Unit)" className="-mx-1 overflow-x-auto pb-1">
              <ul className="flex gap-2 px-1">
                {s.modules.map((x) => (
                  <li key={x.id}>
                    <Link
                      href={`/student/phieu-luu?m=${x.id}`}
                      aria-current={x.id === mod.id ? "page" : undefined}
                      className={`press inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium ${x.id === mod.id ? "bg-brand text-on-brand" : "bg-sunken hover:bg-line"}`}
                    >
                      Unit {x.unitNo}
                      <span className={x.id === mod.id ? "text-on-brand/80" : "text-muted"}>{x.daysDone}/14</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <Link href="/student/phieu-luu/ho-so" className="press grid gap-3 rounded-[2rem] bg-gold-soft p-5 hover:bg-[#fdefc4]">
          {s.available ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-warn">Cấp phiêu lưu</p>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-warn">
                  <Award className="size-4" aria-hidden /> {s.achievements.length} thành tích
                </span>
              </div>
              <p className="text-2xl font-semibold tracking-tight">
                Cấp {s.level.level} · {levelTitle(s.level.level)}
              </p>
              <div role="progressbar" aria-label="Tiến tới cấp tiếp theo" aria-valuemin={0} aria-valuemax={s.level.need} aria-valuenow={s.level.into} className="h-2.5 overflow-hidden rounded-full bg-surface">
                <span className="grow-x block h-full rounded-full bg-gold" style={{ width: `${Math.max(s.level.into > 0 ? 3 : 0, Math.round((s.level.into / s.level.need) * 100))}%` }} />
              </div>
              <p className="flex justify-between text-sm text-muted">
                <span className="tabular-nums">
                  {s.xp} EXP · còn {s.level.need - s.level.into} EXP lên cấp {s.level.level + 1}
                </span>
                <ArrowRight className="size-4" aria-hidden />
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-warn">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {s.enabled ? "EXP và thành tích chưa bật (cần chạy file 0013_adventure.sql)." : "Phần trò chơi đang tạm tắt (trong thời gian nghiên cứu)."} Bản đồ và bài học vẫn dùng bình thường.
            </p>
          )}
        </Link>
      </section>

      {(s.daily || rec) && (
        <section aria-label="Hôm nay" className="grid gap-3 md:grid-cols-2">
          {s.daily && (
            <Suggestion
              icon={<CalendarCheck className="size-5" aria-hidden />}
              eyebrow={dailyDone ? "Thử thách hôm nay · đã xong" : `Thử thách hôm nay · +${s.daily.xp} EXP`}
              title={s.daily.action.kind === "game" ? GAME_INFO[s.daily.action.game].titleVi : "Hoàn thành một nhiệm vụ"}
              body={s.daily.reasonVi + (dailyDone ? "" : " Nghỉ hôm nay cũng không mất gì.")}
              href={s.daily.action.kind === "game" ? `/student/phieu-luu/tro-choi/${s.daily.action.game}?m=${mod.id}` : null}
              done={!!dailyDone}
              game={s.daily.action.kind === "game" ? s.daily.action.game : null}
            />
          )}
          {rec && (
            <Suggestion
              icon={<Compass className="size-5" aria-hidden />}
              eyebrow={rec.skill ? `Gợi ý theo kỹ năng · ${SKILL_VI[rec.skill]}` : "Gợi ý"}
              title={
                rec.action.kind === "game"
                  ? GAME_INFO[rec.action.game].titleVi
                  : rec.action.kind === "knowledge"
                      ? "Ôn lại ở Kho kiến thức"
                      : "Làm tiếp nhiệm vụ trên bản đồ"
              }
              body={rec.reasonVi}
              href={
                rec.action.kind === "game"
                  ? `/student/phieu-luu/tro-choi/${rec.action.game}?m=${mod.id}`
                  : rec.action.kind === "knowledge"
                      ? `/student/module/${mod.id}/kien-thuc`
                      : null
              }
              done={false}
              game={rec.action.kind === "game" ? rec.action.game : null}
            />
          )}
        </section>
      )}

      <section aria-labelledby="map-title" className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="map-title" className="text-2xl font-semibold tracking-tight">
            Bản đồ Unit {mod.unitNo}: <span lang="en">{mod.title}</span>
          </h2>
          <p className="text-sm text-muted">
            {completed.length}/14 nhiệm vụ · {finished.length}/5 mini-game
          </p>
        </div>
        <AdventureMap
          moduleId={mod.id}
          unitNo={mod.unitNo}
          states={states}
          inProgress={!!open}
          gameXpTaken={gameXpTaken}
          cosmetics={{ flag: s.cosmetics.flag, season: s.cosmetics.season as Season, trail: s.cosmetics.trail as Trail }}
        />
        <p className="text-sm text-muted">
          Bấm một nhiệm vụ để xem câu chuyện và bắt đầu. Nhiệm vụ mở lần lượt; mini-game hình vuông là phần ôn tùy chọn. Kết quả học và tiến bộ thật ở{" "}
          <Link href="/student/ky-nang" className="font-semibold text-brand-strong hover:underline">
            Kỹ năng
          </Link>{" "}
          và{" "}
          <Link href={`/student/module/${mod.id}`} className="font-semibold text-brand-strong hover:underline">
            kết quả Unit
          </Link>
          .
        </p>
      </section>

      {completion && <CompletionDialog data={completion} />}
    </div>,
  );
}

function Suggestion({ icon, eyebrow, title, body, href, done, game }: { icon: React.ReactNode; eyebrow: string; title: string; body: string; href: string | null; done: boolean; game: GameKey | null }) {
  const Icon = game ? GAME_ICON[game] : Sparkles;
  const inner = (
    <>
      <span aria-hidden className={`grid size-12 shrink-0 place-items-center rounded-2xl ${done ? "bg-brand text-on-brand" : "bg-gold text-ink"}`}>
        <Icon className="size-6" />
      </span>
      <span className="grid gap-0.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
          {icon}
          {eyebrow}
        </span>
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-sm text-muted">{body}</span>
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="press flex items-start gap-4 rounded-3xl bg-tint p-5 hover:bg-brand-soft">
      {inner}
    </Link>
  ) : (
    <div className="flex items-start gap-4 rounded-3xl bg-tint p-5">{inner}</div>
  );
}
