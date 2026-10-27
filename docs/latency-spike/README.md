# Thử nghiệm đo thời gian phản xạ (Giai đoạn 1a)

## Mục đích

Trước khi làm Speed Q&A, cần biết chắc 3 điều trên **máy thật**:

1. Web có **tự phát hiện được lúc học sinh bắt đầu nói** không (không cần bấm nút)?
2. Số đo có **ổn định, hợp lý** không (không có lần nào vô lý, không lỗi)?
3. **Nhận dạng giọng nói của trình duyệt** (cách B) có chạy trên iPhone / Android không? Nếu không → dùng Whisper của OpenAI (tốn tiền).

## Cách web đo

- **Thời gian phản xạ** = từ lúc **câu hỏi vừa đọc xong** → đến lúc **bắt đầu có tiếng nói** trong micro.
- Thời điểm "câu hỏi xong" tính theo đồng hồ âm thanh của máy (lúc bắt đầu phát + độ dài file + độ trễ loa), không tính lúc bấm nút.
- File câu hỏi đã được **cắt khoảng lặng ở cuối** (giọng Windows tự thêm ~0,86 giây im lặng — nếu không cắt, số đo sẽ sai gần 1 giây).
- Trước khi đo, web nghe **2 giây im lặng** để biết tiếng ồn phòng, rồi chọn ngưỡng "có tiếng nói".
- Tiếng phải to hơn ngưỡng **liên tục ≥ 60 ms** mới tính (tránh tiếng cạch, tiếng gõ).
- Kết quả mỗi lần:
  - **Hợp lệ**: có số mili-giây.
  - **Nói sớm**: nói chồng lên câu hỏi, hoặc nhanh hơn **150 ms** sau khi câu hỏi xong (con người không phản xạ nhanh vậy → là đoán trước). Không tính vào thống kê.
  - **Không nghe thấy**: 8 giây không có tiếng.
- Độ chính xác dự kiến: khoảng ±20–30 ms (web đọc micro mỗi 10 ms, mỗi lần đọc là ~20 ms âm thanh gần nhất). Đủ chính xác vì mục tiêu là 1,5–5 giây.

## Hai cách đo

| Cách | Hoạt động | Ghi chú |
|---|---|---|
| **A** | Chỉ đo độ to của tiếng | Chạy mọi máy, không gửi âm thanh đi đâu |
| **A + B** | A + nhận dạng giọng nói của trình duyệt (ra chữ) | Chrome gửi âm thanh lên Google, Safari lên Apple → phải ghi vào giấy đồng ý phụ huynh |

## Cách làm (mỗi máy)

Máy cần thử: **laptop (Chrome)**, **iPhone (Safari)**, **Android (Chrome)**.

1. Mở **https://linguinesre.vercel.app/lab/latency** (phải là link https).
2. Gõ **Tên thiết bị**, ví dụ `iPhone 13 - Safari`.
3. Ngồi chỗ yên tĩnh. Để loa vừa phải (hoặc tai nghe).
4. Chọn cách **A**, số lần **20** → bấm **Bắt đầu** → cho phép micro.
5. Giữ im lặng 2 giây đầu. Sau mỗi câu hỏi, **trả lời tự nhiên bằng tiếng Anh** (1 câu ngắn), không cố nói thật nhanh.
6. Xong 20 lần → bấm **Tải CSV** và **Tải JSON**.
7. Làm lại với cách **A + B** (nếu máy cho chọn). Nếu máy không cho chọn → ghi lại là "không hỗ trợ".
8. Ghi chú lại mọi điều lạ: hỏi quyền micro nhiều lần, câu hỏi không phát, báo lỗi, chữ nhận ra sai...

Gửi các file tải về cho Claude hoặc chép vào `docs/latency-spike/data/`.

## Sau khi có dữ liệu

Claude sẽ viết `docs/latency-spike/RESULTS.md` **chỉ từ số đo thật** và đề xuất:
- giữ Web Speech (cách B) hay chuyển sang Whisper;
- ngưỡng/thông số có cần chỉnh không.

> Kiểm tra máy đã làm (27/10/2026, chỉ để chứng minh trang chạy, **không phải dữ liệu thật**): Chrome chạy ngầm với micro giả trên laptop — chạy hết vòng không lỗi; micro im lặng → 3/3 "Không nghe thấy" (không nghe nhầm); tiếng nói chồng lên câu hỏi → "Nói sớm". Cách B chưa thử được (cần trình duyệt thật).
