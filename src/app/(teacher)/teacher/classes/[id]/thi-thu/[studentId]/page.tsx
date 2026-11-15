import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Sparkles } from "lucide-react";
import AppShell, { TEACHER_NAV } from "@/components/AppShell";
import { Chip, Eyebrow } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mockTestFor, type MockChecks } from "@/lib/mockTest";
import { qLabel, SCORE_GUIDE } from "@/lib/mockGrading";
import { RULES, type RuleId } from "@/lib/mockAiGrade";
import { saveMockReview, setMockScore } from "../actions";

export const metadata: Metadata = { title: "Chấm bài thi thử" };
export const dynamic = "force-dynamic";

const KIND = { personal: "Bản thân", reason: "Nêu lý do", situation: "Tình huống" } as const;
const SCORE_ON: Record<number, string> = { 2: "bg-success text-white", 1: "bg-warn text-white", 0: "bg-danger text-white" };
const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });

/**
 * Chấm bài thi thử nói của một học sinh: nghe bản ghi, đọc lời máy chép, xem số đo của máy (tách riêng), rồi thầy cô chấm
 * 0 · 1 · 2 từng câu. RLS: chỉ học sinh trong lớp của giáo viên này; ghi âm đọc qua link tạm 1 giờ.
 */
export default async function MockGradePage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const profile = await requireRole("teacher");
  const { id, studentId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^[0-9a-f-]{36}$/.test(studentId)) notFound();
  const supabase = await createClient();
  const { data: cls } = await supabase.from("classes").select("id, name").eq("id", id).maybeSingle();
  if (!cls) notFound();
  const { data: members } = await supabase.from("class_members").select("student_id, profiles(display_name, grade)").eq("class_id", id);
  const list = ((members ?? []) as unknown as { student_id: string; profiles: { display_name: string | null; grade: number | null } | null }[])
    .map((m) => ({ id: m.student_id, name: m.profiles?.display_name ?? "Chưa có tên", grade: m.profiles?.grade ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const me = list.find((m) => m.id === studentId);
  if (!me) notFound();

  const [{ data: invites }, { data: answers }, grades, review, aiRows] = await Promise.all([
    supabase.from("mock_test_invites").select("student_id, grade, completed_at").in("student_id", list.map((m) => m.id)),
    supabase.from("mock_test_answers").select("question_id, transcript, checks, audio_path, updated_at").eq("student_id", studentId),
    supabase.from("mock_test_grades").select("question_id, score").eq("student_id", studentId),
    supabase.from("mock_test_reviews").select("note, done_at").eq("student_id", studentId).maybeSingle(),
    supabase.from("mock_test_ai_grades").select("question_id, score, rule, judgement, model").eq("student_id", studentId),
  ]);
  type AiRow = { question_id: string; score: number; rule: RuleId; judgement: { note_vi?: string; evidence?: string } | null; model: string };
  const aiBy = new Map(((aiRows.error ? [] : aiRows.data) as AiRow[] | null ?? []).map((r) => [r.question_id, r]));
  const invited = (invites ?? []).filter((i) => list.some((m) => m.id === i.student_id));
  const mine = invited.find((i) => i.student_id === studentId);
  const order = list.filter((m) => invited.some((i) => i.student_id === m.id));
  const at = order.findIndex((m) => m.id === studentId);
  const prev = at > 0 ? order[at - 1] : null;
  const next = at >= 0 && at < order.length - 1 ? order[at + 1] : null;
  const test = mockTestFor(mine?.grade ?? me.grade);
  const missing = !!grades.error;
  const score = new Map((grades.data ?? []).map((g) => [g.question_id, g.score as number]));
  const byQ = new Map((answers ?? []).map((a) => [a.question_id, a]));
  const paths = (answers ?? []).map((a) => a.audio_path).filter((p): p is string => !!p);
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("recordings").createSignedUrls(paths, 3600);
    for (const x of signed ?? []) if (x.path && x.signedUrl && !x.error) urls.set(x.path, x.signedUrl);
  }
  const done = !!review.data?.done_at;
  const back = `/teacher/classes/${id}#thi-thu`;

  return (
    <AppShell name={profile.displayName ?? ""} roleLabel="Giáo viên" homeHref="/teacher" nav={TEACHER_NAV} current="/teacher">
      <div className="grid gap-8">
        <div className="grid gap-3">
          <Link href={back} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-medium text-muted hover:text-ink">
            <ArrowLeft className="size-4" aria-hidden />
            Về lớp {cls.name}
          </Link>
          <Eyebrow>Chấm bài thi thử nói{test ? ` · lớp ${test.grade}` : ""}</Eyebrow>
          <h1 className="text-4xl font-semibold tracking-tight">{me.name}</h1>
          <div className="flex flex-wrap gap-2">
            {!mine ? (
              <Chip tone="grey">Không được giao bài</Chip>
            ) : (
              <Chip tone={mine.completed_at ? "green" : "yellow"}>{mine.completed_at ? `Đã nộp ${dateFmt.format(new Date(mine.completed_at))}` : "Chưa nộp"}</Chip>
            )}
            <Chip tone="grey">Đã nói {byQ.size}/10 câu</Chip>
            <Chip tone="grey">AI chấm {aiBy.size}/10 câu</Chip>
            <Chip tone="grey">Thầy cô chấm {score.size}/10 câu</Chip>
            {done && (
              <Chip tone="green" icon={<CheckCircle2 className="size-4" aria-hidden />}>
                Đã chấm xong
              </Chip>
            )}
          </div>
        </div>

        {missing ? (
          <p className="max-w-prose rounded-3xl bg-warn-soft px-5 py-4">Phần chấm chưa bật: cần chạy migration 0018 (supabase/migrations/0018_mock_test_grading.sql) trong SQL Editor của Supabase.</p>
        ) : !test ? (
          <p className="max-w-prose rounded-3xl bg-tint px-5 py-4 text-muted">Không có đề thi thử cho khối của bạn này.</p>
        ) : (
          <>
            <details className="rounded-3xl bg-tint px-5 py-4 text-sm">
              <summary className="cursor-pointer font-medium">Thang chấm mỗi câu (0 · 1 · 2)</summary>
              <ul className="mt-2 grid gap-1">
                {([2, 1, 0] as const).map((k) => (
                  <li key={k}>
                    <span className="font-medium">{k} điểm:</span> {SCORE_GUIDE[k]}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted">Học sinh làm trên giấy hoặc nói trực tiếp vẫn chấm được ở đây, kể cả câu chưa có bản ghi.</p>
            </details>

            <ol className="grid gap-4">
              {test.questions.map((q) => {
                const a = byQ.get(q.id);
                const c = (a?.checks ?? null) as MockChecks | null;
                const cur = score.get(q.id);
                const url = a?.audio_path ? urls.get(a.audio_path) : undefined;
                const ai = aiBy.get(q.id);
                return (
                  <li key={q.id} id={q.id} className="grid gap-4 rounded-3xl border border-line p-5 lg:grid-cols-[1fr_16rem]">
                    <div className="grid content-start gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold">{qLabel(q.id)}</span>
                        <Chip tone="grey">{KIND[q.kind]}</Chip>
                        {q.expectsReason && <Chip tone="yellow">Cần lý do</Chip>}
                      </div>
                      <p lang="en" className="text-lg">
                        {q.text}
                      </p>
                      {!a ? (
                        <p className="text-sm text-muted">Em chưa nói câu này trên web.</p>
                      ) : (
                        <>
                          {url ? <audio controls preload="none" src={url} className="w-full max-w-md" aria-label={`Bản ghi ${qLabel(q.id)} của ${me.name}`} /> : <p className="text-sm text-muted">Không mở được bản ghi.</p>}
                          <div className="grid gap-1 rounded-2xl bg-tint px-4 py-3">
                            <span className="text-sm text-muted">Lời máy chép</span>
                            <p lang="en">{a.transcript || <span className="text-muted">(máy không chép được lời)</span>}</p>
                          </div>
                          {c && (
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <span className="inline-flex items-center gap-1 text-muted">
                                <Bot className="size-4" aria-hidden />
                                Máy đo:
                              </span>
                              <Chip tone="grey">{c.words} từ</Chip>
                              <Chip tone={c.sentence ? "green" : "red"}>{c.sentence ? "Thành câu" : "Chưa thành câu"}</Chip>
                              {c.reason !== null && <Chip tone={c.reason ? "green" : "red"}>{c.reason ? "Có lý do" : "Chưa có lý do"}</Chip>}
                              {c.echo && <Chip tone="red">Đọc lại câu hỏi</Chip>}
                            </div>
                          )}
                        </>
                      )}
                      {ai && (
                        <div className="grid gap-1 rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Sparkles className="size-4 text-brand" aria-hidden />
                            AI chấm gợi ý: {ai.score} điểm · {ai.rule}: {RULES[ai.rule]?.vi}
                          </span>
                          {ai.judgement?.note_vi && <span>{ai.judgement.note_vi}</span>}
                          {ai.judgement?.evidence && (
                            <span className="text-muted">
                              Trích lời em: “<span lang="en">{ai.judgement.evidence}</span>”
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <form action={setMockScore} className="grid content-start gap-2">
                      <input type="hidden" name="classId" value={id} />
                      <input type="hidden" name="studentId" value={studentId} />
                      <input type="hidden" name="qid" value={q.id} />
                      <span className="text-sm font-medium">{cur !== undefined ? "Thầy cô đã chấm" : ai ? `Đang dùng điểm AI (${ai.score}), bấm để chấm lại` : "Thầy cô chấm"}</span>
                      <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Điểm ${qLabel(q.id)}`}>
                        {[0, 1, 2].map((k) => (
                          <button
                            key={k}
                            name="score"
                            value={String(k)}
                            aria-pressed={cur === k}
                            title={SCORE_GUIDE[k as 0 | 1 | 2]}
                            className={`min-h-12 rounded-2xl text-lg font-semibold tabular-nums ${cur === k ? SCORE_ON[k] : cur === undefined && ai?.score === k ? "border-2 border-dashed border-line-strong" : "border border-line hover:bg-tint"}`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                      {cur !== undefined && (
                        <button name="score" value="clear" className="min-h-11 w-fit text-sm text-muted underline hover:text-ink">
                          {ai ? "Bỏ điểm thầy cô, dùng lại điểm AI" : "Bỏ điểm câu này"}
                        </button>
                      )}
                    </form>
                  </li>
                );
              })}
            </ol>

            <form action={saveMockReview} className="grid gap-3 rounded-3xl border border-line p-5">
              <input type="hidden" name="classId" value={id} />
              <input type="hidden" name="studentId" value={studentId} />
              <label htmlFor="note" className="font-medium">
                Nhận xét ngắn (không bắt buộc)
              </label>
              <textarea id="note" name="note" maxLength={500} rows={3} defaultValue={review.data?.note ?? ""} className="rounded-2xl border border-line p-3" placeholder="Ví dụ: Trả lời đủ ý, cần nêu lý do rõ hơn ở câu Why." />
              <p className="text-sm text-muted">Đạt 2 điểm: {test.questions.filter((q) => (score.get(q.id) ?? aiBy.get(q.id)?.score) === 2).length}/10 câu (điểm thầy cô, câu chưa chấm lấy điểm AI). Trang web không cộng điểm tổng; file Excel tải về có cột tổng /20.</p>
              <div className="flex flex-wrap gap-2">
                <button name="done" value="1" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand px-5 font-medium text-on-brand hover:bg-brand-strong">
                  <CheckCircle2 className="size-4" aria-hidden />
                  {done ? "Lưu nhận xét" : "Chấm xong"}
                </button>
                {done ? (
                  <button name="done" value="0" className="min-h-11 rounded-full border border-line px-5 font-medium hover:bg-tint">
                    Mở lại để chấm tiếp
                  </button>
                ) : (
                  <button name="done" value="0" className="min-h-11 rounded-full border border-line px-5 font-medium hover:bg-tint">
                    Lưu nháp
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        <nav aria-label="Học sinh khác" className="flex flex-wrap justify-between gap-3">
          {prev ? (
            <Link href={`/teacher/classes/${id}/thi-thu/${prev.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-tint">
              <ArrowLeft className="size-4" aria-hidden />
              {prev.name}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/teacher/classes/${id}/thi-thu/${next.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium hover:bg-tint">
              Em tiếp theo: {next.name}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )}
        </nav>
      </div>
    </AppShell>
  );
}
