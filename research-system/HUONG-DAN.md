# Hướng dẫn hệ thống dữ liệu nghiên cứu

Viết cho nhóm The Linguines. Làm lần lượt từ bước 1. Mỗi bước ghi rõ **ai làm** và **làm ở đâu**.
Chữ `như thế này` là thứ cần gõ hoặc bấm đúng y nguyên.

## Trạng thái (cập nhật 10/11/2026)

| Phần | Trạng thái |
| --- | --- |
| Mã Apps Script tạo 8 form + bảng chấm mù | **Có mã, đã test tự động** (dựng form trong "Google giả"). **Chưa chạy trên tài khoản Google thật**: nhóm làm bước 2. |
| Nội dung FLCAS, mini-test, các phiếu | **AI soạn, chưa ai duyệt**: xem [noi-dung-can-duyet.md](noi-dung-can-duyet.md) |
| Bài kiểm tra nói trên web (Form 4) | **Chạy thật** từ 29/10 (đã test trên Supabase thật) |
| Migration 0015 (quyền nghiên cứu, điểm chấm, phiếu đồng ý) | **Chưa chạy**: nhóm làm bước 1 |
| Trang thống kê `/research` + tải CSV | **Có mã, đã test phần tính toán** (9 test) và xem giao diện bằng dữ liệu mẫu. **Chưa chạy với dữ liệu thật** (cần bước 1, 3) |
| Script chấm mù, nhập điểm, phiếu đồng ý, cấp quyền | **Có mã, chưa chạy với dữ liệu thật** |
| Kết nối Google Sheets → trang thống kê | **Cần cấu hình ngoài**: bước 4 |

> **Lịch đã trễ.** Theo Quy trình, đầu vào là 02–04/11 và luyện từ 09/11, nhưng ngày 10/11 nhóm chưa làm các bước này.
> Nhóm và cô Vân cần chốt lịch mới. Không đổi số buổi (15), thời lượng (10–15 phút) hay cách đo. Nếu thiếu thời gian, Quy trình
> Phần 13 cho phép rút còn 12 buổi, và phải ghi rõ trong báo cáo.

---

## Bước 1. Chạy migration 0015 (người xây web, 2 phút)

Migration này chỉ **thêm** 3 bảng mới. Nó không sửa và không xóa dữ liệu nào.

1. Mở supabase.com → dự án LINGUA-REFLEX → **SQL Editor** → **New query**.
2. Mở file `supabase/migrations/0015_research_dashboard.sql`, chép toàn bộ, dán vào, bấm **Run**.
3. Thấy "Success" là xong. Chạy lại lần nữa cũng không sao.

## Bước 2. Tạo Google Forms bằng Apps Script (người giữ tài khoản Google của nhóm, 15 phút)

Dùng **một** tài khoản Google của nhóm (không dùng tài khoản cá nhân của học sinh). Mọi form và bảng tính sẽ nằm trong Drive của tài khoản này.

1. Vào **script.google.com** → **Dự án mới**. Bấm "Dự án không có tiêu đề", đặt tên `LINGUA-REFLEX nghiên cứu`.
2. Bấm biểu tượng **bánh răng** (Cài đặt dự án) bên trái → tích ô **Hiển thị tệp kê khai "appsscript.json" trong trình chỉnh sửa**.
3. Quay lại **Trình chỉnh sửa** (biểu tượng `< >`). Mở `appsscript.json`, xóa hết, dán nội dung file
   `research-system/google-apps-script/appsscript.json`. Bấm 💾 lưu.
4. Đổi tên `Mã.gs` (hoặc `Code.gs`) thành `Main`: bấm dấu ⋮ cạnh tên file → Đổi tên. Xóa hết nội dung, dán `Main.gs`.
5. Bấm **+** → **Tập lệnh**, tạo thêm 3 file và dán đúng nội dung:
   `FormFlcas` ← `FormFlcas.gs`, `Forms` ← `Forms.gs`, `BangChamMu` ← `BangChamMu.gs`. Lưu.
