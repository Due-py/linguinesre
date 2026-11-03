import Link from "next/link";
import { BookOpenText, ChevronDown, Ear, Layers, LifeBuoy, MessagesSquare, Mic, ShieldCheck, Sparkles, Timer, Users, X } from "lucide-react";
import ButtonLink from "@/components/ButtonLink";
import FeatureTabs, { type Feature } from "@/components/FeatureTabs";
import Logo from "@/components/Logo";
import { Chip, Eyebrow, Highlight } from "@/components/ui";

/*
 * Trang chủ: kể một câu chuyện từ "biết từ vựng" tới "tự nói được". Mọi hình giao diện trên trang là MINH HỌA (ghi rõ),
 * dựng bằng HTML như màn hình thật, không phải số liệu của học sinh nào.
 */

const faqs = [
  {
    q: "LINGUA-REFLEX khác gì ELSA?",
    a: "ELSA mạnh về chấm phát âm. LINGUA-REFLEX không chấm phát âm. Web tập cho bạn phản xạ trả lời theo đúng bài trong sách Global Success, và đo thời gian từ lúc nghe câu hỏi tới lúc bạn bắt đầu nói.",
  },
  {
    q: "LINGUA-REFLEX có thay thế giáo viên không?",
    a: "Không. Đây là công cụ để học sinh luyện nói thêm mỗi ngày. Giáo viên vẫn là người tổ chức lớp, duyệt nội dung và hỗ trợ học sinh.",
  },
  {
    q: "Nội dung lấy từ đâu, có chính xác không?",
    a: "Từ vựng, phiên âm, cấu trúc ngữ pháp và cụm câu lấy từ sách Global Success (ghi số trang). Câu ví dụ, câu hỏi và tình huống do nhóm soạn theo chủ đề Unit. Mỗi mục có nguồn và trạng thái duyệt; hiện nội dung đang chờ thầy cô duyệt.",
  },
  {
    q: "Phản hồi do AI tạo ra có chính xác không?",
    a: "AI chỉ đọc bản ghi lời nói đã chuyển thành chữ nên có thể sai. Phản hồi luôn tách phần đo trực tiếp (thời gian, số từ, từ khóa) khỏi phần AI nhận xét. Không có điểm tổng, không chấm phát âm.",
  },
  {
    q: "Mình có cần mã lớp để dùng không?",
    a: "Không bắt buộc. Bạn có thể đăng ký và học một mình, rồi nhập mã lớp trong mục Tài khoản khi thầy cô đưa cho bạn.",
  },
  {
    q: "Dùng được trên điện thoại không?",
    a: "Được. Bạn chỉ cần một trình duyệt hiện đại và cho phép trang dùng micro. Nếu micro bị chặn, trang sẽ hướng dẫn cách bật lại.",
  },
];

const phases = [
  { no: 1, title: "Nền tảng", days: "Ngày 1–3", text: "Từ vựng có phiên âm và giọng đọc, ngữ pháp, phát âm, cụm câu hay dùng.", tone: "bg-brand-soft", dot: "bg-brand" },
  { no: 2, title: "Nói có hướng dẫn", days: "Ngày 4–6", text: "Từ vựng thành câu, xếp câu, mở rộng câu, trả lời với gợi ý giảm dần.", tone: "bg-success-soft", dot: "bg-success" },
  { no: 3, title: "Phản xạ", days: "Ngày 7–10", text: "Một ý nhiều cách hỏi, Speed Q&A theo mục tiêu riêng, sửa lỗi rồi nói lại.", tone: "bg-gold-soft", dot: "bg-gold" },
  { no: 4, title: "Giao tiếp thật", days: "Ngày 11–12", text: "Micro-Roleplay: trò chuyện với AI trong tình huống, không có kịch bản.", tone: "bg-danger-soft", dot: "bg-danger-bright" },
  { no: 5, title: "Đánh giá cuối", days: "Ngày 13–14", text: "Câu hỏi mới, không gợi ý. So sánh với bài đầu module.", tone: "bg-brand-soft", dot: "bg-brand" },
];

