# DESIGN.md: LINGUA-REFLEX

Quy tắc thiết kế giao diện. Mọi trang và thành phần mới phải theo file này. Token màu và hiệu ứng nằm trong `src/app/globals.css`.

## 1. Cảm giác chung

Vui, sáng, bo tròn, nút "dày" bấm được (lấy hình thức từ Duolingo, ảnh tham khảo ở `files/tham-khao-duolingo/`). Học sinh lớp 6–12 dùng chủ yếu trên điện thoại và sẽ nói vào micro. **Chỉ lấy hình thức, không lấy cơ chế trò chơi**: không XP, không tim, không bảng xếp hạng, không chuỗi ngày bị mất khi nghỉ, không điểm tổng. Dùng gợi ý không bị trừ gì.

## 2. Trang nghiên cứu giữ giao diện cũ

Bài kiểm tra (`/student/test`), chế độ A/B (`/student/luyen/…`) và trang chờ của người tham gia (nhánh `ModeHome`/`ResearchHome` trong `/student`) được bọc trong `<div className="theme-classic">`. Lớp này đặt lại đúng token cũ (Stripe/Linear, Inter, tím xanh) để hai lần kiểm tra và hai chế độ trông giống hệt nhau suốt nghiên cứu.

- **Không sửa** khối `.theme-classic` trong `globals.css` và không bỏ lớp bọc này cho tới khi nghiên cứu kết thúc (`study_over`).
- Thành phần dùng chung với trang nghiên cứu (`SubmitButton`, `ButtonLink`, `AppShell`, `Logo`, `FeedbackPanel`) chỉ đổi kiểu bằng biến thể `duo:` (chỉ có tác dụng ngoài `.theme-classic`) hoặc bằng token.
- Kiểm tra: `/dev-preview/research-wait`, `/dev-preview/mode-home`, `/dev-preview/test-runner` phải giống từng điểm ảnh so với trước khi sửa.

## 3. Công nghệ

Tailwind CSS v4 với token trong `globals.css`. Phông **Nunito** (qua `next/font`, có bộ dấu tiếng Việt), đậm 700/800 cho tiêu đề và nút. Icon: `lucide-react`. Chuyển động bằng CSS thuần, không thêm thư viện hoạt ảnh. Chưa có chế độ tối.

## 4. Màu

| Token | Giá trị | Dùng cho |
|---|---|---|
| `bg` / `surface` | `#FFFFFF` | Nền trang, thẻ |
| `sunken` | `#F7F7F7` | Ô nhập, khối nhấn nhẹ |
| `ink` | `#3C3C3C` | Chữ chính (11:1) |
| `muted` | `#6F6F6F` | Chữ phụ (5.0:1 trên trắng) |
| `line` / `line-strong` | `#E5E5E5` / `#DADADA` | Viền 2px, đáy 3D của thẻ |
| `brand` | `#3A8500` | Nút chính, liên kết, nút trên lộ trình. Chữ trắng 4.6:1 |
| `brand-strong` | `#2C6600` | Đáy 3D của nút xanh, chữ trên `brand-soft` (6.3:1) |
| `brand-soft` | `#D7FFB8` | Nền "đúng rồi", nhãn |
| `brand-bright` | `#58CC02` | Xanh tươi chỉ để trang trí (thanh tiến độ, linh vật). Không đặt chữ lên |
| `sky` / `sky-strong` / `sky-soft` | `#1899D6` / `#0B6FA6` / `#DDF4FF` | Nút nghe, mục đang chọn, nút phụ (chữ `sky-strong`) |
| `gold` / `gold-soft` | `#FFC800` / `#FFF6D6` | Ô thành tích, giai đoạn 3. Chữ trên `gold` dùng `ink` |
| `berry` / `berry-soft` | `#8A3FD1` / `#F4E8FF` | Nhãn "Từ mới", giai đoạn 4 |
| `forest` | `#2F7A00` | Mảng màu lớn: khối "Hôm nay", băng giai đoạn 1. Chữ trắng 5.4:1 |
| `warn` / `warn-soft` | `#7A4E00` / `#FFF4DC` | "Chưa đúng" (vàng nhẹ, không đỏ), cảnh báo nhẹ |
| `danger` / `danger-soft` | `#C81E1E` / `#FFDFE0` | Lỗi hệ thống, xóa dữ liệu |

Quy tắc:
- Chữ thường phải đạt ≥ 4.5:1. Xanh tươi `#58CC02` của Duolingo chỉ 2.1:1 với chữ trắng nên không dùng làm nền nút.
- "Chưa đúng" dùng `warn` (vàng nhẹ), không dùng đỏ: học sinh không bị phạt.
- **Không bao giờ chỉ dùng màu để báo trạng thái.** Luôn kèm biểu tượng và chữ.

## 5. Thành phần

