# Cơ sở chấm bài thi thử nói bằng AI (thang thi-thu-v1)

Tài liệu này mô tả cách LINGUA-REFLEX chấm bài thi thử nói. Dùng để đưa vào đề cương ý tưởng. Mã nguồn: `src/lib/mockAiGrade.ts`; kiểm thử: `tests/mock-ai-grade.test.ts`, `tests/mock-ai-real.test.ts`.

## 1. Bài thi thử

- Mỗi khối (6–12) có một đề gồm 10 câu hỏi nói, soạn theo Unit 1–3 của sách giáo khoa:
  - 4 câu hỏi về bản thân;
  - 4 câu cần nêu lý do ("Why?");
  - 2 câu tình huống.
- Học sinh tự bấm ghi âm khi sẵn sàng; bài không có tiếng bíp và không giới hạn thời gian.
- Máy chép lời bằng Deepgram (nova-3).
- Đây không phải bài kiểm tra của nghiên cứu: đề khác, cách làm khác. Một test tự động kiểm tra để câu hỏi không giống đề A/B của nghiên cứu.

## 2. Thang điểm mỗi câu (0 · 1 · 2)

| Điểm | Khi nào |
|---|---|
| 2 | Trả lời đúng điều câu hỏi hỏi, thành câu (từ 5 từ trở lên); câu "Why" có nêu lý do |
| 1 | Trả lời đúng ý nhưng dưới 5 từ, hoặc câu "Why" chưa nêu lý do |
| 0 | Không trả lời, máy không nghe được lời, lạc đề, hoặc **chỉ đọc lại câu hỏi mà không trả lời** |

Điểm tối đa là 10 câu × 2 = 20. Trang web chỉ hiện số câu đạt 2 điểm, không cộng điểm tổng. Tổng /20 chỉ có trong file bảng điểm tải về.

## 3. Ai làm gì: AI nhận định, quy tắc cho điểm

**AI không cho điểm.** AI chỉ đọc lời máy chép rồi trả lời ba câu hỏi có/không, kèm trích dẫn:

1. `answers_question`: Em có trả lời đúng điều câu hỏi hỏi không? Lỗi ngữ pháp và lỗi chép lời nhỏ vẫn được chấp nhận.
2. `only_repeats_question`: Em có chỉ nói lại câu hỏi mà không thêm câu trả lời của mình không?
3. `gives_reason`: Em có nêu lý do hoặc giải thích không?

Kèm theo là `evidence`: một đoạn **trích nguyên văn** lời em nói làm bằng chứng, và `note_vi`: một câu nhận xét ngắn cho thầy cô.

**Điểm do quy tắc cố định quyết định.** Các quy tắc xét theo thứ tự; quy tắc đầu tiên khớp là kết quả:

| Quy tắc | Điều kiện | Điểm | Ai xác định |
|---|---|---|---|
| R0 | Không có lời (0 từ, không tính "uh/um") | 0 | Máy đo |
| R1 | Đọc lại câu hỏi mà không trả lời: ≥ 80% từ của câu hỏi có trong lời nói và độ dài chênh không quá 3 từ, **hoặc** AI nhận định `only_repeats_question` | 0 | Máy đo hoặc AI |
| R2 | AI nhận định không trả lời đúng câu hỏi | 0 | AI |
| R3 | Dưới 5 từ | 1 | Máy đo |
| R4 | Câu cần lý do mà không có lý do. Lý do chỉ được tính khi AI nói "có" **và** đoạn trích có thật trong lời em nói | 1 | AI + kiểm chứng |
| R5 | Còn lại: đúng ý, thành câu, có lý do khi cần | 2 | — |

Vì sao làm như vậy:
- R0 và R1 do máy đo quyết định trước khi gọi AI. Nhờ vậy, đọc lại câu hỏi **luôn bị 0 điểm**, AI không cứu được.
- AI không được đoán thêm. Nếu AI nói em có nêu lý do mà đoạn trích không có trong lời em nói, hệ thống coi như không có lý do. Cách này chống việc AI "bịa".
- Cùng một nhận định thì luôn ra cùng một điểm. Mọi quy tắc đều có kiểm thử tự động.
- Mỗi điểm AI được lưu kèm quy tắc đã áp dụng, nhận định, trích dẫn, tên mô hình, phiên bản thang chấm và lời máy chép lúc chấm. Nhờ đó luôn kiểm tra lại được vì sao em được điểm đó.

## 4. Vai trò của thầy cô

- Điểm AI là **gợi ý**. Thầy cô nghe lại bản ghi, đọc lời máy chép và nhận định của AI, rồi chấm lại 0/1/2 nếu thấy cần.
- Điểm thầy cô **luôn thay** điểm AI. Bảng điểm ghi rõ câu nào do thầy cô chấm, câu nào do AI chấm.
- Học sinh không thấy điểm AI.

## 5. Giới hạn đã biết

- AI chỉ đọc chữ, không nghe âm thanh. Vì vậy AI không chấm phát âm hay độ trôi chảy.
- Nếu máy chép lời sai, điểm AI có thể sai theo. Thầy cô nên nghe lại bản ghi khi điểm AI thấp.
- Ngưỡng 5 từ và ngưỡng 80% là quy ước của nhóm, chưa được kiểm chứng trên dữ liệu lớn.

## 6. Kiểm chứng: đã làm và sẽ làm

**Đã làm:**
- Kiểm thử tự động mọi quy tắc R0–R5, bao gồm trường hợp đọc lại câu hỏi và trường hợp trích dẫn giả.
- Chạy với mô hình thật trên 6 câu trả lời mẫu do nhóm viết, mỗi câu ứng với một mức điểm: AI chấm đúng 6/6. Đây chỉ là kiểm tra kỹ thuật, chưa phải bằng chứng về độ chính xác.

**Sẽ làm:**
- Lấy một phần bài của học sinh thật để thầy cô chấm độc lập, khi chưa xem điểm AI.
- So sánh điểm thầy cô với điểm AI: tính tỷ lệ trùng khớp và hệ số Cohen's kappa có trọng số.
- Ghi lại các trường hợp lệch để sửa quy tắc. Khi sửa quy tắc thì nâng số phiên bản thang chấm.
- Chỉ công bố độ chính xác của AI khi đã có số liệu này.
