# LINGUA-REFLEX

Nền tảng luyện nói tiếng Anh cho học sinh THCS (Next.js, Supabase, Tailwind v4). Đọc [AGENTS.md](AGENTS.md): Next.js bản này khác bản cũ, đọc `node_modules/next/dist/docs/` trước khi viết mã.

## Giao diện
Mọi UI phải theo [DESIGN.md](DESIGN.md) (tinh thần thiết kế sản phẩm Google, tham khảo chromeos.google: chữ tròn SF Pro Rounded / Nunito, tiêu đề lớn có từ khóa trong viên thuốc màu, màu Google có nghĩa cố định, thẻ bo tròn lớn, lucide-react; không linh vật, không XP/tim/xếp hạng/điểm tổng). Token ở `src/app/globals.css`. Trang nghiên cứu bọc `.theme-classic` giữ giao diện cũ tới hết nghiên cứu.

## Nguyên tắc sản phẩm (từ mô tả dự án)
- Không dữ liệu giả: điểm, tiến độ, báo cáo phải đến từ dữ liệu thật; chưa có dữ liệu thì hiện trạng thái bắt đầu.
- Tách "đo trực tiếp" khỏi "AI nhận xét"; không điểm tổng; dùng trợ giúp không bị phạt.
- Phân quyền ở cả giao diện lẫn máy chủ: RLS là lớp quyết định. Khóa bí mật chỉ ở máy chủ (`import "server-only"`).
- Không tuyên bố tính năng xong khi chưa kiểm thử. Phân biệt rõ: chạy thật / chỉ có giao diện / chưa xây / cần cấu hình ngoài.

## Lệnh
`npm run dev` · `npm run lint` · `npm run typecheck` · `npm run test` · `npm run build`. Mỗi mốc phải qua cả bốn lệnh kiểm tra.
