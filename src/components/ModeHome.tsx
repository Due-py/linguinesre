import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { SubmitButton } from "@/components/form";
import { TestStatusList } from "@/components/ResearchHome";
import { startModeSession, submitCheckin } from "@/app/(student)/student/luyen/actions";
import type { ModeSessionRow } from "@/lib/research/modeServer";
import type { TestState } from "@/lib/research/server";
import { MIN_SESSION_MS, type Mode } from "@/lib/research/modes";

const NAME: Record<Mode, { title: string; body: string }> = {
  A: { title: "Chế độ A: luyện phản xạ nói", body: "Từ vựng, khung câu, Speed Q&A, hội thoại. Khoảng 12–15 phút." },
  B: { title: "Chế độ B: đọc to", body: "Đọc to các bài hội thoại và đoạn văn của Unit. Khoảng 10–15 phút." },
};
const NOTICE: Record<string, string> = {
  done_today: "Hôm nay bạn đã luyện rồi. Mỗi ngày một buổi, mai luyện tiếp nhé.",
  no_unit: "Unit của buổi này chưa sẵn sàng. Báo nhóm nghiên cứu giúp mình.",
  error: "Chưa mở được buổi luyện. Thử lại sau ít phút.",
  checkin: "Trả lời câu hỏi của tuần này trước khi luyện nhé.",
};
const dateFmt = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" });

/**
 * Trang chính của người tham gia trong giai đoạn luyện: buổi hôm nay, câu hỏi hằng tuần, các buổi đã luyện.
 * Gọi tên trung tính "Chế độ A/B" (mục 2.4). Không so sánh với bạn khác, không điểm số.
 */
export default function ModeHome({
  code,
  mode,
  sessions,
  today,
  needsCheckin,
  notice,
  tests,
}: {
  code: string;
  mode: Mode;
  sessions: ModeSessionRow[];
  today: string;
  needsCheckin: boolean;
  notice?: string;
  tests: TestState;
}) {
  const todays = sessions.filter((s) => s.day === today);
  const open = todays.find((s) => s.status === "in_progress");
  const doneToday = todays.length > 0 && !open;
  const completed = sessions.filter((s) => s.status === "completed").length;

  return (
    <div className="grid gap-10">
      <section aria-labelledby="today" className="grid gap-4 rounded-[2rem] bg-forest px-6 py-8 text-on-forest sm:px-10 sm:py-12">
        <p className="text-on-forest-muted">Chào {code},</p>
        <h1 id="today" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
          {NAME[mode].title}
        </h1>
        <p className="max-w-md text-on-forest-muted">{doneToday ? "Bạn đã luyện xong hôm nay. Mai luyện tiếp nhé." : NAME[mode].body}</p>
        {notice && NOTICE[notice] && <p className="max-w-md rounded-xl bg-on-forest/15 px-4 py-3 font-semibold">{NOTICE[notice]}</p>}
        {open ? (
          <Link href={`/student/luyen/${open.id}`} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-on-forest px-6 font-bold text-forest hover:bg-white">
            Làm tiếp buổi {open.session_no}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        ) : (
          !doneToday &&
          !needsCheckin && (
            <form action={startModeSession}>
              <SubmitButton pendingLabel="Đang mở buổi luyện…" className="w-fit bg-on-forest! text-forest! shadow-none!">
                Bắt đầu buổi {sessions.length + 1}
              </SubmitButton>
            </form>
          )
        )}
      </section>

      {needsCheckin && !open && !doneToday && (
        <section aria-labelledby="week" className="grid max-w-prose gap-4 rounded-2xl border-2 border-line bg-surface px-5 py-5">
          <h2 id="week" className="text-xl font-extrabold">
            Câu hỏi của tuần
          </h2>
          <form action={submitCheckin} className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1 text-lg">Tuần này em có luyện nói tiếng Anh thêm ở đâu khác không (ngoài giờ học trên lớp và web này)?</legend>
              <label className="flex items-center gap-2 text-lg">
                <input type="radio" name="practised" value="no" required className="size-5" /> Không
              </label>
              <label className="flex items-center gap-2 text-lg">
                <input type="radio" name="practised" value="yes" className="size-5" /> Có
              </label>
            </fieldset>
            <label className="grid gap-1.5">
              <span className="font-bold">Nếu có: ở đâu? (ví dụ: trung tâm, ứng dụng khác, nói với người nước ngoài)</span>
              <input name="detail" maxLength={300} className="min-h-12 rounded-xl border-2 border-line bg-surface px-4" />
            </label>
            <SubmitButton pendingLabel="Đang lưu…" className="w-fit">
              Gửi câu trả lời
            </SubmitButton>
          </form>
          <p className="text-sm text-muted">Câu trả lời chỉ dùng cho nghiên cứu, không ảnh hưởng gì tới em.</p>
        </section>
      )}

      <section aria-labelledby="progress" className="grid max-w-prose gap-3">
        <h2 id="progress" className="text-2xl font-extrabold tracking-tight">
          Các buổi đã luyện
        </h2>
        <p className="text-muted">Đã xong {completed} buổi. Kế hoạch là 15 buổi, mỗi tuần 5 buổi từ thứ Hai đến thứ Sáu.</p>
        {sessions.length > 0 && (
          <ul className="divide-y divide-line border-y border-line">
            {sessions
              .slice()
              .reverse()
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    Buổi {s.session_no} · Unit {s.unit_no} · {dateFmt.format(new Date(`${s.day}T00:00:00+07:00`))}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-bold">
                    {s.status === "completed" ? (
                      <>
                        <CircleCheck className={`size-4 ${s.active_ms >= MIN_SESSION_MS ? "text-brand-strong" : "text-muted"}`} aria-hidden />
                        {Math.max(1, Math.round(s.active_ms / 60000))} phút
                      </>
                    ) : (
                      <span className="text-muted">Chưa xong</span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <TestStatusList state={tests} />
    </div>
  );
}
