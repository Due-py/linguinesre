import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, CircleCheck, CircleMinus } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import MockTestRunner from "@/components/MockTestRunner";
import { Chip, Eyebrow, Highlight } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { mockTestFor, type MockChecks } from "@/lib/mockTest";

export const metadata: Metadata = { title: "Bài thi thử nói" };
export const dynamic = "force-dynamic";

/**
 * Bài thi thử nói một lần. Chỉ học sinh được giao bài (mock_test_invites) mới mở được. Sau khi nộp: xem lại kết quả từng câu
 * (đo bằng quy tắc: thành câu, có lý do, không đọc lại câu hỏi). Không có điểm tổng, không đo thời gian bắt đầu nói.
 */
export default async function MockTestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const profile = await requireRole("student");
  const { error } = await searchParams;
  const admin = createAdminClient();
  const { data: invite } = await admin.from("mock_test_invites").select("grade, completed_at").eq("student_id", profile.id).maybeSingle();
  const test = mockTestFor(invite?.grade);
  const shell = (children: React.ReactNode) => (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student">
      {children}
    </AppShell>
  );
  if (!invite || !test)
    return shell(
      <div className="grid gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Bài thi thử nói</h1>
        <p className="text-muted">Em chưa được giao bài thi thử nói.</p>
        <Link href="/student" className="font-medium text-brand hover:underline">
          Về trang chủ
        </Link>
      </div>,
    );

  const { data: rows } = await admin.from("mock_test_answers").select("question_id, transcript, checks").eq("student_id", profile.id);
  const answers = Object.fromEntries((rows ?? []).map((r) => [r.question_id, { transcript: r.transcript ?? "", checks: r.checks as MockChecks }]));

  if (!invite.completed_at)
    return shell(
      <div className="grid gap-6">
        <header className="grid gap-3">
          <Eyebrow>Lớp {test.grade} · {test.topics}</Eyebrow>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Bài thi thử <Highlight>nói</Highlight>
          </h1>
          <p className="max-w-prose text-muted">
            10 câu hỏi về các Unit đầu năm. Mỗi câu: bấm nghe câu hỏi, suy nghĩ thoải mái, rồi bấm micro để trả lời bằng tiếng Anh. Không tính giờ, không
            có điểm tổng; câu nào chưa ưng thì nói lại được. Làm xong bấm “Nộp bài” để xem nhận xét.
          </p>
        </header>
        {error === "empty" && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">
            <CircleAlert className="size-5" aria-hidden />
            Em cần trả lời ít nhất một câu trước khi nộp bài.
          </p>
        )}
        <MockTestRunner questions={test.questions} initial={answers} />
      </div>,
    );

  const done = test.questions.filter((q) => answers[q.id]);
  const ok = done.filter((q) => answers[q.id].checks.ok).length;
  const reasonQs = test.questions.filter((q) => q.expectsReason && answers[q.id]);
  return shell(
    <div className="grid gap-6">
      <header className="grid gap-3">
        <Eyebrow>Lớp {test.grade} · Đã nộp bài</Eyebrow>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Kết quả bài thi thử <Highlight tone="green">nói</Highlight>
        </h1>
        <p className="max-w-prose text-muted">
          Em đã trả lời {done.length}/{test.questions.length} câu; {ok} câu thành câu đủ ý. Với câu cần lý do, em nêu được lý do ở{" "}
          {reasonQs.filter((q) => answers[q.id].checks.reason).length}/{reasonQs.length} câu. Đây là nhận xét bằng quy tắc (đếm từ, tìm “because”…),
          không phải điểm.
        </p>
      </header>
      <ol className="grid gap-3">
        {test.questions.map((q, i) => {
          const a = answers[q.id];
          return (
            <li key={q.id} className="grid gap-2 rounded-3xl border border-line bg-surface p-5">
              <p className="text-sm font-medium text-muted">Câu {i + 1}</p>
              <p lang="en" className="text-lg font-medium">
                {q.text}
              </p>
              {a ? (
                <>
                  <p lang="en" className="rounded-2xl bg-sunken px-4 py-3">
                    “{a.transcript}”
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip tone={a.checks.sentence ? "green" : "yellow"} icon={a.checks.sentence ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}>
                      {a.checks.echo ? "Đọc lại câu hỏi" : a.checks.sentence ? `Thành câu (${a.checks.words} từ)` : `Còn ngắn (${a.checks.words} từ)`}
                    </Chip>
                    {a.checks.reason !== null && (
                      <Chip tone={a.checks.reason ? "green" : "yellow"} icon={a.checks.reason ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}>
                        {a.checks.reason ? "Có nêu lý do" : "Chưa nêu lý do (thử thêm because…)"}
                      </Chip>
                    )}
                  </div>
                </>
              ) : (
                <Chip icon={<CircleMinus className="size-4" aria-hidden />}>Em chưa trả lời câu này</Chip>
              )}
            </li>
          );
        })}
      </ol>
      <Link href="/student/phieu-luu" className="press inline-flex min-h-12 w-fit items-center rounded-full bg-brand px-6 font-medium text-on-brand hover:shadow-card">
        Luyện tiếp trên Hành trình
      </Link>
    </div>,
  );
}
