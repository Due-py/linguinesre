import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import TestRunner from "@/components/TestRunner";
import { SubmitButton } from "@/components/form";
import { requireRole } from "@/lib/auth";
import { getParticipant, testState } from "@/lib/research/server";
import { startTest } from "./actions";

export const metadata: Metadata = { title: "Bài kiểm tra nói" };
export const dynamic = "force-dynamic";

const PHASE_LABEL = { pre: "Bài kiểm tra nói lần 1", post: "Bài kiểm tra nói lần 2" } as const;

/** Bài kiểm tra phản xạ nói của học sinh tham gia nghiên cứu. Học sinh không tham gia thì không có trang này. */
export default async function TestPage() {
  const profile = await requireRole("student");
  const p = await getParticipant(profile.id);
  if (!p) redirect("/student");
  const state = await testState(profile.id, p);
  const attempt = state.due ? state[state.due] : null;

  // Đang làm dở: vào thẳng màn hình làm bài (tiếp tục từ câu chưa ghi âm).
  if (state.due && attempt?.status === "in_progress") {
    return <TestRunner attemptId={attempt.id} phaseLabel={PHASE_LABEL[state.due]} />;
  }

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student">
      {state.due ? (
        <div className="grid max-w-prose gap-6">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{PHASE_LABEL[state.due]}</h1>
          <p className="text-lg">
            Bài có 2 câu làm mẫu và 15 câu hỏi, mất khoảng 8 phút. Làm ở chỗ yên tĩnh, đeo tai nghe có micro nếu có. Người coi thi
            sẽ hướng dẫn bạn.
          </p>
          <p className="text-muted">Khi đã bắt đầu, hãy làm liền một mạch. Nếu máy bị tắt giữa chừng, mở lại trang này để làm tiếp từ câu chưa ghi âm.</p>
          <form action={startTest}>
            <SubmitButton pendingLabel="Đang mở bài…">Bắt đầu bài kiểm tra</SubmitButton>
          </form>
        </div>
      ) : (
        <div className="grid max-w-prose gap-4">
          <CircleCheck className="size-10 text-brand-strong" aria-hidden />
          <h1 className="text-4xl font-extrabold tracking-tight">Bạn đã làm xong bài kiểm tra</h1>
          <p className="text-lg text-muted">
            {state.post?.status === "completed"
              ? "Bạn đã làm xong cả hai lần kiểm tra. Cảm ơn bạn đã tham gia."
              : "Lần kiểm tra tiếp theo sẽ mở khi nhóm nghiên cứu thông báo."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
