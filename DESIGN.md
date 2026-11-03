# DESIGN.md: LINGUA-REFLEX

Quy tắc thiết kế giao diện. Mọi trang và thành phần mới phải theo file này. Token màu và hiệu ứng nằm trong `src/app/globals.css`. Thành phần dùng chung nằm trong `src/components/ui.tsx`.

## 1. Cảm giác chung

Lấy tinh thần thiết kế sản phẩm của Google (tham khảo chromeos.google), không sao chép giao diện của Google. Mục tiêu:
- Thân thiện nhưng không trẻ con; chuyên nghiệp nhưng không khô cứng.
- Nhiều màu nhưng không rối; tối giản nhưng không trống trải.
- Không linh vật, không hiệu ứng chỉ để trang trí.

Đặc trưng:
- Tiêu đề lớn, tự tin.
- Khoảng trắng rộng, thẻ bo tròn lớn.
- Màu Google dùng có chủ đích.
- Ảnh giao diện sản phẩm (minh họa) thay cho đoạn văn dài.

Học sinh lớp 6–12 dùng chủ yếu trên điện thoại và nói vào micro.

**Không** XP, tim, bảng xếp hạng, chuỗi ngày, điểm tổng. Dùng gợi ý không bị trừ gì.

## 2. Trang nghiên cứu giữ giao diện cũ

Các trang sau được bọc trong `<div className="theme-classic">`:
- bài kiểm tra (`/student/test`);
- chế độ A/B (`/student/luyen/…`);
- trang chờ của người tham gia (nhánh `ModeHome`/`ResearchHome` trong `/student`).

Lớp này đặt lại đúng token cũ (Stripe/Linear, Inter, tím xanh), để hai lần kiểm tra và hai chế độ trông giống hệt nhau suốt nghiên cứu.

- **Không sửa** khối `.theme-classic` trong `globals.css`, và không bỏ lớp bọc, cho tới khi nghiên cứu kết thúc (`study_over`).
- Thành phần dùng chung với trang nghiên cứu (`SubmitButton`, `ButtonLink`, `AppShell`, `Logo`, `FeedbackPanel`) chỉ được đổi kiểu bằng biến thể `app:` (chỉ có tác dụng ngoài `.theme-classic`) hoặc bằng token.
- Kiểm tra: `/dev-preview/research-wait`, `/dev-preview/mode-home`, `/dev-preview/test-runner` phải giống từng điểm ảnh so với trước khi sửa.

## 3. Chữ

**Google Sans** (Google Fonts, giấy phép mở, có dấu tiếng Việt), qua `next/font`. Độ đậm: tiêu đề 600, nhãn và nút 500, thân 400. Khoảng cách chữ tiêu đề −0.02em.

| Vai trò | Cỡ (điện thoại → máy tính) |
|---|---|
| Tiêu đề trang chủ | 48 → 72px |
| Tiêu đề trang | 36 → 48px (trang module 48 → 60px) |
| Tiêu đề phần | 24 → 28px; trên trang chủ 36 → 60px |
| Câu hỏi tiếng Anh khi luyện nói | 30 → 36px, luôn là chữ lớn nhất màn hình, gắn `lang="en"` |
| Thân | 16–18px; chữ phụ 14px |

Chữ tiếng Việt luôn đủ dấu. Không viết hoa toàn bộ, trừ nhãn nhỏ phía trên tiêu đề (`Eyebrow`).

## 4. Màu

