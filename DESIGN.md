# DESIGN.md: LINGUA-REFLEX

Quy tắc thiết kế giao diện. Mọi trang và thành phần mới phải theo file này. Token màu nằm trong `src/app/globals.css`.

## 1. Cảm giác chung

Dịu, rõ ràng, khuyến khích. Học sinh THCS dùng chủ yếu trên điện thoại và sẽ nói vào micro. Không áp lực điểm số, không bảng xếp hạng, không hiệu ứng chỉ để trông "hiện đại".

## 2. Công nghệ

Tailwind CSS v4 với token trong `globals.css`. Phông Be Vietnam Pro (qua `next/font`, có bộ dấu tiếng Việt). Icon: `lucide-react`. Chuyển động bằng CSS thuần (`rise-in`), không thêm thư viện hoạt ảnh. Chưa có chế độ tối.

## 3. Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `bg` | `#FAF6EC` | Nền trang (kem) |
| `surface` | `#FFFFFF` | Thẻ, ô nhập |
| `sunken` | `#F1EBDB` | Khối nhấn nhẹ trên nền kem |
| `ink` | `#1B2B22` | Chữ chính |
| `muted` | `#4F6256` | Chữ phụ (≥ 5.9:1 trên `bg`) |
| `line` | `#DDD5BF` | Viền |
| `brand` | `#1F7A4D` | Nút chính, liên kết. Chữ trắng trên nền này đạt 5.3:1 |
| `brand-strong` | `#17603B` | Hover, bóng đáy nút chính, chữ nhấn trên `brand-soft` |
| `brand-soft` | `#E3F1E8` | Nền nhãn, gợi ý |
| `forest` / `on-forest` | `#123D2B` / `#F3EEDC` | Mảng xanh rừng đậm: khung đăng nhập, khối "Hôm nay". Chữ phụ `on-forest-muted` `#B9CDBF` (7.2:1) |
| `warn` / `warn-soft` | `#7A4E00` / `#FFF1D6` | Cảnh báo nhẹ, "dữ liệu còn ít" |
| `danger` / `danger-soft` | `#B3261E` / `#FDECEA` | Lỗi |

Quy tắc:
- Một màu nhấn duy nhất là xanh lá `brand`. Không thêm màu nhấn thứ hai.
- Không dùng `brand` làm chữ nhỏ trên `bg` nếu chưa kiểm tương phản; dùng `brand-strong`.
- **Không bao giờ chỉ dùng màu để báo trạng thái.** Luôn kèm biểu tượng và chữ.

## 4. Chữ

Chữ thân tối thiểu 16px. Tiêu đề đậm (800). Câu hỏi tiếng Anh trên màn hình luyện nói là phần chữ lớn nhất, gắn `lang="en"`. Chữ tiếng Việt luôn đủ dấu.

## 5. Thành phần

- Nút chính: bo tròn hoàn toàn, nền `brand`, chữ trắng, đậm, cao ≥ 48px, bóng đáy 0 3px 0 `brand-strong` (xem `ButtonLink`).
- Thẻ: `rounded-3xl`, nền `surface` hoặc `bg`, viền `line`.
- Vùng chạm tối thiểu 44×44px. Focus nhìn thấy rõ (viền 3px màu `ink`, đã đặt toàn cục).
- Ô nhập: cao ≥ 52px, chữ ≥ 16px (tránh iPhone tự phóng to), luôn có `<label>`.
- Biểu mẫu: lỗi hiện cạnh trường, dễ hiểu, có `role="alert"`; nút có trạng thái đang xử lý.
- Thao tác không hoàn tác được (xóa lớp, xóa dữ liệu) luôn có bước xác nhận.

## 5b. Họa tiết sóng âm và bố cục

- Họa tiết nhận diện duy nhất là **sóng âm** (`Waveform`), trồi lên đúng một lần lúc vào trang. Chỉ dùng ở khung đăng nhập/đăng ký và khối "Hôm nay" của học sinh; không rải khắp nơi.
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