6. Ở thanh trên, chọn hàm **`taoTatCa`** → bấm **Chạy**.
7. **Cấp quyền** (chỉ lần đầu):
   - Hiện "Cần được cấp quyền" → **Xem xét quyền** → chọn tài khoản của nhóm.
   - Hiện "Google chưa xác minh ứng dụng này" → bấm **Nâng cao** → **Đi tới LINGUA-REFLEX nghiên cứu (không an toàn)** → **Cho phép**.
   - Vì sao an toàn: đây là mã của chính nhóm, chạy trong tài khoản của nhóm. Mã chỉ tạo form, bảng tính và thư mục, không gửi dữ liệu đi đâu.
     Google cảnh báo vì ứng dụng chưa đăng ký với Google.
8. Đợi 1–2 phút. Xem **Nhật ký thực thi** ở dưới: mỗi form có dòng `F1 → đã tạo mới`…
9. Mở **Google Drive** → thư mục **LINGUA-REFLEX – Dữ liệu nghiên cứu** → file **LINGUA-REFLEX – Danh sách form nghiên cứu**.
   File này có link của từng form: cột "Link gửi người trả lời" để gửi học sinh, "Link sửa form" chỉ nhóm dùng.
10. Chạy hàm **`taoBangChamMu`** một lần để tạo bảng chấm 0–1–2 (dùng ở bước 7).

**Chạy lại có tạo trùng không?** Không. Form nào đã tạo thì `taoTatCa` bỏ qua.
**Muốn sửa nội dung một form** (VD sau khi cô Vân góp ý): sửa trong file `.gs`, rồi chạy `dungLaiForm('F3')`.
Lệnh này **chỉ chạy khi form chưa có câu trả lời nào**: form đã có dữ liệu thì không bao giờ bị sửa.

### Kiểm tra từng form trước khi gửi (bắt buộc)
- Bấm "Link sửa form", xem trước (biểu tượng 👁), làm thử một lượt, rồi **xóa câu trả lời thử** (thẻ Câu trả lời → ⋮ → Xóa tất cả câu trả lời).
- **F3 mini-test**: Cài đặt → Bài kiểm tra → **Công bố điểm: Sau khi xem xét thủ công**, và tắt "Câu trả lời đúng", để học sinh không truyền đáp án cho nhau.
- Mọi form: Cài đặt → Câu trả lời → **Thu thập địa chỉ email: Không thu thập**.
- **Bảng tính câu trả lời**: chỉ chia sẻ cho người trong nhóm (Chia sẻ → Quyền truy cập chung: **Bị hạn chế**). Không bao giờ để "Bất kỳ ai có đường liên kết".

### Form nào dùng khi nào

| Form | Khi nào | Ai trả lời |
| --- | --- | --- |
| F1 Khảo sát thực trạng (CH1) | Trước thực nghiệm | Học sinh lớp 6–12, ẩn danh (nhờ GVCN gửi link) |
| F2 FLCAS lần 1 | Buổi kiểm tra đầu vào | Học sinh lớp 8 tham gia |
| F3 Mini-test | Buổi kiểm tra đầu vào, chỉ một lần | Học sinh lớp 8 tham gia |
| (Form 4) Kiểm tra nói | Đầu vào và đầu ra, **trên web LINGUA-REFLEX** | Học sinh lớp 8 tham gia |
| F5 Hằng tuần | Mỗi cuối tuần khi đang luyện | Học sinh lớp 8 tham gia |
| F6 FLCAS lần 2 | Buổi kiểm tra đầu ra | Học sinh lớp 8 tham gia |
| F7 Cảm nhận | Sau buổi kiểm tra đầu ra | Học sinh lớp 8 tham gia (chế độ A, B mỗi nhánh một bộ câu) |
| F8 Phỏng vấn giáo viên | Khoảng 3 giáo viên, 15 phút | Lâm điền |
| F9 Phỏng vấn học sinh | 6 học sinh chế độ A, sau thực nghiệm | Lâm điền |

