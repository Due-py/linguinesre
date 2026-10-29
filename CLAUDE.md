# LINGUA-REFLEX

Nền tảng luyện nói tiếng Anh cho học sinh THCS (Next.js, Supabase, Tailwind v4). Đọc [AGENTS.md](AGENTS.md): Next.js bản này khác bản cũ, đọc `node_modules/next/dist/docs/` trước khi viết mã.

## Giao diện
Mọi UI phải theo [DESIGN.md](DESIGN.md) (sáng kiểu Stripe/Linear: nền trắng xám-xanh, chữ navy, tím xanh làm màu nhấn duy nhất, Inter, lucide-react). Token ở `src/app/globals.css`.

## Nguyên tắc sản phẩm (từ mô tả dự án)
- Không dữ liệu giả: điểm, tiến độ, báo cáo phải đến từ dữ liệu thật; chưa có dữ liệu thì hiện trạng thái bắt đầu.
- Tách "đo trực tiếp" khỏi "AI nhận xét"; không điểm tổng; dùng trợ giúp không bị phạt.
- Phân quyền ở cả giao diện lẫn máy chủ: RLS là lớp quyết định. Khóa bí mật chỉ ở máy chủ (`import "server-only"`).
- Không tuyên bố tính năng xong khi chưa kiểm thử. Phân biệt rõ: chạy thật / chỉ có giao diện / chưa xây / cần cấu hình ngoài.

## Lệnh
`npm run dev` · `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`. Mỗi mốc phải qua cả bốn lệnh kiểm tra.
