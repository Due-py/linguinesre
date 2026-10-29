import { ChevronDown, ClipboardCheck, Lightbulb, MessageCircle, Mic, Repeat2, Users } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";

const steps = [
  {
    icon: Mic,
    title: "Chọn Unit và nghe câu hỏi",
    text: "Mỗi buổi 5 câu hỏi bám theo chủ đề trong sách Global Success. Bạn đọc hoặc nghe câu hỏi rồi trả lời bằng giọng nói.",
  },
  {
    icon: Lightbulb,
    title: "Bí ý thì xin gợi ý từng bước",
    text: "Gợi ý có bốn mức, từ hướng nghĩ, từ khóa, khung câu đến một ví dụ ngắn. Dùng gợi ý không bị trừ điểm.",
  },
  {
    icon: ClipboardCheck,
    title: "Nhận phản hồi rõ ràng",
    text: "Sau mỗi câu, bạn thấy mình đã trả lời đúng ý chưa, lỗi ngữ pháp nào cần sửa và cách diễn đạt tự nhiên hơn.",
  },
  {
    icon: Repeat2,
    title: "Nói lại và xem tiến bộ",
    text: "Bạn có thể trả lời lại câu vừa rồi để áp dụng góp ý. Mọi buổi luyện được lưu lại để xem lại sau.",
  },
];