Vì sao Form 4 không phải Google Form: Google Forms không ghi âm và không phát tiếng bíp đúng lúc được.
Bài kiểm tra trên web đã làm đúng quy trình đã thống nhất: cùng một giọng đọc, bíp ngay khi câu hỏi kết thúc, tối đa 10 giây để bắt đầu và 20 giây cả câu, không hiện đồng hồ, đo RL từ lúc hết bíp tới từ có nghĩa đầu tiên.

## Bước 3. Cấp quyền xem trang thống kê (người giữ danh sách, trên máy có `.env.local`)

Mỗi người cần một **tài khoản email** trên web LINGUA-REFLEX (đăng ký như giáo viên). Sau đó:

```
npm run research:staff -- add lam@example.com key "Lâm"
npm run research:staff -- add duy@example.com blind "Người chấm 1"
npm run research:staff -- add hieu@example.com blind "Người chấm 2"
npm run research:staff                       # xem danh sách
npm run research:staff -- remove ten@example.com
```

- `key` (giữ danh sách): thấy nhóm A/B. **Chỉ Lâm** (và người xây web nếu nhóm cho phép).
- `blind` (xem mù): không thấy nhóm A/B ở bất kỳ đâu, kể cả file CSV. **Duy và Hiệu chấm bài nên chỉ được mức này** (Quy trình mục 2.3, 3.6).
- Chấm mù xong: `npm run research:settings -- unblinded true` thì mọi người mới thấy so sánh A/B.

## Bước 4. Nối Google Sheets với trang thống kê (người giữ tài khoản Google + người xây web, 10 phút)

1. Trong Apps Script, chọn hàm **`taoMaBiMat`** → **Chạy**. Nhật ký in ra một mã dài. Chép mã này.
   **Không** gửi mã vào nhóm chat. Chỉ dán ở bước 3 dưới đây.
2. Bấm **Triển khai** → **Tùy chọn triển khai mới** → bánh răng → **Ứng dụng web**:
   - Thực thi với tư cách: **Tôi**
   - Người có quyền truy cập: **Bất kỳ ai**
   - Bấm **Triển khai**, chép **URL ứng dụng web** (kết thúc bằng `/exec`).
   - "Bất kỳ ai" vẫn an toàn: thiếu mã bí mật đúng thì cổng không trả gì. Mã chỉ nằm trên máy chủ, trình duyệt không bao giờ thấy.
     Cổng không trả câu trả lời phỏng vấn (F8, F9).
3. Vercel → dự án → **Settings** → **Environment Variables**, thêm 2 biến (cả Production và Preview):
   `RESEARCH_SHEETS_URL` = URL vừa chép, `RESEARCH_SHEETS_SECRET` = mã bí mật. Rồi **Deployments** → **Redeploy**.
   Trên máy: thêm 2 dòng y hệt vào `.env.local`, rồi chạy `npm run research:check-sheets` để kiểm tra.
4. **Mỗi lần sửa mã Apps Script** phải triển khai lại: Triển khai → Quản lý các bản triển khai → ✏️ → Phiên bản: **Phiên bản mới** → Triển khai.

## Bước 5. Dùng trang thống kê

Đăng nhập bằng tài khoản email đã cấp quyền → mở **`/research`** (VD `https://linguinesre.vercel.app/research`).

