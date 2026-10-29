import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, Clock, ListChecks, Mic } from "lucide-react";
import AppShell, { STUDENT_NAV } from "@/components/AppShell";
import { SubmitButton } from "@/components/form";
import { requireRole } from "@/lib/auth";
import { requirePracticeAccess } from "@/lib/research/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_SIZE } from "@/lib/speaking/select";
import { startSession } from "../actions";

export const metadata: Metadata = { title: "Giới thiệu buổi luyện" };
export const dynamic = "force-dynamic";

/** Màn giới thiệu + khởi động: chủ đề, từ vựng và khung câu vừa đủ để nhớ lại, rồi bắt đầu ngay. */
export default async function UnitIntroPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await requireRole("student");
  await requirePracticeAccess(profile.id);
  const { unitId } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(unitId)) notFound();

  const supabase = await createClient();
  // RLS: Unit chưa duyệt hoặc khác khối thì không đọc được.
  const { data: unit } = await supabase
    .from("units")
    .select("id, grade, unit_no, title, title_vi, topic")
    .eq("id", unitId)
    .maybeSingle();
  if (!unit || unit.grade !== profile.grade) notFound();

  const [{ data: vocab }, { data: frames }, { data: open }] = await Promise.all([
    supabase.from("vocab").select("key, en, vi").eq("unit_id", unitId).order("key"),
    supabase.from("frames").select("key, text, vi, grammar_note").eq("unit_id", unitId).order("key").limit(3),
    supabase
      .from("practice_sessions")
      .select("id")
      .eq("student_id", profile.id)
      .eq("unit_id", unitId)
      .eq("status", "in_progress")
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Học sinh" homeHref="/student" nav={STUDENT_NAV} current="/student/practice">
      <div className="grid gap-10">
        <div className="grid gap-3">
          <Link href="/student/practice" className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            Tất cả Unit
          </Link>
          <p className="text-muted">Unit {unit.unit_no}</p>
          <h1 lang="en" className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {unit.title}
          </h1>
          <p className="max-w-prose text-lg text-muted">{unit.topic}</p>
        </div>

        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="size-5 text-brand-strong" aria-hidden />
            <dt className="sr-only">Số câu</dt>
            <dd className="font-bold">{SESSION_SIZE} câu hỏi</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-brand-strong" aria-hidden />
            <dt className="sr-only">Thời lượng</dt>
            <dd className="font-bold">Khoảng 10–15 phút</dd>
          </div>
          <div className="flex items-center gap-2">
            <Mic className="size-5 text-brand-strong" aria-hidden />
            <dt className="sr-only">Chế độ</dt>
            <dd className="font-bold">Trả lời câu hỏi bằng giọng nói</dd>
          </div>
        </dl>

        <section aria-labelledby="warmup" className="grid gap-4">
          <div className="grid gap-1">
            <h2 id="warmup" className="text-2xl font-extrabold tracking-tight">
              Khởi động
            </h2>
            <p className="text-muted">Đọc lướt để nhớ lại. Không cần học thuộc.</p>
          </div>
          <ul className="flex flex-wrap gap-2">
            {(vocab ?? []).map((v) => (
              <li key={v.key} className="rounded-full border border-line bg-surface px-4 py-2">
                <span lang="en" className="font-bold">
                  {v.en}
                </span>
                <span className="text-muted">: {v.vi}</span>
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-line border-y border-line">
            {(frames ?? []).map((f) => (
              <li key={f.key} className="grid gap-1 py-4">
                <p lang="en" className="text-lg font-extrabold">
                  {f.text}
                </p>
                <p className="text-muted">
                  {f.vi} <span className="text-sm">({f.grammar_note})</span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 rounded-2xl bg-sunken px-6 py-6 sm:px-8">
          <p className="max-w-prose">
            <strong>Mục tiêu:</strong> trả lời mỗi câu bằng một vài câu hoàn chỉnh, có thêm lý do hoặc ví dụ khi được hỏi “why”. Bí ý thì
            mở gợi ý từng bước; dùng gợi ý không bị trừ điểm.
          </p>
          {error === "start" && (
            <p role="alert" className="flex items-start gap-2 font-semibold text-danger">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              Chưa mở được buổi luyện. Hãy thử lại.
            </p>
          )}
          <form action={startSession}>
            <input type="hidden" name="unitId" value={unit.id} />
            <SubmitButton pendingLabel="Đang chuẩn bị…">{open ? "Tiếp tục buổi đang làm" : "Bắt đầu luyện tập"}</SubmitButton>
          </form>
          <p className="text-sm text-muted">Trang sẽ xin quyền dùng micro ở câu đầu tiên.</p>
        </section>
      </div>
    </AppShell>
  );
}