- **Nút chính**: `btn-3d` + `rounded-2xl` + `bg-brand`, chữ trắng 800, cao ≥ 48px (nút trong bài học 56px, rộng hết màn hình trên điện thoại). Đáy 4px màu đậm hơn; bấm xuống thì nút lún 4px. Đổi màu đáy bằng `[--depth:…]`. Không viết hoa toàn bộ (tiếng Việt có dấu viết hoa khó đọc).
- **Nút phụ / thẻ lựa chọn**: `option-card` (viền 2px, đáy 4px, nền trắng), chữ `sky-strong`. Đang chọn: viền `sky`, nền `sky-soft`, kèm chữ "Đã chọn" hoặc dấu.
- **Thẻ**: `rounded-2xl` + `shadow-card` (vòng 2px + đáy 4px màu `line`).
- **Ô nhập**: cao 52px, nền `sunken`, viền 2px, focus viền `sky`. Chữ ≥ 16px, luôn có `<label>`.
- **Menu khi đã đăng nhập**: từ 640px là hàng tab dưới thanh đầu trang; trên điện thoại là thanh dưới cùng có biểu tượng. Mục đang mở viền `sky` + `aria-current`. Mỗi lúc chỉ hiện một menu.
- **Màn hình bài học**: nút X ở góc, thanh tiến độ dày 16px (`brand-bright`, có vệt sáng), nhãn bước dạng viên thuốc (`p.rounded-full`, bài thử tự động dựa vào thẻ này), kết quả hiện thành bảng trồi lên (`sheet-up`).
- **Lộ trình module** (`ModulePath`): băng tiêu đề mỗi giai đoạn một màu, ngày là nút tròn lượn zigzag. Đã xong: xanh + dấu tích; tiếp theo: nút bấm được + nhãn "Bắt đầu" nảy nhẹ; chưa mở: xám + ổ khóa. Luôn có chữ trạng thái cạnh nút.
- **Linh vật** (`Mascot`): bong bóng lời nói màu xanh có mắt, ba vạch sóng âm trên đầu. Tự vẽ, không dùng hình của Duolingo. Tâm trạng `happy`, `talk`, `think`, `cheer`. Chỉ trang trí (`aria-hidden`), luôn đi kèm chữ. `Bubble` là bong bóng lời nói cạnh linh vật.
- Vùng chạm tối thiểu 44×44px. Focus: viền 3px màu `brand`.
- Thao tác không hoàn tác được (xóa lớp, xóa dữ liệu) luôn có bước xác nhận. Xóa tài khoản: gõ chữ `xoa`, nút nền `danger`.

## 6. Chuyển động

Ý tưởng lấy từ 4 video trong `files/Design Inspiration 1–4` (chỉ lấy chuyển động, không lấy giao diện):

| Lớp CSS / thành phần | Ý tưởng | Dùng ở |
|---|---|---|
| `CountUp` | Số đếm tăng dần (video 1) | Ô số liệu cuối bài học (chỉ số thật) |
| `drift` | Vòng tròn trôi nổi (video 1) | Câu tiếng Anh quanh lời mời cuối trang chủ |
| `word-light` | Chữ sáng dần từng từ (video 2) | Tiêu đề trang chủ |
| `grow-x` | Biểu đồ tự vẽ (video 2) | Cột thời gian bắt đầu nói |
| `sheet-up` | Khối trồi lên chồng lên khối trước (video 2) | Kết quả đúng / chưa đúng trong bài học |
| `md:hover:grow-[…]` | Tầng mở rộng khi chọn (video 3) | Bốn tầng Kim tự tháp trên trang chủ |
| `pop-in` | Công trình "mọc" lên từng phần (video 3) | Nút trên lộ trình, thẻ Unit, ô số liệu |
| `reveal` | Hiện dần khi cuộn tới | Các khối trang chủ (chỉ trình duyệt hỗ trợ `animation-timeline`) |
| `mascot-bob`, `mascot-cheer`, `listen-ring`, `nudge` | | Linh vật, nút micro đang nghe, nhãn "Bắt đầu" |

Luôn tôn trọng `prefers-reduced-motion` (đã tắt toàn cục cuối `globals.css`; `CountUp` hiện ngay số cuối).

## 7. Màn hình luyện nói

Nút ghi âm là thứ nổi bật nhất, nằm nửa dưới màn hình, đường kính ≥ 96px, kiểu 3D. Các trạng thái (đang phát câu hỏi, mời nói, đang nghe, đang xử lý) khác nhau đồng thời ở biểu tượng, chữ và chuyển động, không chỉ ở màu.

## 8. Không làm

- Không dùng emoji thay icon (dùng lucide). Không chép hình linh vật, logo hay phông chữ của Duolingo.
- Không XP, tim, bảng xếp hạng, chuỗi ngày, điểm tổng.
- Không hiển thị số liệu giả để trang trông đầy đủ. Chưa có dữ liệu thì hiện trạng thái bắt đầu.
- Không tạo trang hoặc mục menu trống cho tính năng chưa có.
