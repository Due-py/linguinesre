import type { Metadata } from "next";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import StudentHome, { type RecentLesson, type RoadmapUnit } from "@/components/StudentHome";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUnitsForGrade } from "@/lib/practice";
import { listModules, moduleAttempts, moduleProgress, moduleToday, toHistory } from "@/lib/module/server";
import { errorCounts } from "@/lib/module/plan";
import { ERROR_TAGS } from "@/lib/module/schema";
import { reactionTrend } from "@/lib/reaction";
import ResearchHome from "@/components/ResearchHome";
import ModeHome from "@/components/ModeHome";
import { getParticipant, testState } from "@/lib/research/server";
import CompanionCard from "@/components/penguin/CompanionCard";
import { adventureState } from "@/lib/adventure/server";
import { DAY_INFO } from "@/lib/module/plan";
import Link from "next/link";
import { Mic } from "lucide-react";
import { vnDay } from "@/lib/research/modes";
import { hasCheckin, listModeSessions, modeAccess, researchSettings, today as vnToday } from "@/lib/research/modeServer";

export const metadata: Metadata = { title: "Tổng quan" };
export const dynamic = "force-dynamic";

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ join?: string; luyen?: string }> }) {
  const profile = await requireRole("student");
  const { join, luyen } = await searchParams;

  // Học sinh tham gia nghiên cứu: bài kiểm tra đến hạn → làm bài; giai đoạn luyện → chế độ A hoặc B được gán;
  // còn lại (chưa chia nhóm, chưa mở) → trang chờ. Trang chính đầy đủ chỉ mở sau khi nghiên cứu kết thúc (study_over).
  // Trang nghiên cứu giữ giao diện cũ (theme-classic) tới hết nghiên cứu để hai lần kiểm tra và hai chế độ không đổi giữa chừng.
  const participant = await getParticipant(profile.id);
  if (participant) {
    const settings = await researchSettings();
    const [state, access] = await Promise.all([testState(profile.id, participant), modeAccess(profile.id, participant, settings)]);
    if (access.ok && !settings.studyOver) {
      const [sessions, checked] = await Promise.all([listModeSessions(profile.id), hasCheckin(profile.id)]);
      return (
        <div className="theme-classic">
          <AppShell name={participant.code} roleLabel="Học sinh" homeHref="/student">
            <ModeHome code={participant.code} mode={access.mode} sessions={sessions} today={vnToday()} needsCheckin={!checked} notice={luyen} tests={state} />
          </AppShell>
        </div>
      );
    }
    if (!access.ok) {
      return (
        <div className="theme-classic">
          <AppShell name={participant.code} roleLabel="Học sinh" homeHref="/student">
            <ResearchHome p={participant} state={state} />
          </AppShell>
        </div>
      );
    }
  }

  // RLS: học sinh chỉ thấy lớp mình đã vào và việc học của mình. Mọi việc học đi qua Hành trình (luyện tự do đã bỏ 09/11).
  const supabase = await createClient();
  const [{ data: classes }, units, modules, module, progress] = await Promise.all([
    supabase.from("classes").select("id, name").eq("status", "active").order("created_at"),
    profile.grade ? listUnitsForGrade(profile.grade) : Promise.resolve([]),
    profile.grade ? listModules(profile.grade) : Promise.resolve([]),
    profile.grade ? moduleToday(profile.id, profile.grade) : Promise.resolve(null),
    moduleProgress(profile.id),
  ]);
  // Lỗi hay gặp trong module đang học (Error Memory): chỉ khi đã có lượt làm có nhãn lỗi.
  const moduleErrors = module?.started
    ? [...errorCounts(toHistory(await moduleAttempts(profile.id, module.id))).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag, count]) => ({ label: ERROR_TAGS[tag], count }))
    : [];
  const moduleOf = new Map(modules.map((m) => [m.unitId, m.id]));
  // Linguine và tiến trình phiêu lưu (phần trò chơi, tách khỏi số đo học). Đồng bộ phần thưởng từ dữ liệu thật.
  const adv = await adventureState(profile.id, profile.grade, module?.id ?? null);
  const now = new Date();
  const todayVn = vnDay(now);
  const doneToday = adv.lessons.some((l) => l.completed_at && vnDay(new Date(l.completed_at)) === todayVn);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Ho_Chi_Minh" }).format(now));

  // Lộ trình: theo tiến độ module (14 ngày xong = đã xong, đã học ít nhất một ngày = đang học, module của "hôm nay" = tiếp theo).
  const roadmap: RoadmapUnit[] = units.map((u) => {
    const moduleId = moduleOf.get(u.id) ?? null;
    const p = moduleId ? progress.get(moduleId) : undefined;
    const state: RoadmapUnit["state"] = !moduleId ? "todo" : (p?.daysDone ?? 0) >= 14 ? "done" : p ? "in_progress" : module?.id === moduleId ? "next" : "todo";
    return { id: u.id, unitNo: u.unitNo, title: u.title, titleVi: u.titleVi, state, moduleId, daysDone: p?.daysDone ?? 0 };
  });

  // Nhiệm vụ đã xong (mới trước) và thời gian bắt đầu nói ở giữa của từng nhiệm vụ: lượt đầu các câu em tự trả lời.
  const unitOf = new Map(modules.map((m) => [m.id, m]));
  const done = adv.lessons.filter((l) => l.status === "completed" && l.completed_at).sort((a, b) => b.completed_at!.localeCompare(a.completed_at!));
  const recent: RecentLesson[] = done.slice(0, 4).map((l) => ({
    id: l.id,
    href: `/student/phieu-luu?m=${l.module_id}`,
    title: `Ngày ${l.day}: ${DAY_INFO[l.day].titleVi}`,
    sub: `Unit ${unitOf.get(l.module_id)?.unitNo ?? ""} · ${unitOf.get(l.module_id)?.title ?? ""}`,
    at: l.completed_at!,
  }));
  const reaction = reactionTrend(
    done.map((l) => ({
      id: l.id,
      completedAt: l.completed_at!,
      unitTitle: `Ngày ${l.day} · Unit ${unitOf.get(l.module_id)?.unitNo ?? ""}`,
      answers: adv.attempts
        .filter((a) => a.lessonId === l.id && (a.kind === "speak" || a.kind === "roleplay") && a.turn === 0 && a.attemptNo === 1 && a.measures?.unclear !== true)
        .map((a) => ({ questionId: `${a.step}`, attemptNo: 1, thinkMs: a.thinkMs })),
    })),
  );

  // Bài thi thử nói (giao một lần bằng npm run mocktest:send): thẻ nhắc khi em chưa nộp. RLS: chỉ đọc lời mời của chính em.
  const { data: mock } = await supabase.from("mock_test_invites").select("completed_at").eq("student_id", profile.id).maybeSingle();

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student">
      {mock && !mock.completed_at && (
        <Link
          href="/student/thi-thu"
          className="press mb-8 flex items-center gap-4 rounded-3xl bg-gold-soft px-5 py-4 hover:shadow-card"
        >
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-gold text-ink">
            <Mic className="size-6" />
          </span>
          <span className="grid gap-0.5">
            <span className="text-lg font-semibold">Bài thi thử nói đang chờ em</span>
            <span className="text-sm text-muted">10 câu hỏi về các Unit đầu năm, không tính giờ, không có điểm tổng. Bấm để làm bài.</span>
          </span>
        </Link>
      )}
      <StudentHome
        name={profile.displayName ?? ""}
        grade={profile.grade}
        classes={classes ?? []}
        joinFailed={join === "failed"}
        module={module}
        roadmap={roadmap}
        recent={recent}
        lessonsDone={done.length}
        reaction={reaction}
        moduleErrors={moduleErrors}
        companion={
          <CompanionCard
            s={adv}
            name={profile.displayName ?? ""}
            nextVi={module?.nextDay ? `ngày ${module.nextDay}: ${DAY_INFO[module.nextDay].titleVi.toLowerCase()}` : null}
            doneToday={doneToday}
            hour={hour}
          />
        }
      />
    </AppShell>
  );
}