Màu có nghĩa cố định, không rải mọi màu vào mọi thành phần.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `bg` / `surface` | `#FFFFFF` | Nền trang, thẻ |
| `tint` | `#F8FAFD` | Dải nội dung, khung xem trước, ô số liệu |
| `sunken` | `#F1F3F4` | Nền phụ trung tính, thanh tiến độ trống |
| `ink` / `muted` | `#202124` / `#5F6368` | Chữ chính (16:1) / chữ phụ (6.0:1) |
| `line` / `line-strong` | `#DADCE0` / `#80868B` | Viền thẻ / viền ô nhập và nút viền (3.7:1) |
| `brand` | `#1A73E8` | **Xanh dương: thao tác.** Nút chính, liên kết, mục đang chọn. Chữ trắng 4.5:1 |
| `brand-strong` / `brand-soft` / `brand-tonal` | `#185ABC` / `#E8F0FE` / `#D2E3FC` | Hover; nền nút phụ dạng tông màu; viên thuốc nhấn trong tiêu đề |
| `success` (+`-strong`, `-soft`) | `#188038` | **Xanh lá: đúng, đạt, tiến độ.** Thanh tiến độ, "Em làm tốt", "Đạt" |
| `gold` (+`-soft`) | `#F9AB00` | **Vàng: chú ý, điểm nhấn.** Vòng đếm ngược Speed Q&A, nhãn "Từ mới", "Nên luyện tiếp". Chữ trên nền vàng dùng `ink` |
| `warn` / `warn-soft` | `#8A4A00` / `#FEF7E0` | "Chưa đạt", "chưa đúng" (vàng nhẹ, không đỏ: không phạt) |
| `danger` / `danger-soft` / `danger-bright` | `#C5221F` / `#FCE8E6` / `#EA4335` | **Đỏ: lỗi, cảnh báo, đang ghi âm** |

Quy tắc:
- Chữ thường phải đạt ≥ 4.5:1.
- **Không bao giờ chỉ dùng màu để báo trạng thái.** Luôn kèm chữ, và biểu tượng nếu là trạng thái.
- Năm giai đoạn của module mỗi giai đoạn một màu: xanh dương, xanh lá, vàng, đỏ, xanh dương.

## 5. Thành phần

- **Nút chính**: viên thuốc (`rounded-full`), nền `brand`, chữ trắng 500, cao ≥ 48px, lún nhẹ khi bấm (`press`). Rê chuột thì nổi nhẹ (`shadow-card`).
- **Nút phụ dạng tông màu**: nền `brand-soft`, chữ `brand-strong` (`ButtonLink variant="tonal"`).
- **Nút viền**: viền `line`, chữ `brand` (`variant="secondary"`).
- **Chọn một trong hai** (đăng nhập bằng mã hoặc email): viên thuốc viền chia đôi, phần đang chọn nền `brand-tonal` kèm dấu tích.
- **Thẻ**: bo 24–32px (`rounded-3xl`, `rounded-[2rem]`), viền mảnh `line` hoặc nền `tint`. Không lồng thẻ trong thẻ quá một tầng. Bóng chỉ dùng cho phần nổi (thanh menu dưới, khung minh họa).
- **Khối nhấn lớn** (bài hôm nay, ngày tiếp theo): nền `brand-soft`, chữ `ink`, một nút chính duy nhất.
- **Ô nhập**: kiểu Material viền, cao 56px, bo 12px, viền `line-strong`; focus viền `brand` 2px. Luôn có `<label>`.
- **Thành phần trong `ui.tsx`**:
  - `Highlight`: từ khóa trong tiêu đề nằm trong viên thuốc màu, dấu ấn kiểu ChromeOS. Mỗi tiêu đề tối đa một viên.
  - `Chip`: nhãn trạng thái.
  - `Eyebrow`: nhãn nhỏ trên tiêu đề.
  - `Progress`: thanh tiến độ có `role="progressbar"`.
  - `Stat`: ô số liệu thật; khi chưa có dữ liệu thì hiện chữ "Chưa có".
  - `SectionHead`: tiêu đề phần.
- **Menu khi đã đăng nhập**:
  - Màn hình từ 640px: hàng viên thuốc dưới thanh đầu trang; mục đang mở nền `brand-soft`.
  - Điện thoại: thanh dưới cùng kiểu Material 3, biểu tượng nằm trong viên chỉ báo `brand-tonal`, nhãn bên dưới.
  - Mỗi lúc chỉ hiện một menu.
- **Lộ trình module** (`ModulePath`): thanh 5 giai đoạn (đã xong / đang học / chưa mở, kèm số ngày) và dòng thời gian từng ngày.
  - Ngày tiếp theo nổi bật, có mục tiêu, tiêu chí hoàn thành và nút "Bắt đầu".
  - Ngày khác chỉ để xem, luôn có chữ trạng thái.
