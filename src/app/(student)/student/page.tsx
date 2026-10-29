import type { Metadata } from "next";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import StudentHome, { type RoadmapUnit } from "@/components/StudentHome";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listUnitsForGrade, todayTask } from "@/lib/practice";
import { improvementFocus, listSessions } from "@/lib/sessions";
import ResearchHome from "@/components/ResearchHome";
import { getParticipant, testState } from "@/lib/research/server";

export const metadata: Metadata = { title: "Tổng quan" };
export const dynamic = "force-dynamic";

export default async function StudentPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const profile = await requireRole("student");
  const { join } = await searchParams;

  // Học sinh tham gia nghiên cứu: chỉ thấy trang chính đầy đủ khi đã thuộc chế độ A và không có bài kiểm tra đến hạn.
  const participant = await getParticipant(profile.id);
  if (participant) {
    const state = await testState(profile.id, participant);
    if (state.due || participant.arm !== "A") {
      return (
        <AppShell name={participant.code} roleLabel="Học sinh" homeHref="/student">
          <ResearchHome p={participant} state={state} />
        </AppShell>
      );
    }
  }

  // RLS: học sinh chỉ thấy lớp mình đã vào và buổi luyện của mình.
  const supabase = await createClient();
  const [{ data: classes }, today, units, sessions, focus] = await Promise.all([
    supabase.from("classes").select("id, name").eq("status", "active").order("created_at"),
    profile.grade ? todayTask(profile.id, profile.grade) : Promise.resolve({ kind: "none" as const }),
    profile.grade ? listUnitsForGrade(profile.grade) : Promise.resolve([]),
    listSessions(profile.id, 50),
    improvementFocus(profile.id),
  ]);

  // Lộ trình: Unit có buổi hoàn thành = xong; có buổi dở = đang làm; Unit của "việc hôm nay" = tiếp theo.
  const nextHref = today.kind === "start" ? today.href : null;
  const roadmap: RoadmapUnit[] = units.map((u) => {
    const mine = sessions.filter((s) => s.unitId === u.id);
    const state: RoadmapUnit["state"] = mine.some((s) => s.status === "completed")
      ? "done"
      : mine.some((s) => s.status === "in_progress")
        ? "in_progress"
        : nextHref === `/student/practice/${u.id}`
          ? "next"
          : "todo";
    return { id: u.id, unitNo: u.unitNo, title: u.title, titleVi: u.titleVi, state };
  });

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student">
      <StudentHome
        name={profile.displayName ?? ""}
        grade={profile.grade}
        goal={profile.goal}
        classes={classes ?? []}
        joinFailed={join === "failed"}
        today={today}
        roadmap={roadmap}
        recent={sessions.slice(0, 3)}
        focus={focus}
      />
    </AppShell>
  );
}
