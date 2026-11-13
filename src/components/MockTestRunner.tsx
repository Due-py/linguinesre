"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, Volume2 } from "lucide-react";
import RecordButton from "@/components/module/RecordButton";
import { postAudio, speakText } from "@/components/module/audio";
import { SubmitButton } from "@/components/form";
import { Chip } from "@/components/ui";
import { useRecorder } from "@/lib/speaking/useRecorder";
import type { MockChecks, MockQuestion } from "@/lib/mockTest";
import { submitMockTest } from "@/app/(student)/student/thi-thu/actions";

type Answer = { transcript: string; checks: MockChecks };

/**
 * Làm bài thi thử nói: từng câu một. Học sinh tự bấm nghe câu hỏi và tự bấm micro khi sẵn sàng (không bíp, không tính giờ,
 * khác bài kiểm tra nghiên cứu). Câu nào chưa ưng thì nói lại; câu trả lời mới thay câu cũ.
 */
export default function MockTestRunner({ questions, initial }: { questions: MockQuestion[]; initial: Record<string, Answer> }) {
  const rec = useRecorder();
  const [answers, setAnswers] = useState<Record<string, Answer>>(initial);
  const [index, setIndex] = useState(() => Math.max(0, questions.findIndex((q) => !initial[q.id])));
  const [message, setMessage] = useState<string | null>(null);
  const q = questions[index];
  const a = answers[q.id];
  const answered = questions.filter((x) => answers[x.id]).length;

  async function onRecorded(r: Parameters<Parameters<typeof RecordButton>[0]["onRecorded"]>[0]) {
    setMessage(null);
    const res = await postAudio(`/api/thi-thu/answer?q=${q.id}`, r);
    if (res.error) setMessage(String(res.error));
    else if (res.unclear) setMessage("Máy nghe chưa rõ. Nói to và rõ hơn một chút rồi thử lại nhé.");
    else setAnswers((x) => ({ ...x, [q.id]: { transcript: String(res.transcript ?? ""), checks: res.checks as MockChecks } }));
  }

  return (
    <div className="grid gap-5">
      <nav aria-label="Các câu hỏi" className="flex flex-wrap gap-2">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => {
              setIndex(i);
              setMessage(null);
            }}
            aria-current={i === index ? "step" : undefined}
            className={`grid size-10 place-items-center rounded-full text-sm font-medium ${i === index ? "bg-brand text-on-brand" : answers[x.id] ? "bg-success-soft text-success-strong" : "bg-sunken text-muted"}`}
            aria-label={`Câu ${i + 1}${answers[x.id] ? ", đã trả lời" : ""}`}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      <section className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:p-6" aria-labelledby="q">
        <p className="text-sm font-medium text-muted">
          Câu {index + 1}/{questions.length}
        </p>
        <h2 id="q" lang="en" className="text-2xl font-semibold tracking-tight">
          {q.text}
        </h2>
        <button
          type="button"
          onClick={() => speakText(q.text)}
          className="press inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-line-strong px-5 font-medium text-brand hover:bg-brand-soft"
        >
          <Volume2 className="size-5" aria-hidden />
          Nghe câu hỏi
        </button>
        <div className="justify-self-center">
          <RecordButton rec={rec} onRecorded={onRecorded} label={a ? "Nói lại câu này" : "Bấm để trả lời"} />
        </div>
        {message && (
          <p role="alert" className="flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 font-medium text-warn">
            <CircleAlert className="size-5 shrink-0" aria-hidden />
            {message}
          </p>
        )}
        {a && (
          <div className="grid gap-2" aria-live="polite">
            <p lang="en" className="rounded-2xl bg-sunken px-4 py-3">
              “{a.transcript}”
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip tone={a.checks.sentence ? "green" : "yellow"} icon={a.checks.sentence ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}>
                {a.checks.echo ? "Em đang đọc lại câu hỏi" : a.checks.sentence ? "Thành câu" : "Còn ngắn, nói thêm vài từ"}
              </Chip>
              {a.checks.reason !== null && (
                <Chip tone={a.checks.reason ? "green" : "yellow"} icon={a.checks.reason ? <CircleCheck className="size-4" aria-hidden /> : <CircleAlert className="size-4" aria-hidden />}>
                  {a.checks.reason ? "Có nêu lý do" : "Thêm lý do (because…)"}
                </Chip>
              )}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {index > 0 && (
            <button type="button" onClick={() => setIndex(index - 1)} className="min-h-11 rounded-full px-4 font-medium text-muted hover:bg-sunken">
              Câu trước
            </button>
          )}
          {index < questions.length - 1 && (
            <button
              type="button"
              onClick={() => {
                setIndex(index + 1);
                setMessage(null);
              }}
              className="press min-h-11 rounded-full bg-brand-soft px-5 font-medium text-brand-strong hover:bg-brand-tonal"
            >
              {a ? "Câu tiếp theo" : "Bỏ qua, sang câu sau"}
            </button>
          )}
        </div>
      </section>

      <form action={submitMockTest} className="grid gap-2">
        <p className="text-sm text-muted">
          Em đã trả lời {answered}/{questions.length} câu. Nộp bài xong sẽ xem được nhận xét từng câu và không sửa được nữa.
        </p>
        <SubmitButton pendingLabel="Đang nộp bài…" className="w-full sm:w-fit">
          Nộp bài
        </SubmitButton>
      </form>
    </div>
  );
}
