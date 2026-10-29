import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Quyền riêng tư" };

/**
 * Quyền riêng tư (M7). Chỉ mô tả những gì web THẬT SỰ làm, khớp với mã: bảng dữ liệu (supabase/migrations), dịch vụ bên
 * ngoài (Deepgram: src/app/api/transcribe, src/lib/research/score.ts; OpenAI: src/lib/feedback, src/lib/speaking/tts.ts).
 * Đổi cách lưu hoặc gửi dữ liệu thì phải sửa trang này cùng lúc.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-10 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo />
      </header>
      <main id="main" className="grid gap-10 pb-16">
        <div className="grid gap-3">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Quyền riêng tư</h1>
          <p className="text-lg text-muted">
            LINGUA-REFLEX là sản phẩm thử nghiệm của một nhóm học sinh, dùng cho việc luyện nói tiếng Anh và cho một nghiên cứu
            khoa học trong trường. Trang này nói rõ web lưu gì, gửi đi đâu, ai được xem và cách xóa.
          </p>
        </div>

        <Section title="Web lưu những gì">
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <strong>Tài khoản:</strong> email (giáo viên và học sinh tự đăng ký) hoặc mã học sinh như HS008 (học sinh tham gia
              nghiên cứu, không lưu họ tên), tên hiển thị, khối lớp, mục tiêu luyện tập nếu bạn chọn.
            </li>
            <li>
              <strong>Bài luyện:</strong> file ghi âm câu trả lời, chữ ghi lời (máy chuyển giọng nói thành chữ, bạn có thể sửa),
              thời gian suy nghĩ và thời gian nói do trình duyệt đo, mức gợi ý đã dùng, nhận xét của AI.
            </li>
            <li>
              <strong>Nếu bạn tham gia nghiên cứu:</strong> bài kiểm tra nói (file ghi âm, thời gian phản xạ), các buổi luyện
              chế độ A hoặc B (từng lượt nói, thời gian luyện), câu trả lời câu hỏi hằng tuần, và tên trình duyệt bạn dùng (để
              tìm lỗi ghi âm trên từng loại máy).
            </li>
          </ul>
          <p>Web không có quảng cáo, không bán dữ liệu và không dùng dữ liệu vào việc nào khác ngoài luyện tập và nghiên cứu này.</p>
        </Section>

        <Section title="Gửi cho dịch vụ nào">
          <ul className="grid list-disc gap-2 pl-5">
            <li>
              <strong>Supabase</strong> (máy chủ ở Singapore): nơi lưu tài khoản, dữ liệu và file ghi âm.
            </li>
            <li>
              <strong>Vercel</strong>: nơi chạy trang web.
            </li>
            <li>
              <strong>Deepgram</strong>: nhận file ghi âm để chuyển giọng nói thành chữ.
            </li>
            <li>
              <strong>OpenAI</strong>: nhận câu hỏi và chữ ghi lời câu trả lời để viết nhận xét; nhận chữ câu hỏi để tạo giọng
              đọc. Không gửi tên, email hay mã học sinh.
            </li>
          </ul>
          <p className="text-muted">Mỗi dịch vụ xử lý dữ liệu theo chính sách riêng của họ.</p>
        </Section>

        <Section title="Ai được xem">
          <ul className="grid list-disc gap-2 pl-5">
            <li>Học sinh chỉ xem được dữ liệu của chính mình.</li>
            <li>Giáo viên chỉ xem được bài luyện của học sinh trong lớp mình tạo, sau khi học sinh vào lớp bằng mã lớp.</li>
            <li>
              Nhóm nghiên cứu xem được dữ liệu nghiên cứu theo mã học sinh (không có họ tên trên web). Người chấm bài kiểm tra
              không biết bạn thuộc chế độ A hay B.
            </li>
          </ul>
          <p className="text-muted">Quyền xem được kiểm tra ở cả giao diện và cơ sở dữ liệu (Row Level Security).</p>
        </Section>

        <Section title="Xóa dữ liệu">
          <p>
            Sau khi đăng nhập, vào mục <strong>Tài khoản</strong> và chọn xóa. Tài khoản, file ghi âm và mọi dữ liệu liên quan bị
            xóa ngay, không lấy lại được.
          </p>
          <p>
            Nếu bạn tham gia nghiên cứu, bạn có thể rút lui bất cứ lúc nào. Dữ liệu nhóm nghiên cứu đã xuất ra file trước khi bạn
            xóa nằm trên máy của nhóm; hãy báo nhóm hoặc thầy cô phụ trách để xóa nốt.
          </p>
        </Section>

        <p className="text-muted">
          Có câu hỏi về dữ liệu? Hỏi thầy cô phụ trách lớp hoặc nhóm LINGUA-REFLEX.{" "}
          <Link href="/" className="font-semibold text-brand-strong underline underline-offset-4">
            Về trang chủ
          </Link>
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line pt-8">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      <div className="grid gap-3 text-lg leading-relaxed">{children}</div>
    </section>
  );
}