- **Màn hình bài học**:
  - Đầu màn hình: nút X, thanh tiến độ mảnh màu xanh lá, số bước.
  - Nhãn bước dạng viên thuốc (`p.rounded-full`, bài thử tự động dựa vào thẻ này).
  - Câu hỏi trong khung `tint` chữ lớn; kết quả trồi lên (`sheet-up`).
- **Phản hồi sau một câu**:
  - "Đo trực tiếp" (máy tính bằng quy tắc) và "AI nhận xét" luôn là hai khối riêng.
  - "Em làm tốt" (xanh lá, tối đa 2 ý) và "Nên luyện tiếp" (vàng, 1 ý) tính bằng quy tắc từ số đo thật.
  - Không điểm tổng.
- Vùng chạm tối thiểu 44×44px. Focus: viền 3px `brand`.
- Thao tác không hoàn tác được luôn có bước xác nhận. Xóa tài khoản: gõ chữ `xoa`, nút nền `danger`.

## 6. Màn hình nói (`RecordButton`)

Nút micro tròn 96px, nằm giữa, là thứ nổi bật nhất. Bốn trạng thái khác nhau đồng thời ở biểu tượng, chữ, màu và chuyển động:

| Trạng thái | Hiển thị |
|---|---|
| Chờ | Nút xanh dương có micro (hoặc loa nếu sẽ đọc câu hỏi trước) |
| Đang đọc câu hỏi | Sóng âm nhún nhịp nhàng, chữ "Đang đọc, nghe kỹ nhé" |
| Đang ghi | Nút đỏ có ô vuông dừng, vòng sáng lan ra, sóng âm 24 cột theo âm lượng thật, đồng hồ "Đang ghi 0:03". Speed Q&A thêm vòng đếm ngược vàng quanh nút tới mục tiêu riêng, kèm chữ mục tiêu |
| Đang xử lý | Vòng quay, chữ "Đang nghe lại bản ghi" |

Roleplay: bong bóng hội thoại có ảnh đại diện chữ cái và tên người nói (AI nền vàng, em nền xanh), thanh tiến độ số lượt.

## 7. Chuyển động

Ngắn và êm (đường cong "emphasized" của Material, `cubic-bezier(0.2, 0, 0, 1)`), luôn phục vụ việc học:

| Lớp CSS | Dùng cho |
|---|---|
| `rise-in` | Vào trang |
| `pop-in` | Danh sách, ô số liệu hiện lần lượt |
| `sheet-up` | Kết quả, nhận xét trồi lên |
| `grow-x` | Thanh tiến độ, biểu đồ tự dài ra |
| `listen-ring` | Vòng sáng khi đang ghi |
| `ring-countdown` | Vòng đếm ngược Speed Q&A |
| `wave-live` | Sóng âm minh họa và khi đọc câu hỏi |
| `reveal` | Khối trang chủ hiện khi cuộn tới (chỉ trình duyệt hỗ trợ) |
| `press` | Nút lún nhẹ khi bấm |

`CountUp` đếm số tăng dần cho số liệu thật cuối bài.

Luôn tôn trọng `prefers-reduced-motion`: tắt toàn cục ở cuối `globals.css`; `CountUp` hiện ngay số cuối.

## 8. Không làm

- Không linh vật, không emoji thay icon (dùng lucide). Không chép logo, hình hay giao diện của Google hoặc ứng dụng khác.
- Không kính mờ tràn lan, không dải màu tím xanh kiểu "AI", không nền tối toàn trang.
- Không XP, tim, bảng xếp hạng, chuỗi ngày, điểm tổng.
- Không hiển thị số liệu giả để trang trông đầy đủ. Ảnh giao diện trên trang chủ luôn ghi "minh họa". Chưa có dữ liệu thì hiện trạng thái bắt đầu.
- Không tạo trang, nút hoặc mục menu không làm gì.