| Phần | Có gì |
| --- | --- |
| Tổng quan | Số học sinh, số nhóm A/B (chỉ mức key), bài kiểm tra đã xong, buổi luyện, tỷ lệ hoàn thành, trạng thái kết nối form |
| Nói | RL trước và sau (TB ± SD, trung vị), ĐTB 0–2, ACC, tiến độ chấm và Cohen's kappa, mini-test và tỷ lệ "giỏi trên giấy nhưng nói chậm" |
| Lo âu | FLCAS câu về Nói và cả thang, trước và sau; Cronbach's alpha |
| Luyện tập | Số học sinh hoàn thành từng buổi; đường RL qua 15 buổi của chế độ A (chỉ mức key); khảo sát hằng tuần và lỗi kỹ thuật |
| Khảo sát | CH1: % đồng ý từng câu theo khối; phiếu cảm nhận (chỉ mức key) |
| Dữ liệu | Bảng theo mã học sinh, lọc thời gian và nhóm, **tải CSV** |
| Chất lượng dữ liệu | Ai thiếu bài, thiếu phiếu, nộp trùng, mã sai, câu chưa đo RL, điểm lệch, vấn đề kỹ thuật |

Trang chỉ **mô tả** số liệu. Phép kiểm định chính (ANCOVA) làm trên Colab/JASP theo kế hoạch phân tích đã khóa (Quy trình Phần 4).
Trang không có nút xóa hay loại dữ liệu. Ai nộp form hai lần thì trang dùng **lần nộp đầu tiên** và báo ở mục Chất lượng dữ liệu.

## Bước 6. Phiếu đồng ý và rút khỏi nghiên cứu (Nam Anh + Lâm)

Phiếu đồng ý vẫn ký trên giấy (Quy trình mục 3.1). Muốn trang thống kê biết ai đã có phiếu, tạo file `files/research/dong-y.csv`:

```
code,phu_huynh,hoc_sinh,rut_lui,du_lieu,ghi_chu
FBG20124,2026-11-12,2026-11-12,,,
FBG20135,2026-11-12,2026-11-13,2026-11-25,giu,
```

Rồi chạy `npm run research:consent -- files/research/dong-y.csv`.

- Học sinh rút lui vẫn nằm trong bảng, có đánh dấu. Rút lui **không ảnh hưởng điểm số ở trường**.
- `du_lieu = xoa`: script **không tự xóa**. Nó chỉ in danh sách để nhóm, cô Vân và người xây web xác nhận rồi mới xóa bằng tay.

## Bước 7. Chấm mù 0–1–2 (tháng 12, sau bài đầu ra)

1. **Lâm** chạy `npm run research:blind`. Lệnh này:
   - trộn bài đầu vào và đầu ra, đổi tên file thành R0001…;
   - tạo `nguoi-cham-1.csv` và `nguoi-cham-2.csv` (20% file có trong cả hai danh sách để tính kappa);
   - tạo `BI-MAT-bang-doi-chieu.csv`. **File này chỉ Lâm giữ.**
2. Lâm dán cột `ma_file` vào trang "Người chấm 1" / "Người chấm 2" của bảng chấm mù (bước 2.10). Chia sẻ mỗi trang cho đúng người chấm, kèm thư mục `am-thanh`.
3. Duy và Hiệu nghe, nhập điểm 0/1/2 theo bảng chấm (trang Hướng dẫn trong bảng tính). Mỗi người làm độc lập.
4. Lâm tải từng trang về dạng CSV (Tệp → Tải xuống → .csv) rồi chạy:
   ```
   npm run research:import-scores -- --key <BI-MAT-bang-doi-chieu.csv> --rater 1 --file <trang người chấm 1.csv> --dry-run
   npm run research:import-scores -- --key <BI-MAT-bang-doi-chieu.csv> --rater 1 --file <trang người chấm 1.csv>
   npm run research:import-scores -- --key <BI-MAT-bang-doi-chieu.csv> --rater 2 --file <trang người chấm 2.csv>
   ```
   Lệnh in ra Cohen's kappa:
   - **Kappa ≥ 0,6:** đạt.
   - **Kappa < 0,6:** hai người chấm ngồi cùng cô Vân thống nhất lại bảng chấm, rồi chấm lại bộ 20%.