export default function LandingPage() {
  const features: Feature[] = [
    {
      id: "pyramid",
      tab: "Pyramid Scaffolding",
      icon: <Layers className="size-5" aria-hidden />,
      title: "Leo từng bậc, từ một từ tới cả đoạn",
      text: "Bạn không phải nói cả đoạn ngay từ đầu. Mỗi tầng dựa trên tầng trước, khó dần theo đúng nhịp của bạn.",
      points: ["Tầng 0: nói từ, nghe mẫu, nói theo", "Tầng 1: nói thành câu theo khung của bài", "Tầng 2: mở rộng câu với lý do", "Tầng 3: hội thoại và nói một đoạn"],
      preview: <PyramidPreview />,
    },
    {
      id: "rescue",
      tab: "Adaptive Rescue Cascade",
      icon: <LifeBuoy className="size-5" aria-hidden />,
      title: "Bí ý thì có gợi ý, từng chút một",
      text: "Gợi ý mở dần từ nhẹ tới mạnh: hướng nghĩ, từ khóa, khung câu, rồi câu ví dụ. Bạn vẫn tự nói câu trả lời của mình.",
      points: ["Nói chưa được thì tự mở thêm một mức và cho nói lại", "Nói tốt thì gợi ý giảm dần", "Dùng gợi ý không bị trừ gì"],
      preview: <RescuePreview />,
    },
    {
      id: "speed",
      tab: "Speed Q&A",
      icon: <Timer className="size-5" aria-hidden />,
      title: "Mở lời nhanh hơn, theo mục tiêu của riêng bạn",
      text: "Mỗi bạn có một mục tiêu thời gian riêng, tính từ chính số đo của bạn. Kịp đều thì mục tiêu mới nhanh thêm một chút.",
      points: ["Thường mất 7 giây thì mục tiêu đầu là khoảng 6 giây", "Chỉ nhanh thêm khi bạn kịp ở từ 60% số câu", "Đo từ lúc nghe xong câu hỏi tới lúc bạn bắt đầu nói"],
      preview: <SpeedPreview />,
    },
    {
      id: "roleplay",
      tab: "Micro-Roleplay",
      icon: <MessagesSquare className="size-5" aria-hidden />,
      title: "Trò chuyện thật, không đọc kịch bản",
      text: "AI đóng một vai trong tình huống quen thuộc, trả lời theo đúng điều bạn nói, hỏi tiếp và đôi khi nêu ý kiến khác để bạn giải thích.",
      points: ["Mỗi Unit có 6 tình huống", "Mỗi tình huống có mục tiêu và yêu cầu rõ ràng", "Kết thúc có nhận xét theo từng yêu cầu"],
      preview: <RoleplayPreview />,
    },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Logo />
          <nav aria-label="Trong trang" className="hidden items-center gap-1 lg:flex">
            {[
              ["#cach-hoc", "Cách học"],
              ["#tinh-nang", "Tính năng"],
              ["#lo-trinh", "Lộ trình 14 ngày"],
              ["#cau-hoi-thuong-gap", "Câu hỏi"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="inline-flex min-h-11 items-center rounded-full px-4 font-medium text-muted hover:bg-sunken hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <nav aria-label="Tài khoản" className="flex items-center gap-2">
            <ButtonLink href="/login" variant="secondary" className="min-h-11 px-4 text-sm sm:px-5">
              Đăng nhập
            </ButtonLink>
            {/* Bọc trong span để ẩn/hiện, vì class "hidden" xung đột với "inline-flex" của ButtonLink. */}
            <span className="hidden sm:block">
              <ButtonLink href="/signup" className="min-h-11 px-5 text-sm">
                Bắt đầu miễn phí
              </ButtonLink>
            </span>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* Phần đầu: tiêu đề lớn ở giữa, rồi một khung lớn chứa màn hình bài học minh họa. */}
        <section className="mx-auto grid w-full max-w-7xl justify-items-center gap-7 px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-20">
          <span className="rise-in">
            <Chip tone="blue" icon={<BookOpenText className="size-4" aria-hidden />}>
              Bám sách Global Success lớp 6–12 · bản thử nghiệm
            </Chip>
          </span>
          <h1 className="rise-in rise-in-2 max-w-4xl text-balance text-5xl font-semibold leading-[1.08] tracking-tight sm:text-7xl">
            Nghe câu hỏi là <Highlight>nói được</Highlight>
          </h1>
          <p className="rise-in rise-in-3 max-w-2xl text-lg text-muted sm:text-xl">
            Nhiều bạn biết từ vựng và ngữ pháp, nhưng được hỏi bằng tiếng Anh thì mất vài giây mới mở lời. LINGUA-REFLEX luyện đúng khoảng đó, với bài
            lấy từ sách bạn đang học.
          </p>
          <div className="rise-in rise-in-3 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" className="min-h-13 px-8 text-lg">
              Bắt đầu miễn phí
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="min-h-13 px-8 text-lg">
              Tôi đã có tài khoản
            </ButtonLink>
          </div>
        </section>

        <section aria-label="Màn hình bài học (minh họa)" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
          <div className="rise-in rise-in-3 relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-soft via-[#eaf3ff] to-success-soft px-4 pb-10 pt-10 sm:px-12 sm:pt-14">
            <HeroPreview />
          </div>
          <p className="mt-3 text-center text-sm text-muted">Hình minh họa giao diện, không phải kết quả của học sinh nào.</p>
        </section>

        {/* Câu chuyện: biết → luyện có hỗ trợ → tự nói. */}
        <section id="cach-hoc" className="scroll-mt-20 bg-tint py-20" aria-labelledby="story-title">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6">
            <div className="reveal grid justify-items-center gap-4 text-center">
              <h2 id="story-title" className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                Từ <Highlight tone="green">biết</Highlight> tới <Highlight>tự nói</Highlight>
              </h2>
              <p className="max-w-2xl text-lg text-muted">
                Học xong bài chưa có nghĩa là đã nói được. LINGUA-REFLEX tách rõ ba việc: học kiến thức, luyện có hỗ trợ, và tự nói không cần trợ giúp.
              </p>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {[
                { icon: <BookOpenText className="size-6" aria-hidden />, tone: "bg-brand-soft text-brand-strong", title: "Biết", text: "Kho kiến thức của từng Unit: từ vựng có phiên âm và giọng đọc, ngữ pháp có câu đúng và câu sai, cụm câu hay dùng. Mỗi mục ghi nguồn." },
                { icon: <Sparkles className="size-6" aria-hidden />, tone: "bg-gold-soft text-warn", title: "Luyện có hỗ trợ", text: "Kim tự tháp và gợi ý từng bước giúp bạn nói được câu đầu tiên. Gợi ý giảm dần khi bạn nói tốt hơn." },
                { icon: <Mic className="size-6" aria-hidden />, tone: "bg-success-soft text-success-strong", title: "Tự nói", text: "Câu hỏi mới, không gợi ý. So sánh với bài đầu module để thấy bạn tự vận dụng được, không chỉ nhớ bài." },
              ].map((s, i) => (
                <li key={s.title} className="reveal grid content-start gap-4 rounded-[2rem] bg-surface p-7">
                  <span className={`grid size-12 place-items-center rounded-full ${s.tone}`}>{s.icon}</span>
                  <Eyebrow>Bước {i + 1}</Eyebrow>
                  <h3 className="text-2xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="text-muted">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="tinh-nang" className="mx-auto grid w-full max-w-7xl scroll-mt-20 gap-12 px-4 py-20 sm:px-6" aria-labelledby="features-title">
          <div className="reveal grid justify-items-center gap-4 text-center">
            <h2 id="features-title" className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Bốn cách luyện <Highlight tone="yellow">phản xạ</Highlight>
            </h2>
            <p className="max-w-2xl text-lg text-muted">Mỗi cách luyện có một việc riêng. Lộ trình 14 ngày xếp chúng theo đúng thứ tự, từ dễ tới khó.</p>
          </div>
          <FeatureTabs features={features} />
        </section>

        <section id="lo-trinh" className="scroll-mt-20 bg-tint py-20" aria-labelledby="path-title">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 sm:px-6">
            <div className="reveal grid justify-items-center gap-4 text-center">
              <h2 id="path-title" className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
                Mỗi Unit là <Highlight tone="red">14 ngày</Highlight>
              </h2>
              <p className="max-w-2xl text-lg text-muted">
                Mỗi ngày 15–25 phút, cả module khoảng 5 giờ. Mỗi ngày có mục tiêu và tiêu chí hoàn thành riêng; cuối mỗi giai đoạn có bài kiểm tra ngắn.
              </p>
            </div>
            <ol className="grid gap-3 md:grid-cols-5">
              {phases.map((p) => (
                <li key={p.no} className={`reveal grid content-start gap-3 rounded-[2rem] p-6 ${p.tone}`}>
                  <span className="flex items-center gap-2 text-sm font-medium text-muted">
                    <span aria-hidden className={`size-2.5 rounded-full ${p.dot}`} />
                    Giai đoạn {p.no} · {p.days}
                  </span>
                  <h3 className="text-xl font-semibold tracking-tight">{p.title}</h3>
                  <p className="text-sm text-ink/80">{p.text}</p>
                </li>
              ))}
            </ol>
            <p className="reveal text-center text-muted">Bài sau tự điều chỉnh theo kết quả thật: nhớ từ tốt thì bớt bài từ vựng, hay sai ngữ pháp thì thêm bài xếp câu, trả lời chậm thì thêm Speed Q&amp;A.</p>
          </div>
        </section>

        {/* Đo được tiến bộ, và trung thực về những gì máy làm được. */}
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6" aria-labelledby="honest-title">
          <div className="reveal grid justify-items-center gap-4 text-center">
            <h2 id="honest-title" className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Tiến bộ <Highlight tone="green">đo được</Highlight>
            </h2>
            <p className="max-w-2xl text-lg text-muted">Không có điểm tổng. Mỗi tiêu chí đứng riêng, và luôn ghi rõ đâu là máy đo, đâu là AI nhận xét.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: <Timer className="size-6" aria-hidden />, title: "Đo trực tiếp", text: "Thời gian bắt đầu nói, số từ, độ trôi chảy, từ của bài đã dùng, có nêu lý do. Máy tính bằng quy tắc, không do AI." },
              { icon: <Sparkles className="size-6" aria-hidden />, title: "AI nhận xét", text: "Đúng câu hỏi, ngữ pháp, từ vựng, đủ ý. AI chỉ được nêu lỗi trích đúng lời bạn nói; lỗi bịa bị máy chủ bỏ." },
              { icon: <Ear className="size-6" aria-hidden />, title: "Từ máy nghe chưa rõ", text: "Thay cho chấm phát âm: tô các từ máy nghe chưa chắc, kèm giọng đọc mẫu. Không kết luận bạn phát âm sai." },
            ].map((c) => (
              <article key={c.title} className="reveal grid content-start gap-3 rounded-[2rem] border border-line p-7">
                <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand-strong">{c.icon}</span>
                <h3 className="text-2xl font-semibold tracking-tight">{c.title}</h3>
                <p className="text-muted">{c.text}</p>
              </article>
            ))}
          </div>
          <div className="reveal grid gap-6 rounded-[2rem] bg-tint p-7 sm:p-10 md:grid-cols-[auto_1fr] md:items-center">
            <span className="grid size-14 place-items-center rounded-full bg-surface text-brand">
              <Users className="size-7" aria-hidden />
            </span>
            <div className="grid gap-2">
              <h3 className="text-2xl font-semibold tracking-tight">Cho giáo viên</h3>
              <p className="text-muted">
                Tạo lớp và chia sẻ mã lớp; xem tiến độ module của từng học sinh, lỗi hay gặp của cả lớp và hoạt động gần đây; duyệt từng mục nội dung
                trước khi học sinh dùng. Không xếp hạng học sinh.
              </p>
            </div>
          </div>
        </section>

        <section id="cau-hoi-thuong-gap" className="scroll-mt-20 bg-tint py-20" aria-labelledby="faq-title">
          <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 sm:px-6">
            <h2 id="faq-title" className="reveal text-center text-4xl font-semibold tracking-tight sm:text-5xl">
              Câu hỏi thường gặp
            </h2>
            <div className="grid gap-3">
              {faqs.map((f) => (
                <details key={f.q} className="reveal group rounded-3xl bg-surface px-6 py-1">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 py-2 text-lg font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="pb-5 text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
          <div className="reveal grid justify-items-center gap-6 rounded-[2.5rem] bg-brand px-6 py-16 text-center text-on-brand">
            <h2 className="max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Sẵn sàng cho câu trả lời đầu tiên?</h2>
            <p className="max-w-xl text-lg text-white/85">Mỗi ngày vài câu trả lời bằng giọng nói. Nói được rồi, nói hay sẽ đến sau.</p>
            <Link href="/signup" className="press inline-flex min-h-13 items-center rounded-full bg-surface px-8 text-lg font-medium text-brand-strong hover:shadow-float">
              Tạo tài khoản miễn phí
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-tint">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[2fr_1fr_1fr]">
          <div className="grid content-start gap-3">
            <Logo />
            <p className="max-w-sm text-sm text-muted">Bản thử nghiệm của nhóm The Linguines. Nội dung luyện tập bám theo chủ đề sách Global Success.</p>
          </div>
          <nav aria-label="Sản phẩm" className="grid content-start gap-2 text-sm">
            <p className="font-medium">Sản phẩm</p>
            <a href="#cach-hoc" className="text-muted hover:text-ink">Cách học</a>
            <a href="#tinh-nang" className="text-muted hover:text-ink">Tính năng</a>
            <a href="#lo-trinh" className="text-muted hover:text-ink">Lộ trình 14 ngày</a>
          </nav>
          <nav aria-label="Thông tin" className="grid content-start gap-2 text-sm">
            <p className="font-medium">Thông tin</p>
            <Link href="/quyen-rieng-tu" className="text-muted hover:text-ink">
              Quyền riêng tư
            </Link>
            <Link href="/login" className="text-muted hover:text-ink">
              Đăng nhập
            </Link>
            <Link href="/signup" className="text-muted hover:text-ink">
              Đăng ký
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ---- Ảnh giao diện minh họa (dựng bằng HTML, chỉ để xem; trình đọc màn hình đọc nhãn của khung). ----------------- */

function Window({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[1.75rem] bg-surface p-5 shadow-float sm:p-7 ${className}`}>{children}</div>;
}

/** Màn hình bài học Speed Q&A đang ghi âm, kèm thẻ "Em làm tốt" nổi bên cạnh. */
function HeroPreview() {
  return (
    <div aria-hidden className="relative mx-auto max-w-4xl">
      <Window className="mx-auto max-w-2xl text-left">
        <div className="flex items-center gap-3">
          <X className="size-5 text-muted" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
            <div className="h-full w-3/5 rounded-full bg-success" />
          </div>
          <span className="text-sm font-medium text-muted">6/10</span>
        </div>
        <span className="mt-5 inline-block rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">Speed Q&amp;A</span>
        <div className="mt-4 rounded-[1.5rem] bg-tint px-6 py-6">
          <p lang="en" className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            What can students do to keep their school green?
          </p>
        </div>
        <div className="mt-6 grid justify-items-center gap-3">
          <div className="relative grid size-28 place-items-center">
            <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
              <circle cx="64" cy="64" r="58" fill="none" stroke="var(--line)" strokeWidth="5" />
              <circle cx="64" cy="64" r="58" fill="none" stroke="var(--gold)" strokeWidth="5" strokeLinecap="round" strokeDasharray="364" strokeDashoffset="150" />
            </svg>
            <span className="grid size-20 place-items-center rounded-full bg-danger-bright text-white shadow-float">
              <span className="size-6 rounded-md bg-white" />
            </span>
          </div>
          <div className="wave-live flex h-10 items-center gap-1">
            {Array.from({ length: 22 }, (_, i) => (
              <span key={i} className="block h-full w-1.5 rounded-full bg-brand" style={{ ["--i" as string]: i }} />
            ))}
          </div>
          <p className="text-sm font-medium text-muted">Đang ghi 0:02 · Mục tiêu: bắt đầu nói trong 3 giây</p>
        </div>
      </Window>
      <div className="absolute -right-2 top-24 hidden w-60 rounded-3xl bg-surface p-4 text-left shadow-float lg:block">
        <p className="flex items-center gap-1.5 font-medium text-success-strong">
          <ShieldCheck className="size-4" /> Em làm tốt
        </p>
        <p className="mt-1 text-sm">Bắt đầu nói sau 2,4 giây, kịp mục tiêu.</p>
      </div>
      <div className="absolute -left-2 bottom-16 hidden w-56 rounded-3xl bg-surface p-4 text-left shadow-float lg:block">
        <p className="font-medium text-warn">Nên luyện tiếp</p>
        <p className="mt-1 text-sm">Thêm một lý do với “because…”.</p>
      </div>
    </div>
  );
}

function PyramidPreview() {
  const tiers = [
    { w: "w-2/5", c: "bg-danger-bright", t: "Tầng 3 · Hội thoại" },
    { w: "w-3/5", c: "bg-gold", t: "Tầng 2 · Mở rộng có lý do" },
    { w: "w-4/5", c: "bg-success", t: "Tầng 1 · Khung câu, Speed Q&A" },
    { w: "w-full", c: "bg-brand", t: "Tầng 0 · Từ vựng" },
  ];
  return (
    <div aria-hidden className="rounded-[2rem] bg-gradient-to-br from-brand-soft to-success-soft p-6 sm:p-10">
      <Window>
        <div className="grid justify-items-center gap-2">
          {tiers.map((t, i) => (
            <div key={t.t} className={`pop-in ${t.w} rounded-2xl ${t.c} px-4 py-3 text-center text-sm font-medium text-white sm:text-base`} style={{ ["--i" as string]: 3 - i }}>
              {t.t}
            </div>
          ))}
        </div>
      </Window>
    </div>
  );
}

function RescuePreview() {
  return (
    <div aria-hidden className="rounded-[2rem] bg-gradient-to-br from-gold-soft to-brand-soft p-6 sm:p-10">
      <Window className="grid gap-3">
        <p lang="en" className="text-xl font-semibold tracking-tight">
          How do you usually spend your free time?
        </p>
        <div className="rounded-2xl bg-brand-soft px-4 py-3">
          <p className="text-sm font-medium text-brand-strong">Gợi ý 1 · Hướng nghĩ</p>
          <p className="text-sm">Nghĩ về một hoạt động em làm mỗi cuối tuần.</p>
        </div>
        <div className="rounded-2xl bg-brand-soft px-4 py-3">
          <p className="text-sm font-medium text-brand-strong">Gợi ý 2 · Từ khóa</p>
          <p lang="en" className="text-sm">
            hang out, play sports, at the weekend
          </p>
        </div>
        <span className="w-fit rounded-full bg-sunken px-4 py-2 text-sm font-medium text-muted">Mở gợi ý 3 · Khung câu</span>
      </Window>
    </div>
  );
}

function SpeedPreview() {
  const rows = [
    { d: "Buổi 1", ms: 7.1, w: "w-full" },
    { d: "Buổi 3", ms: 5.6, w: "w-4/5" },
    { d: "Buổi 5", ms: 4.2, w: "w-3/5" },
  ];
  return (
    <div aria-hidden className="rounded-[2rem] bg-gradient-to-br from-success-soft to-gold-soft p-6 sm:p-10">
      <Window className="grid gap-4">
        <p className="font-medium">Thời gian bắt đầu nói (ví dụ)</p>
        {rows.map((r, i) => (
          <div key={r.d} className="grid grid-cols-[4rem_1fr_4rem] items-center gap-3 text-sm">
            <span className="text-muted">{r.d}</span>
            <span className="h-2.5 overflow-hidden rounded-full bg-sunken">
              <span className={`grow-x block h-full rounded-full bg-success ${r.w}`} style={{ ["--i" as string]: i }} />
            </span>
            <span className="text-right font-medium tabular-nums">{String(r.ms).replace(".", ",")} giây</span>
          </div>
        ))}
        <p className="rounded-2xl bg-success-soft px-4 py-3 text-sm text-success-strong">Mục tiêu mới: 3,5 giây (vì đã kịp ở 4/6 câu)</p>
      </Window>
    </div>
  );
}

function RoleplayPreview() {
  const lines = [
    { ai: true, t: "Hi! What activity should our club do next month?" },
    { ai: false, t: "I think we should organise a recycling day, because…" },
    { ai: true, t: "Interesting! But won't students find it boring?" },
  ];
  return (
    <div aria-hidden className="rounded-[2rem] bg-gradient-to-br from-danger-soft to-brand-soft p-6 sm:p-10">
      <Window className="grid gap-3">
        <p className="text-sm font-medium text-muted">Họp câu lạc bộ Môi trường · lượt 2/4</p>
        {lines.map((l, i) => (
          <div key={i} className={`flex items-end gap-2 ${l.ai ? "" : "flex-row-reverse"}`}>
            <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium ${l.ai ? "bg-gold text-ink" : "bg-brand text-white"}`}>{l.ai ? "M" : "Em"}</span>
            <span lang="en" className={`rounded-3xl px-4 py-2.5 text-sm ${l.ai ? "rounded-bl-md bg-sunken" : "rounded-br-md bg-brand-soft"}`}>
              {l.t}
            </span>
          </div>
        ))}
      </Window>
    </div>
  );
}
