# DESIGN.md: LINGUA-REFLEX

Quy tắc thiết kế giao diện. Mọi trang và thành phần mới phải theo file này. Token màu nằm trong `src/app/globals.css`.

## 1. Cảm giác chung

Sáng, gọn, chính xác kiểu Stripe/Linear, nhưng vẫn dịu và khuyến khích. Học sinh lớp 6–12 dùng chủ yếu trên điện thoại và sẽ nói vào micro. Không áp lực điểm số, không bảng xếp hạng, không hiệu ứng chỉ để trông "hiện đại".

## 2. Công nghệ

Tailwind CSS v4 với token trong `globals.css`. Phông Inter biến thiên (qua `next/font`, có bộ dấu tiếng Việt). Icon: `lucide-react`. Chuyển động bằng CSS thuần (`rise-in`), không thêm thư viện hoạt ảnh. Chưa có chế độ tối.

## 3. Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `bg` | `#F6F9FC` | Nền trang (trắng xám-xanh rất nhạt) |
| `surface` | `#FFFFFF` | Thẻ, ô nhập, thanh đầu trang |
| `sunken` | `#EEF2F7` | Khối nhấn nhẹ, khung đang tải |
| `ink` | `#0A2540` | Chữ chính, xanh navy (14.7:1 trên `bg`) |
| `muted` | `#425466` | Chữ phụ (7.4:1 trên `bg`) |
| `line` / `line-strong` | `#E3E8EE` / `#C4CCD8` | Viền mỏng / viền nút phụ |
| `brand` | `#533AFD` | Màu nhấn duy nhất: nút chính, liên kết, tab đang chọn. Chữ trắng trên nền này 6.2:1 |
| `brand-strong` | `#3D26D6` | Hover, chữ nhấn trên `brand-soft` |
| `brand-soft` | `#EFEDFF` | Nền nhãn, gợi ý, ô biểu tượng |
| `forest` / `on-forest` | `#0A2540` / `#FFFFFF` | Mảng navy đậm: khối "Hôm nay", khối hoàn thành. Chữ phụ `on-forest-muted` `#ADBDCC` (8.1:1). Tên token giữ từ bản cũ |
| `warn` / `warn-soft` | `#7A4E00` / `#FFF4DC` | Cảnh báo nhẹ, "dữ liệu còn ít" |
| `danger` / `danger-soft` | `#B3261E` / `#FDECEA` | Lỗi |

Quy tắc:
- Một màu nhấn duy nhất là tím xanh `brand`. Không thêm màu nhấn thứ hai.
- Điểm nhấn trang trí duy nhất là dải màu chuyển `stripe-gradient` (tím, hồng, vàng, xanh nhạt). Chỉ dùng ở thẻ ví dụ trên trang chủ và nửa trái khung đăng nhập. Không đặt chữ nhỏ lên dải này.
- Không dùng `brand` làm chữ nhỏ trên `bg` nếu chưa kiểm tương phản; dùng `brand-strong`.
- **Không bao giờ chỉ dùng màu để báo trạng thái.** Luôn kèm biểu tượng và chữ.

## 4. Chữ

Chữ thân tối thiểu 16px. Tiêu đề đậm vừa (650, `font-extrabold` đã được đặt lại thành 650), khoảng cách chữ hẹp −0.02em. Nhấn trong câu dùng 600. Câu hỏi tiếng Anh trên màn hình luyện nói là phần chữ lớn nhất, gắn `lang="en"`. Chữ tiếng Việt luôn đủ dấu.

## 5. Thành phần

- Nút chính: bo tròn hoàn toàn, nền `brand`, chữ trắng 600, cao ≥ 48px, bóng mỏng `shadow-button` (xem `ButtonLink`). Nút phụ: nền trắng, viền 1px `line-strong`.
- Thẻ: `rounded-2xl`, nền `surface`, viền 1px `line` hoặc bóng mỏng `shadow-card`. Không dùng viền 2px, không dùng bóng đáy dày.
- Thanh đầu trang khi đã đăng nhập: trắng mờ, dính trên cùng, viền dưới 1px; tab đang chọn gạch chân 2px `brand`.
- Vùng chạm tối thiểu 44×44px. Focus nhìn thấy rõ (viền 3px màu `ink`, đã đặt toàn cục).
- Ô nhập: cao ≥ 52px, chữ ≥ 16px (tránh iPhone tự phóng to), luôn có `<label>`.
- Biểu mẫu: lỗi hiện cạnh trường, dễ hiểu, có `role="alert"`; nút có trạng thái đang xử lý.
- Thao tác không hoàn tác được (xóa lớp, xóa dữ liệu) luôn có bước xác nhận. Xóa tài khoản: gõ chữ `xoa`, nút nền `danger`.

## 5b. Họa tiết sóng âm và bố cục

- Họa tiết nhận diện là **sóng âm** (`Waveform`), trồi lên đúng một lần lúc vào trang, màu trắng trên dải màu chuyển của khung đăng nhập. Không rải khắp nơi.
- Danh sách (lớp, học sinh, hồ sơ) dùng **hàng ngăn bằng đường kẻ**, không dùng lưới thẻ giống hệt nhau. Thẻ bo lớn chỉ dành cho khối nhấn hoặc trạng thái trống.
- Tiêu đề viết hoa đầu câu, không nhãn chữ hoa phía trên tiêu đề, không đánh số trừ khi nội dung thật sự là một chuỗi bước.

## 6. Chuyển động

Hiện dần nhẹ khi vào trang. Luôn tôn trọng `prefers-reduced-motion` (đã tắt toàn cục trong `globals.css`).

## 7. Màn hình luyện nói (áp dụng từ giai đoạn 2)

Nút ghi âm là thứ nổi bật nhất, nằm nửa dưới màn hình, đường kính ≥ 96px. Các trạng thái (đang phát câu hỏi, mời nói, đang nghe, đang xử lý) khác nhau đồng thời ở biểu tượng, chữ và chuyển động, không chỉ ở màu.

## 8. Không làm

- Không dùng emoji thay icon (dùng lucide).
- Không hiển thị số liệu giả để trang trông đầy đủ. Chưa có dữ liệu thì hiện trạng thái bắt đầu.
- Không tạo trang hoặc mục menu trống cho tính năng chưa có.