const faqs = [
  {
    q: "LINGUA-REFLEX có thay thế giáo viên không?",
    a: "Không. Đây là công cụ để học sinh luyện nói thêm mỗi ngày. Giáo viên vẫn là người tổ chức lớp và hỗ trợ học sinh.",
  },
  {
    q: "Phản hồi do AI tạo ra có chính xác không?",
    a: "AI chỉ đọc bản ghi lời nói đã chuyển thành chữ nên có thể sai. Vì vậy phản hồi luôn ghi rõ phần nào là số đo trực tiếp (ví dụ thời gian suy nghĩ) và phần nào là nhận xét của AI. Hệ thống không đưa ra một điểm số chung và chưa đánh giá phát âm.",
  },
  {
    q: "Mình có cần mã lớp để dùng không?",
    a: "Không bắt buộc. Bạn có thể đăng ký và luyện một mình, rồi nhập mã lớp khi thầy cô đưa cho bạn.",
  },
  {
    q: "Dữ liệu giọng nói của mình được dùng như thế nào?",
    a: "Chúng tôi chỉ lưu những gì cần cho việc học, gồm bản ghi lời nói, phản hồi và file ghi âm của bạn. Học sinh chỉ xem dữ liệu của mình; giáo viên chỉ xem học sinh trong lớp của mình.",
  },
  {
    q: "Dùng được trên điện thoại không?",
    a: "Được. Bạn chỉ cần một trình duyệt hiện đại và cho phép trang dùng micro. Nếu micro bị chặn, trang sẽ hướng dẫn cách bật lại.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <nav aria-label="Tài khoản" className="flex items-center gap-2">
          <ButtonLink href="/login" variant="secondary" className="min-h-11 px-3 text-sm min-[360px]:px-4 sm:px-5">
            Đăng nhập
          </ButtonLink>
          {/* Bọc trong span để ẩn/hiện, vì class "hidden" xung đột với "inline-flex" của ButtonLink. */}
          <span className="hidden sm:block">
            <ButtonLink href="/signup" className="min-h-11 px-5 text-sm">
              Đăng ký
            </ButtonLink>
          </span>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-16">
          <div className="grid gap-6">
            <p className="rise-in w-fit rounded-full bg-brand-soft px-4 py-1.5 text-sm font-bold text-brand-strong">
              Bản thử nghiệm cho học sinh lớp 6–12
            </p>
            <h1 className="rise-in rise-in-2 text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Từ biết từ vựng đến dám nói tiếng Anh
            </h1>
            <p className="rise-in rise-in-3 max-w-xl text-lg text-muted">
              Nhiều bạn làm được bài ngữ pháp nhưng gặp câu hỏi Speaking mới thì không biết bắt đầu từ đâu. LINGUA-REFLEX giúp bạn
              luyện trả lời từng ngày, 10–15 phút mỗi buổi, có phản hồi sau mỗi câu.
            </p>
            <div className="rise-in rise-in-3 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Đăng ký miễn phí</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Tôi đã có tài khoản
              </ButtonLink>
            </div>
          </div>

          <div className="rise-in rise-in-2 grid gap-3 rounded-3xl border border-line bg-surface p-5 shadow-sm" aria-label="Ví dụ một câu hỏi luyện nói">
            <p className="text-sm font-bold text-muted">Ví dụ một câu hỏi</p>
            <p lang="en" className="text-balance rounded-2xl bg-sunken p-4 text-2xl font-extrabold leading-snug">
              What do you usually do to stay healthy?
            </p>
            <p className="flex items-start gap-2 rounded-2xl bg-brand-soft p-4 text-sm font-semibold text-brand-strong">
              <MessageCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Gợi ý mức 1: nghĩ về thói quen ăn uống, vận động hoặc giấc ngủ của bạn.
            </p>
          </div>
        </section>

        <section id="cach-hoat-dong" className="bg-surface py-16" aria-labelledby="how-title">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6">
            <div className="grid gap-2">
              <h2 id="how-title" className="text-3xl font-extrabold tracking-tight">
                Một buổi luyện diễn ra thế nào?
              </h2>
              <p className="max-w-2xl text-muted">Bốn bước ngắn, làm được trong khoảng 10–15 phút.</p>
            </div>
            <ol className="grid gap-4 sm:grid-cols-2">
              {steps.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[auto_1fr] gap-4 rounded-3xl border border-line bg-bg p-5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand text-on-brand">
                    <s.icon className="size-6" aria-hidden />
                  </span>
                  <div className="grid gap-1">
                    <h3 className="text-lg font-extrabold">
                      <span className="sr-only">Bước {i + 1}: </span>
                      {s.title}
                    </h3>
                    <p className="text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="loi-ich" className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2" aria-labelledby="benefit-title">
          <h2 id="benefit-title" className="sr-only">
            Lợi ích cho học sinh và giáo viên
          </h2>
          <div className="grid content-start gap-3 rounded-3xl border border-line bg-surface p-6">
            <h3 className="text-2xl font-extrabold">Dành cho học sinh</h3>
            <ul className="grid gap-2 text-muted">
              <li>Luyện nói đều đặn mà không cần bạn luyện cùng.</li>
              <li>Trả lời câu hỏi mới, không chỉ học thuộc hội thoại mẫu.</li>
              <li>Hiểu lỗi của mình và biết cách sửa, bằng tiếng Việt dễ hiểu.</li>
              <li>Bí ý tưởng thì có gợi ý từng bước, không ai chấm bạn là thất bại.</li>
            </ul>
          </div>
          <div className="grid content-start gap-3 rounded-3xl border border-line bg-surface p-6">
            <h3 className="flex items-center gap-2 text-2xl font-extrabold">
              <Users className="size-6" aria-hidden />
              Dành cho giáo viên
            </h3>
            <ul className="grid gap-2 text-muted">
              <li>Tạo lớp và chia sẻ mã lớp để học sinh tham gia.</li>
              <li>Xem danh sách học sinh trong lớp và những buổi các bạn đã luyện.</li>
              <li>Chỉ thấy học sinh trong lớp của mình.</li>
            </ul>
          </div>
        </section>

        <section id="cau-hoi-thuong-gap" className="bg-surface py-16" aria-labelledby="faq-title">
          <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 sm:px-6">
            <h2 id="faq-title" className="text-3xl font-extrabold tracking-tight">
              Câu hỏi thường gặp
            </h2>
            <div className="grid gap-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-line bg-bg px-5 py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-bold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-4 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl justify-items-start gap-4 px-4 py-16 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight">Sẵn sàng cho buổi luyện đầu tiên?</h2>
          <ButtonLink href="/signup">Tạo tài khoản</ButtonLink>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <Logo />
          <p>Bản thử nghiệm. Nội dung luyện tập bám theo chủ đề sách Global Success.</p>
        </div>
      </footer>
    </div>
  );
}
