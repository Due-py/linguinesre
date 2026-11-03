import type { Metadata } from "next";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import StudentHome, { type RoadmapUnit } from "@/components/StudentHome";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUnitsForGrade, todayTask } from "@/lib/practice";
import { listModules, moduleAttempts, moduleProgress, moduleToday, toHistory } from "@/lib/module/server";
import { errorCounts } from "@/lib/module/plan";
import { ERROR_TAGS } from "@/lib/module/schema";
import { improvementFocus, listSessions, reactionSessions } from "@/lib/sessions";
import { reactionTrend } from "@/lib/reaction";
import ResearchHome from "@/components/ResearchHome";
import ModeHome from "@/components/ModeHome";
import { getParticipant, testState } from "@/lib/research/server";
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

  // RLS: học sinh chỉ thấy lớp mình đã vào và buổi luyện của mình.
  const supabase = await createClient();
  const [{ data: classes }, today, units, sessions, focus, reactionData, modules, module, progress] = await Promise.all([
    supabase.from("classes").select("id, name").eq("status", "active").order("created_at"),
    profile.grade ? todayTask(profile.id, profile.grade) : Promise.resolve({ kind: "none" as const }),
    profile.grade ? listUnitsForGrade(profile.grade) : Promise.resolve([]),
    listSessions(profile.id, 50),
    improvementFocus(profile.id),
    reactionSessions(profile.id),
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

  // Lộ trình: Unit có module thì theo tiến độ module (14 ngày xong = đã xong, đã học ít nhất một ngày = đang học, module của
  // "hôm nay" = tiếp theo); Unit chỉ có luyện tự do thì theo buổi luyện như trước.
  const nextHref = today.kind === "start" ? today.href : null;
  const roadmap: RoadmapUnit[] = units.map((u) => {
    const moduleId = moduleOf.get(u.id) ?? null;
    const p = moduleId ? progress.get(moduleId) : undefined;
    if (moduleId) {
      const state: RoadmapUnit["state"] = (p?.daysDone ?? 0) >= 14 ? "done" : p ? "in_progress" : module?.id === moduleId ? "next" : "todo";
      return { id: u.id, unitNo: u.unitNo, title: u.title, titleVi: u.titleVi, state, moduleId, daysDone: p?.daysDone ?? 0 };
    }
    const mine = sessions.filter((s) => s.unitId === u.id);
    const state: RoadmapUnit["state"] = mine.some((s) => s.status === "completed")
      ? "done"
      : mine.some((s) => s.status === "in_progress")
        ? "in_progress"
        : nextHref === `/student/practice/${u.id}`
          ? "next"
          : "todo";
    return { id: u.id, unitNo: u.unitNo, title: u.title, titleVi: u.titleVi, state, moduleId: null };
  });

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student">
      <StudentHome
        name={profile.displayName ?? ""}
        grade={profile.grade}
        classes={classes ?? []}
        joinFailed={join === "failed"}
        today={today}
        module={module}
        roadmap={roadmap}
        recent={sessions.slice(0, 3)}
        focus={focus}
        reaction={reactionTrend(reactionData)}
        moduleErrors={moduleErrors}
      />
    </AppShell>
  );
}
