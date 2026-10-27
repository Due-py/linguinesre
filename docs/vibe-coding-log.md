# Nhật ký Vibe Coding

Minh chứng cho tiêu chí Vibe Coding: mỗi buổi ghi lại **nhờ AI làm gì → AI tạo ra gì → nhóm kiểm tra thế nào → nhóm sửa gì**.
Ghi thật, kể cả lúc AI sai. Kèm tên file video quay màn hình của buổi đó (nếu có).

| Ngày | Người làm | Nhờ AI làm gì | AI tạo ra gì | Nhóm kiểm tra thế nào | Nhóm sửa / quyết định gì | Video |
|---|---|---|---|---|---|---|
| 27/10/2026 | | Đọc đề cương, thể lệ, SGK, 4 video thiết kế; lập kế hoạch và chọn công nghệ | Kế hoạch 7 giai đoạn, đề xuất 3 bộ công nghệ, CLAUDE.md | Đọc lại kế hoạch, trả lời các câu hỏi AI đưa ra | Chọn Bộ A, OpenAI, Unit 1 lớp 8 trước; thêm luồng giới thiệu → mã lớp → Test thử; Roleplay đầy đủ trong V1 | |
| 27/10/2026 | | Giai đoạn 0: tạo khung web | Khung Next.js + Tailwind, font Manrope, màu theo video thiết kế, trang tạm | Chạy `npm run lint`, `npm run build`, mở web trên máy | Đưa lên GitHub + Vercel | |
| 27/10/2026 | | Soạn nội dung Lớp 8 Unit 1 từ SGK trang 8–17 + Glossary trang 136 (Claude tự đọc PDF) | Khuôn dữ liệu chung cho 78 Unit, file nội dung Unit 1 (nháp), kiểm tra tự động, trang duyệt `/lab/content` | Bài kiểm tra tự động bắt lỗi: dấu `*` trong từ khóa bị xóa nên `friend*`, `*ing` không khớp → AI sửa | Nhóm quyết định: thêm câu **từ chối** lời mời (ngoài sách, ghi chú cho cô duyệt) | |
| 27/10/2026 | | Giai đoạn 1b: trang giới thiệu, đăng ký / đăng nhập bằng mã lớp | Trang giới thiệu, trang đăng ký / đăng nhập / góc học, bảng dữ liệu + quy tắc bảo vệ (RLS), khóa 15 phút khi sai PIN 5 lần | 41 bài kiểm tra tự động; chạy web khi chưa có Supabase → báo "chưa kết nối", không lỗi | Chưa thử với Supabase thật (chờ nhóm tạo project) | |
| 27/10/2026 | | Giai đoạn 1a: trang đo thời gian phản xạ `/lab/latency` | Phần tính toán + 17 bài kiểm tra tự động, phần nghe micro, 5 câu hỏi âm thanh, trang đo, hướng dẫn đo | Chạy test; chạy trang trong Chrome với micro giả (có tiếng / im lặng) | AI phát hiện file âm thanh có 0,86 s im lặng ở cuối → cắt bỏ; lần chạy thử ra 33 ms và 55 ms (vô lý) → thêm quy tắc "< 150 ms = Nói sớm" | |
