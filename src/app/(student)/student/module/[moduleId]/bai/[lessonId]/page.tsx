import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import LessonRunner, { type SavedRow } from "@/components/module/LessonRunner";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { createClient } from "@/lib/supabase/server";
import { getModule, ownLesson } from "@/lib/module/server";
import { firstOpenStep } from "@/lib/module/progress";

export const metadata: Metadata = { title: "Bài học hôm nay" };
export const dynamic = "force-dynamic";

/** Màn hình học một ngày của module. Mở lại giữa chừng thì học tiếp từ bước đầu tiên chưa xong. */
export default async function LessonPage({ params }: { params: Promise<{ moduleId: string; lessonId: string }> }) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { moduleId, lessonId } = await params;
  const lesson = await ownLesson(lessonId, profile.id);
  if (!lesson || lesson.moduleId !== moduleId) notFound();
  if (lesson.status === "completed") redirect(`/student/phieu-luu?m=${moduleId}`);
  const m = await getModule(moduleId);
  if (!m) notFound();

  // RLS: chỉ đọc được lượt của chính mình.
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_attempts")
    .select("id, step, turn, attempt_no, answer, reply, correct")
    .eq("lesson_id", lesson.id)
    .eq("student_id", profile.id)
    .order("created_at");
  const rows: SavedRow[] = (data ?? []).map((r) => ({ step: r.step, turn: r.turn, attemptNo: r.attempt_no, attemptId: r.id, answer: r.answer, reply: r.reply, correct: r.correct }));
  const open = firstOpenStep(lesson.plan.steps, rows, m.content);

  return (
    <LessonRunner
      lessonId={lesson.id}
      moduleId={m.id}
      day={lesson.day}
      titleVi={lesson.plan.titleVi}
      notesVi={lesson.plan.notesVi}
      steps={lesson.plan.steps}
      content={m.content}
      rows={rows}
      startAt={open ?? lesson.plan.steps.length}
    />
  );
}
