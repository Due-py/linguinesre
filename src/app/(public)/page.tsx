import Link from "next/link";
import { ChevronDown, FlaskConical, Lightbulb, Mic, Timer, Users, Volume2 } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import Logo from "@/components/Logo";
import Mascot, { Bubble } from "@/components/Mascot";

const HEADLINE = "Nghe câu hỏi là bắt đầu nói được";

// Từ đáy lên đỉnh, đúng thứ tự luyện. Mỗi tầng cao hơn tầng trước như bậc thang (ý tưởng "công trình mọc lên" của video 3).
const layers = [
  { id: "L0", title: "Từ vựng", text: "Nhìn nghĩa tiếng Việt, nói từ tiếng Anh, nghe mẫu rồi nói theo.", tone: "bg-sky-soft text-sky-strong", h: "md:h-64" },
  {
    id: "L1",
    title: "Khung câu và Speed Q&A",
    text: "Nói thành câu theo khung của bài. Rồi trả lời nhanh: thời gian để bắt đầu nói giảm dần 5 → 3 → 1,5 giây.",
    tone: "bg-brand-soft text-brand-strong",
    h: "md:h-72",
  },
  { id: "L2", title: "Mở rộng có lý do", text: "Trả lời và giải thích vì sao, với because, so, but.", tone: "bg-gold-soft text-warn", h: "md:h-80" },
  { id: "L3", title: "Hội thoại", text: "Nói vài lượt với một người trong tình huống quen thuộc, rồi nói một đoạn ngắn.", tone: "bg-berry-soft text-berry", h: "md:h-88" },
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

// Bong bóng câu tiếng Anh trôi nổi quanh lời mời cuối trang (trang trí, video 1). Vị trí và nhịp là hằng số.
const bubbles = [
  { text: "Hello!", pos: "left-[4%] top-[18%]", t: "7s", dx: "8px", dy: "-12px" },
  { text: "Because…", pos: "right-[6%] top-[12%]", t: "6s", dx: "-10px", dy: "8px" },
  { text: "I think…", pos: "left-[10%] bottom-[14%]", t: "8s", dx: "10px", dy: "6px" },
  { text: "What about you?", pos: "right-[8%] bottom-[18%]", t: "6.5s", dx: "-6px", dy: "-10px" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b-2 border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
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
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Phần đầu: linh vật + thẻ ví dụ bên trái, tiêu đề + hai nút xếp chồng bên phải (bố cục trang chủ Duolingo). */}
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-8 sm:px-6 md:grid-cols-2 md:items-center md:gap-14 md:pt-14">
          <div className="grid justify-items-center gap-6 md:order-2 md:justify-items-start">
            <p className="rise-in w-fit rounded-full border-2 border-line px-3.5 py-1 text-sm font-bold text-muted">
              Bản thử nghiệm, bám sách Global Success lớp 6–12
            </p>
            <h1 className="word-light text-balance text-center text-4xl font-extrabold leading-[1.1] sm:text-5xl md:text-left md:text-6xl">
              {HEADLINE.split(" ").map((w, i) => (
                <span key={i} style={{ ["--i" as string]: i }}>
                  {w}{" "}
                </span>
              ))}
            </h1>
            <p className="rise-in rise-in-3 max-w-xl text-center text-lg text-muted md:text-left">
              Nhiều bạn biết từ vựng và ngữ pháp, nhưng khi được hỏi bằng tiếng Anh thì mất vài giây mới mở lời. LINGUA-REFLEX luyện
              đúng khoảng đó: thời gian từ lúc nghe câu hỏi tới lúc bạn bắt đầu nói, với bài lấy từ sách bạn đang học.
            </p>
            <div className="rise-in rise-in-3 grid w-full max-w-sm gap-3">
              <ButtonLink href="/signup" className="min-h-13 text-lg">
                Bắt đầu miễn phí
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="min-h-13 text-lg">
                Tôi đã có tài khoản
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-5 md:order-1">
            <div className="rise-in flex items-end justify-center gap-3">
              <Mascot mood="talk" className="size-28 shrink-0 sm:size-36" />
              <Bubble className="mb-10 text-lg" tail="left">
                <span lang="en">What would you say first?</span>
              </Bubble>
            </div>

            {/* Thẻ minh họa một câu Speed Q&A. Không bấm được: chỉ là hình. */}
            <figure className="rise-in rise-in-2 mx-auto grid w-full max-w-md gap-4 rounded-2xl bg-surface p-5 shadow-card">
              <figcaption className="text-sm font-bold text-muted">Ví dụ một câu Speed Q&amp;A (hình minh họa)</figcaption>
              <div className="h-4 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full w-2/3 rounded-full bg-brand-bright shadow-[inset_0_-4px_0_rgb(0_0_0/0.08)]" />
              </div>
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky text-white shadow-[0_4px_0_var(--sky-shadow)]">
                  <Volume2 className="size-6" />
                </span>
                <p lang="en" className="text-balance text-2xl font-extrabold leading-tight">
                  What do you usually do at the weekend?
                </p>
              </div>
              <div className="grid gap-1.5">
                <p className="flex items-center gap-1.5 text-sm font-bold">
                  <Timer className="size-4 text-brand" aria-hidden />
                  Bắt đầu nói trước khi vạch thời gian hết
                </p>
                <div className="h-3 overflow-hidden rounded-full bg-sunken" aria-hidden>
                  <div className="countdown-bar h-full rounded-full bg-gold" />
                </div>
                <p className="text-sm text-muted">Giới hạn ngắn dần khi bạn trả lời kịp: 5 giây, rồi 3 giây, rồi 1,5 giây.</p>
              </div>
              <span aria-hidden className="mx-auto grid size-20 place-items-center rounded-full bg-brand text-white shadow-[0_5px_0_var(--brand-strong)]">
                <Mic className="size-9" />
              </span>
            </figure>
          </div>
        </section>

        {/* Lộ trình Kim tự tháp: bốn tầng như bậc thang; rê chuột vào tầng nào thì tầng đó rộng ra (video 3). */}
        <section id="kim-tu-thap" className="rounded-t-[2.5rem] bg-sunken py-16" aria-labelledby="pyramid-title">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6">
            <div className="reveal grid gap-3 text-center">
              <h2 id="pyramid-title" className="text-3xl font-extrabold sm:text-4xl">
                Lộ trình Kim tự tháp
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted">
                Đi từ từ đơn lẻ tới hội thoại. Tầng sau dựa trên tầng trước, nên bạn không phải nói cả đoạn ngay từ đầu.
              </p>
            </div>
            <ol className="grid gap-3 md:flex md:items-end md:gap-4">
              {layers.map((l, i) => (
                <li
                  key={l.id}
                  className={`reveal grid content-start gap-2 rounded-2xl border-2 border-b-4 border-line bg-surface p-5 transition-[flex-grow] duration-500 md:flex-1 md:hover:grow-[1.7] ${l.h}`}
                  style={{ ["--i" as string]: i }}
                >
                  <span className={`grid size-12 place-items-center rounded-2xl text-lg font-extrabold ${l.tone}`}>{l.id}</span>
                  <h3 className="text-xl font-extrabold">{l.title}</h3>
                  <p className="text-muted">{l.text}</p>
                </li>
              ))}
            </ol>
            <p className="reveal mx-auto flex max-w-2xl items-start gap-2 text-muted">
              <Lightbulb className="mt-1 size-5 shrink-0 text-gold-shadow" aria-hidden />
              Bí ý thì mở gợi ý từng mức, từ hướng nghĩ tới câu ví dụ. Bạn vẫn tự nói câu trả lời, và dùng gợi ý không bị trừ gì.
            </p>
          </div>
        </section>

        <section id="dang-co-gi" className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-3" aria-labelledby="now-title">
          <h2 id="now-title" className="reveal text-3xl font-extrabold sm:text-4xl md:col-span-3">
            Hiện web có những gì
          </h2>
          <div className="reveal grid content-start gap-3 rounded-2xl bg-surface p-6 shadow-card">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
              <Mic className="size-6" aria-hidden />
            </span>
            <h3 className="text-xl font-extrabold">Luyện tự do, mở cho mọi người</h3>
            <ul className="grid list-disc gap-2 pl-5 text-muted">
              <li>Chọn Unit trong sách, mỗi buổi 5 câu hỏi, khoảng 10–15 phút.</li>
              <li>Gợi ý 4 mức: hướng nghĩ, từ khóa, khung câu, câu ví dụ.</li>
              <li>Sau mỗi câu: số đo trực tiếp ngay; AI nhận xét khi bạn bấm xem.</li>
              <li>Nói lại để so sánh, xem thời gian bắt đầu nói qua các buổi.</li>
            </ul>
          </div>
          <div className="reveal grid content-start gap-3 rounded-2xl bg-surface p-6 shadow-card">
            <span className="grid size-12 place-items-center rounded-2xl bg-berry-soft text-berry">
              <FlaskConical className="size-6" aria-hidden />
            </span>
            <h3 className="text-xl font-extrabold">Kim tự tháp đầy đủ, đang thử nghiệm</h3>
            <p className="text-muted">
              Lộ trình 4 tầng với Speed Q&amp;A và hội thoại đang được thử với học sinh lớp 8 trong một nghiên cứu ở trường. Khi có
              kết quả, nhóm sẽ mở cho mọi người.
            </p>
          </div>
          <div className="reveal grid content-start gap-3 rounded-2xl bg-surface p-6 shadow-card">
            <span className="grid size-12 place-items-center rounded-2xl bg-sky-soft text-sky-strong">
              <Users className="size-6" aria-hidden />
            </span>
            <h3 className="text-xl font-extrabold">Cho giáo viên</h3>
            <p className="text-muted">Tạo lớp, chia sẻ mã lớp, xem các buổi luyện của học sinh trong lớp mình. Không xếp hạng học sinh.</p>
          </div>
        </section>

        <section id="cau-hoi-thuong-gap" className="py-16" aria-labelledby="faq-title">
          <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 sm:px-6">
            <h2 id="faq-title" className="reveal text-3xl font-extrabold sm:text-4xl">
              Câu hỏi thường gặp
            </h2>
            <div className="grid gap-3">
              {faqs.map((f) => (
                <details key={f.q} className="reveal group rounded-2xl border-2 border-b-4 border-line bg-surface px-5 py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-extrabold [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-4 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Lời mời cuối trang: dải xanh bo cong phía trên, câu tiếng Anh trôi nổi xung quanh (video 1). */}
        <section className="relative overflow-hidden rounded-t-[50%_3rem] bg-forest px-4 pb-20 pt-24 text-on-forest sm:px-6">
          <div aria-hidden className="pointer-events-none absolute inset-0 hidden sm:block">
            {bubbles.map((b) => (
              <span
                key={b.text}
                lang="en"
                className={`drift absolute rounded-2xl bg-on-forest/15 px-4 py-2 text-lg font-extrabold ${b.pos}`}
                style={{ ["--t" as string]: b.t, ["--dx" as string]: b.dx, ["--dy" as string]: b.dy }}
              >
                {b.text}
              </span>
            ))}
          </div>
          <div className="reveal relative mx-auto grid max-w-xl justify-items-center gap-5 text-center">
            <Mascot mood="cheer" className="size-28" />
            <h2 className="text-balance text-3xl font-extrabold sm:text-4xl">Sẵn sàng cho buổi luyện đầu tiên?</h2>
            <p className="text-on-forest-muted">Mỗi ngày vài câu trả lời bằng giọng nói. Nói được rồi, nói hay sẽ đến sau.</p>
            <Link
              href="/signup"
              className="inline-flex min-h-13 items-center justify-center rounded-2xl bg-on-forest px-8 text-lg font-extrabold text-forest shadow-[0_4px_0_rgb(0_0_0/0.2)] transition-transform active:translate-y-1 active:shadow-none"
            >
              Tạo tài khoản
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-forest text-on-forest-muted">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-on-forest/20 px-4 py-6 text-sm sm:px-6">
          <span className="[&_a]:text-on-forest">
            <Logo />
          </span>
          <p>
            Bản thử nghiệm. Nội dung luyện tập bám theo chủ đề sách Global Success.{" "}
            <Link href="/quyen-rieng-tu" className="font-bold text-on-forest underline underline-offset-4">
              Quyền riêng tư
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
