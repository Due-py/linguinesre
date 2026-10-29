import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import type { Participant, TestState } from "@/lib/research/server";

/**
 * Trang chính của học sinh tham gia nghiên cứu khi CHƯA được luyện chế độ A: có bài kiểm tra cần làm, chưa chia nhóm,
 * hoặc thuộc chế độ B. Gọi tên trung tính "Chế độ A/B" (mục 2.4), không nói "nhóm đối chứng".
 */
export default function ResearchHome({ p, state }: { p: Participant; state: TestState }) {
  const due = state.due;
  const inProgress = due ? state[due]?.status === "in_progress" : false;
  return (
    <div className="grid gap-10">
      <section aria-labelledby="today" className="grid gap-4 rounded-[2rem] bg-forest px-6 py-8 text-on-forest sm:px-10 sm:py-12">
        <p className="text-on-forest-muted">Chào {p.code},</p>
        {due ? (
          <>
            <h1 id="today" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              {due === "pre" ? "Bài kiểm tra nói lần 1" : "Bài kiểm tra nói lần 2"}
            </h1>
            <p className="max-w-md text-on-forest-muted">
              {inProgress ? "Bạn đang làm dở. Mở lại để làm tiếp từ câu chưa ghi âm." : "Khoảng 8 phút. Làm khi người coi thi hướng dẫn."}
            </p>
            <Link href="/student/test" className="inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-on-forest px-6 font-bold text-forest hover:bg-white">
              {inProgress ? "Làm tiếp bài kiểm tra" : "Mở bài kiểm tra"}
              <ArrowRight className="size-5" aria-hidden />
            </Link>
          </>
        ) : p.arm === null ? (
          <>
            <h1 id="today" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Bạn đã làm xong bài kiểm tra lần 1
            </h1>
            <p className="max-w-md text-on-forest-muted">
              Khi giai đoạn luyện tập bắt đầu, bài luyện mỗi ngày của bạn sẽ hiện ở đây. Nhóm nghiên cứu sẽ thông báo trên lớp.
            </p>
          </>
        ) : (
          <>
            <h1 id="today" className="text-balance text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Chế độ B: đọc to bài hội thoại
            </h1>
            <p className="max-w-md text-on-forest-muted">Chế độ này đang được hoàn thiện và sẽ mở trước buổi luyện đầu tiên.</p>
          </>
        )}
      </section>

      <section aria-labelledby="tests" className="grid max-w-prose gap-3">
        <h2 id="tests" className="text-2xl font-extrabold tracking-tight">
          Bài kiểm tra
        </h2>
        <ul className="divide-y divide-line border-y border-line">
          {(["pre", "post"] as const).map((ph) => (
            <li key={ph} className="flex items-center justify-between gap-3 py-3">
              <span>{ph === "pre" ? "Lần 1 (trước khi luyện)" : "Lần 2 (sau 3 tuần luyện)"}</span>
              <span className="inline-flex items-center gap-1.5 font-bold">
                {state[ph]?.status === "completed" ? (
                  <>
                    <CircleCheck className="size-4 text-brand-strong" aria-hidden />
                    Đã làm
                  </>
                ) : state[ph] ? (
                  "Đang làm dở"
                ) : (
                  <span className="text-muted">Chưa làm</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
