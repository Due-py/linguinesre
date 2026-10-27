# Hướng dẫn duyệt nội dung một Unit

Mở trang `/lab/content` → chọn Unit. Đọc từng phần, đánh dấu vào danh sách dưới đây. Ghi lỗi vào một file hoặc nhắn cho Claude theo dạng: **phần – mã/câu – lỗi – đề xuất sửa**.

Mỗi Unit có trạng thái: **Nháp** → **Nhóm đã duyệt** (2 bạn trong nhóm đọc xong) → **Cô đã duyệt** (cô Vân xác nhận). Chỉ Unit "Cô đã duyệt" mới mở cho học sinh.

## Danh sách kiểm tra

**Level 0 – Từ vựng và phát âm**
- [ ] Nghĩa tiếng Việt đúng, dễ hiểu với học sinh.
- [ ] Phiên âm khớp với Glossary trong sách.
- [ ] Câu ví dụ đúng ngữ pháp, tự nhiên, đúng trình độ lớp.
- [ ] Từ luyện âm được xếp đúng âm.

**Level 1–2 – Câu khung và mở rộng**
- [ ] Khung câu đúng cấu trúc ngữ pháp của Unit.
- [ ] Gợi ý điền vào chỗ trống hợp lý (đúng dạng V-ing / to V...).
- [ ] Câu mở rộng dùng từ nối đúng (because, and, but, so).

**Level 3 – Nói đoạn**
- [ ] Đề bài rõ ràng, có thể nói trong khoảng 30 giây.
- [ ] Bài nói mẫu không quá khó, không quá dài so với trình độ.

**Speed Q&A**
- [ ] Câu hỏi ngắn, nghe một lần là hiểu.
- [ ] Từ khóa đủ rộng: thử nghĩ 3 câu trả lời **đúng** khác nhau — có câu nào bị máy chấm sai không?
- [ ] Từ khóa không quá rộng: một câu trả lời **sai / lạc đề** có lọt qua không?
- [ ] Gợi ý đi từ nhẹ đến mạnh: hình → câu mở đầu → câu hỏi dễ hơn → từ khóa tiếng Việt (không đưa đáp án hoàn chỉnh).

**Roleplay**
- [ ] Lời của bạn hội thoại tự nhiên, ngắn, đúng tình huống.
- [ ] Phần "Ngoài sách" (nếu có) phù hợp — **cô quyết định giữ hay bỏ**.

**Đọc to (cho Kokoro sau này)**
- [ ] Chữ viết tắt có dòng "🔊 đọc là" đúng (ví dụ DIY → "D I Y").

## Sau khi duyệt

Claude sửa file dữ liệu theo góp ý, rồi đổi `status` trong file:
`"draft"` → `"team-reviewed"` → `"teacher-approved"`.
