import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const levels = [
  { name: "Level 0", label: "Từ vựng", detail: "Nghe phát âm chuẩn, nhắc lại từ khóa của Unit.", tile: "bg-level-0" },
  { name: "Level 1", label: "Câu khung", detail: "“In my free time, I like ___.” Điền vào và nói thành câu.", tile: "bg-level-1" },
  { name: "Level 2", label: "Mở rộng câu", detail: "Thêm lý do, cảm xúc: “…because it is fun.”", tile: "bg-level-2" },
  { name: "Level 3", label: "Nói đoạn", detail: "Ghép các câu thành bài nói khoảng 30 giây.", tile: "bg-level-3" },
];

const rescue = ["Gợi ý bằng hình", "Câu mở đầu tiếng Anh", "Câu hỏi dễ hơn", "Từ khóa tiếng Việt"];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-20 pt-10">
        <section className="flex flex-col items-start gap-6">
          <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent-ink">
            Luyện nói tiếng Anh theo SGK Global Success
          </span>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">
            Biến kiến thức trên giấy thành phản xạ trên môi.
          </h1>
          <p className="max-w-2xl text-lg text-muted sm:text-xl">
            LinguaReflex giúp bạn dùng chính từ vựng và mẫu câu đã học trên lớp để <b>nói</b> — từng bước từ dễ
            đến khó, và nhanh dần lên mỗi ngày.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/dang-ky" className="rounded-full bg-accent px-6 py-3 font-bold text-accent-ink">
              Bắt đầu với mã lớp
            </Link>
            <Link href="/dang-nhap" className="rounded-full border border-line bg-surface px-6 py-3 font-bold">
              Mình đã có tài khoản
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Từ một từ đến một đoạn nói</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {levels.map((level) => (
              <li key={level.name} className={`${level.tile} flex flex-col gap-6 rounded-3xl p-6`}>
                <span className="text-sm font-semibold text-muted">{level.name}</span>
                <span>
                  <span className="block text-xl font-extrabold">{level.label}</span>
                  <span className="mt-1 block text-sm">{level.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid items-center gap-8 rounded-3xl bg-surface p-8 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-muted">Speed Q&amp;A</span>
            <h2 className="text-3xl font-extrabold">Bớt dịch trong đầu, nói ra nhanh hơn</h2>
            <p className="text-muted">
              Thời gian suy nghĩ giảm dần. Web tự nghe lúc bạn bắt đầu nói — không cần bấm nút — và ghi lại tốc độ
              phản xạ để bạn thấy mình tiến bộ.
            </p>
          </div>
          <p className="flex items-baseline gap-3 text-5xl font-extrabold text-accent sm:text-6xl">
            5s <span className="text-2xl text-muted">→</span> 3s <span className="text-2xl text-muted">→</span> 1,5s
          </p>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-3xl bg-level-1 p-8">
            <span className="text-sm font-semibold text-muted">Khi bị bí</span>
            <h2 className="text-2xl font-extrabold">Gợi ý từng bậc, không đưa đáp án</h2>
            <ol className="mt-2 flex flex-col gap-2">
              {rescue.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="text-sm text-muted">Sau gợi ý, bạn vẫn là người tự nói câu trả lời.</p>
          </div>
          <div className="flex flex-col gap-3 rounded-3xl bg-level-2 p-8">
            <span className="text-sm font-semibold text-muted">Micro-Roleplay</span>
            <h2 className="text-2xl font-extrabold">Hội thoại như ngoài đời</h2>
            <p>
              Rủ bạn đi xem phim, nhận lời hay từ chối một lời mời… Bạn nói chuyện với một “người bạn” AI, chỉ trong
              phạm vi từ và mẫu câu của Unit.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-3xl font-extrabold">AI trong LinguaReflex</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl bg-level-3 p-6">
              <p className="font-bold">AI làm</p>
              <p className="mt-2 text-sm">
                Tạo bài luyện theo Unit, nghe và nhận xét câu trả lời, gợi ý khi bạn bí, đóng vai bạn hội thoại.
              </p>
            </div>
            <div className="rounded-3xl bg-surface p-6">
              <p className="font-bold">AI không làm</p>
              <p className="mt-2 text-sm">
                Không thay thầy cô, không làm bài hộ, không đưa sẵn đáp án, không lưu giọng nói của bạn.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 text-sm text-muted">
        LinguaReflex · Nhóm The Linguines, lớp 8A1 — Trường TH, THCS và THPT FPT Bắc Giang · STEMPETITION 2027
      </footer>
    </>
  );
}
