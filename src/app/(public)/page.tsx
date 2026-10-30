import Link from "next/link";
import { ChevronDown, Lightbulb, Timer, Users } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";
import PyramidDiagram from "@/components/PyramidDiagram";

// Từ đáy lên đỉnh, đúng thứ tự luyện (đây thật sự là một chuỗi, nên dùng danh sách có thứ tự).
const layers = [
  { id: "L0", title: "Từ vựng", text: "Nhìn nghĩa tiếng Việt, nói từ tiếng Anh, nghe mẫu rồi nói theo." },
  { id: "L1", title: "Khung câu và Speed Q&A", text: "Nói thành câu theo khung của bài. Rồi trả lời nhanh: thời gian để bắt đầu nói giảm dần 5 → 3 → 1,5 giây." },
  { id: "L2", title: "Mở rộng có lý do", text: "Trả lời và giải thích vì sao, với because, so, but." },
  { id: "L3", title: "Hội thoại", text: "Nói vài lượt với một người trong tình huống quen thuộc, rồi nói một đoạn ngắn." },
];

const faqs = [
  {
    q: "LINGUA-REFLEX khác gì ELSA?",
    a: "ELSA mạnh về chấm phát âm. LINGUA-REFLEX không chấm phát âm. Web tập cho bạn phản xạ trả lời theo đúng bài trong sách Global Success, và đo thời gian từ lúc nghe câu hỏi tới lúc bạn bắt đầu nói.",
  },
  {
    q: "LINGUA-REFLEX có thay thế giáo viên không?",
    a: "Không. Đây là công cụ để học sinh luyện nói thêm mỗi ngày. Giáo viên vẫn là người tổ chức lớp và hỗ trợ học sinh.",
  },
  {
    q: "Thời gian bắt đầu nói được đo thế nào?",
    a: "Khi luyện tự do, trình duyệt đo từ lúc câu hỏi đọc xong tới lúc micro nghe thấy bạn nói, nên đây là số ước lượng (tiếng ồn, tiếng “ừm” có thể làm lệch). Trong nghiên cứu ở trường, thời gian được đo kỹ hơn từ mốc thời gian của từng từ.",
  },
  {
    q: "Phản hồi do AI tạo ra có chính xác không?",
    a: "AI chỉ đọc bản ghi lời nói đã chuyển thành chữ nên có thể sai. Phản hồi luôn tách phần đo trực tiếp (thời gian, số từ, từ khóa) khỏi phần AI nhận xét, và AI chỉ nhận xét khi bạn bấm xem. Không có điểm tổng, không chấm phát âm.",
  },
  {
    q: "Mình có cần mã lớp để dùng không?",
    a: "Không bắt buộc. Bạn có thể đăng ký và luyện một mình, rồi nhập mã lớp trong mục Tài khoản khi thầy cô đưa cho bạn.",
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
            <p className="rise-in w-fit rounded-full border border-brand/20 bg-brand-soft px-3.5 py-1 text-sm font-semibold text-brand-strong">
              Bản thử nghiệm, bám sách Global Success lớp 6–12
            </p>
            <h1 className="rise-in rise-in-2 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Nghe câu hỏi là bắt đầu nói được
            </h1>
            <p className="rise-in rise-in-3 max-w-xl text-lg text-muted">
              Nhiều bạn biết từ vựng và ngữ pháp, nhưng khi được hỏi bằng tiếng Anh thì mất vài giây mới mở lời. LINGUA-REFLEX luyện
              đúng khoảng đó: thời gian từ lúc nghe câu hỏi tới lúc bạn bắt đầu nói, với bài lấy từ sách bạn đang học.
            </p>
            <div className="rise-in rise-in-3 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Đăng ký miễn phí</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Tôi đã có tài khoản
              </ButtonLink>
            </div>
          </div>

          {/* Điểm nhấn duy nhất của trang: dải màu chuyển nghiêng phía sau thẻ ví dụ. */}
          <div className="rise-in rise-in-2 relative py-6 sm:px-4">
            <div aria-hidden className="stripe-gradient absolute inset-0 -skew-y-6 rounded-2xl opacity-95" />
            <figure className="relative grid gap-4 rounded-2xl bg-surface p-5 shadow-card">
              <figcaption className="text-sm font-semibold text-muted">Ví dụ một câu Speed Q&amp;A (hình minh họa)</figcaption>
              <p lang="en" className="text-balance text-3xl font-extrabold leading-tight tracking-tight">
                What would you say first?
              </p>
              <div className="grid gap-1.5">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Timer className="size-4 text-brand" aria-hidden />
                  Bắt đầu nói trước khi vạch thời gian hết
                </p>
                <div className="h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <div className="countdown-bar h-full rounded-full bg-brand" />
                </div>
                <p className="text-sm text-muted">Giới hạn ngắn dần khi bạn trả lời kịp: 5 giây, rồi 3 giây, rồi 1,5 giây.</p>
              </div>
            </figure>
          </div>
        </section>

        <section id="kim-tu-thap" className="bg-surface py-16" aria-labelledby="pyramid-title">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div className="grid gap-3 md:order-2">
              <h2 id="pyramid-title" className="text-3xl font-extrabold tracking-tight">
                Lộ trình Kim tự tháp
              </h2>
              <p className="max-w-xl text-muted">Đi từ từ đơn lẻ tới hội thoại. Tầng sau dựa trên tầng trước, nên bạn không phải nói cả đoạn ngay từ đầu.</p>
              <ol className="mt-2 grid gap-4">
                {layers.map((l) => (
                  <li key={l.id} className="grid grid-cols-[3rem_1fr] gap-3">
                    <span className="grid h-9 place-items-center rounded-lg bg-brand-soft font-semibold text-brand-strong">{l.id}</span>
                    <div>
                      <h3 className="font-extrabold">{l.title}</h3>
                      <p className="text-muted">{l.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-2 flex items-start gap-2 text-muted">
                <Lightbulb className="mt-1 size-4 shrink-0 text-brand" aria-hidden />
                Bí ý thì mở gợi ý từng mức, từ hướng nghĩ tới câu ví dụ. Bạn vẫn tự nói câu trả lời, và dùng gợi ý không bị trừ gì.
              </p>
            </div>
            <PyramidDiagram className="mx-auto w-full max-w-sm md:order-1" />
          </div>
        </section>

        <section id="dang-co-gi" className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2" aria-labelledby="now-title">
          <h2 id="now-title" className="text-3xl font-extrabold tracking-tight md:col-span-2">
            Hiện web có những gì
          </h2>
          <div className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-xl font-extrabold">Luyện tự do, mở cho mọi người</h3>
            <ul className="grid list-disc gap-2 pl-5 text-muted">
              <li>Chọn Unit trong sách, mỗi buổi 5 câu hỏi, khoảng 10–15 phút.</li>
              <li>Gợi ý 4 mức: hướng nghĩ, từ khóa, khung câu, câu ví dụ.</li>
              <li>Sau mỗi câu: số đo trực tiếp ngay; AI nhận xét khi bạn bấm xem.</li>
              <li>Nói lại để so sánh, xem thời gian bắt đầu nói qua các buổi.</li>
            </ul>
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-line bg-surface p-6">
            <h3 className="text-xl font-extrabold">Kim tự tháp đầy đủ, đang thử nghiệm</h3>
            <p className="text-muted">
              Lộ trình 4 tầng với Speed Q&amp;A và hội thoại đang được thử với học sinh lớp 8 trong một nghiên cứu ở trường. Khi có
              kết quả, nhóm sẽ mở cho mọi người.
            </p>
            <h3 className="mt-3 flex items-center gap-2 text-xl font-extrabold">
              <Users className="size-5" aria-hidden />
              Cho giáo viên
            </h3>
            <p className="text-muted">Tạo lớp, chia sẻ mã lớp, xem các buổi luyện của học sinh trong lớp mình. Không xếp hạng học sinh.</p>
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
          <p>
            Bản thử nghiệm. Nội dung luyện tập bám theo chủ đề sách Global Success.{" "}
            <Link href="/quyen-rieng-tu" className="font-semibold text-ink underline underline-offset-4">
              Quyền riêng tư
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