5. Những câu hai người chấm lệch nhau thì bàn và thống nhất. Ghi điểm thống nhất vào một file CSV rồi nhập bằng `--rater 0`.

## Bước 8. Xuất dữ liệu cho báo cáo

- Trên trang `/research`, phần **Dữ liệu** có 2 nút tải CSV:
  - mỗi học sinh một dòng (đúng mẫu Quy trình mục 4.1);
  - từng câu kiểm tra nói.
- Trên máy, nếu cần thêm dữ liệu luyện từng lượt và file ghi âm: `npm run research:export -- --practice` (thêm `--audio` để tải ghi âm).
- File có cột nhóm A/B (`...-co-nhom-...csv`): **không gửi cho người chấm mù**.

## Bước 9. Sao lưu (mỗi thứ Sáu, Hiệu)

1. Mỗi bảng tính câu trả lời: Tệp → Tải xuống → **Microsoft Excel (.xlsx)**.
2. `npm run research:export -- --practice` (file vào `files/research/`, thư mục này không đưa lên GitHub).
3. Cất cả hai vào một thư mục riêng tư của nhóm (Drive "Bị hạn chế"), đặt tên theo ngày.
4. Ghi vào nhật ký nghiên cứu: ngày sao lưu, ai làm.

## Quyền riêng tư và lưu trữ

- **Dùng mã học sinh FPT Bắc Giang** (VD: FBG20124). Học sinh chưa có mã thì ghi họ và tên trong form: các dòng này nằm trong Google Sheets (chỉ nhóm xem), người giữ danh sách đổi họ tên thành mã rồi mới phân tích. Trang thống kê và file CSV không hiện họ tên. Không có email hay số điện thoại. Khảo sát CH1 hoàn toàn ẩn danh.
- **Ai được xem:**
  - Dữ liệu: chỉ nhóm nghiên cứu và cô Vân.
  - Danh sách nhóm A/B: chỉ Lâm (mức key).
  - File ghi âm: chỉ nhóm nghiên cứu và cô Vân, không bao giờ công khai.
- **Khóa bí mật** (Supabase service role, mã bí mật Apps Script) chỉ nằm trên máy chủ và `.env.local`, không đưa lên GitHub, không gửi qua chat.
- **Xóa:** file ghi âm xóa sau **30/06/2027** (theo phiếu đồng ý, Quy trình mục 3.1). Dữ liệu dạng số đã ẩn danh giữ để làm minh chứng cho báo cáo.
- Tham gia, không tham gia hay rút lui đều **không ảnh hưởng điểm số**.

## Khi có lỗi

| Hiện tượng | Cách xử lý |
| --- | --- |
| Mở `/research` bị chuyển về trang chủ | Tài khoản chưa được cấp quyền (bước 3), hoặc chưa chạy migration 0015 (bước 1) |
| "Chưa kết nối" ở phần Google Forms | Thiếu 2 biến môi trường trên Vercel, hoặc chưa Redeploy (bước 4) |
| "Mã bí mật không khớp" | Mã trên Vercel khác mã trong Apps Script. Chạy lại bước 4.1 rồi dán lại, Redeploy |
| "Chưa tạo form" | Chưa chạy `taoTatCa`, hoặc form đã bị xóa khỏi Drive |
| Sửa mã Apps Script mà trang không đổi | Chưa triển khai phiên bản mới (bước 4.4) |
| `taoTatCa` báo lỗi một form | Đọc dòng LỖI trong nhật ký, sửa, chạy lại (form đã tạo được bỏ qua) |
| "câu kiểm tra chưa đo được RL" | `npm run research:rescore` |
| Học sinh gõ tên thay vì mã trong form | Sửa ô mã trong Google Sheets cho đúng (KHÔNG xóa dòng), ghi vào nhật ký |
| Một học sinh nộp form hai lần | Trang dùng lần nộp đầu tiên; ghi lý do vào nhật ký, không xóa dòng |
