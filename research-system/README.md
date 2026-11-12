# Hệ thống dữ liệu nghiên cứu LINGUA-REFLEX

Thư mục này chứa mọi thứ để thu thập và quản lý dữ liệu nghiên cứu (STEMPETITION 2027, Challenge 3).
Tài liệu gốc: `files/2026-10-23-lingua-reflex-quy-trinh-nghien-cuu.md.docx` (gọi tắt "Quy trình").

| Thư mục / file | Dùng để làm gì |
| --- | --- |
| [google-apps-script/](google-apps-script/) | Mã tự tạo các Google Forms, Google Sheets, bảng chấm mù |
| [HUONG-DAN.md](HUONG-DAN.md) | Hướng dẫn từng bước bằng tiếng Việt (tạo form, kết nối, dùng trang thống kê, xuất dữ liệu, sao lưu) |
| [noi-dung-can-duyet.md](noi-dung-can-duyet.md) | Những nội dung AI soạn, nhóm và cô Vân cần đọc lại trước khi phát |

---

## Phase 1: Kết quả kiểm tra dự án (10/11/2026)

### Công nghệ
- Next.js 16 + TypeScript + Tailwind v4, chạy trên Vercel (đẩy lên nhánh `main` là web tự cập nhật).
- Supabase: đăng nhập, cơ sở dữ liệu (có RLS: mỗi người chỉ đọc được dữ liệu của mình), kho file ghi âm riêng tư.
- Học sinh nghiên cứu đăng nhập bằng **mã (VD: FBG20124) + PIN**, không lưu họ tên. Giáo viên đăng nhập bằng email.

### Những gì ĐÃ CÓ (chạy thật, đã kiểm thử trước đây)
| Phần | Ở đâu | Ghi chú |
| --- | --- | --- |
| Danh sách người tham gia (mã, khối, thứ tự đề AB/BA, nhóm A/B, thử đề) | bảng `research_participants` (migration 0006) | Nhóm A/B không hiện cho giáo viên |
| Bài kiểm tra nói 15 câu + 2 câu mẫu, đề A/B | trang `/student/test`, bảng `test_items`, `test_attempts`, `test_responses` | Đúng quy trình: bíp → tối đa 10 s bắt đầu, 20 s cả câu, không đồng hồ đếm ngược, ghi âm từng câu |
| Đo thời gian phản xạ (RL) tự động | `src/lib/research/latency.ts` | Bỏ qua uh/um/er/ah/hmm; không trả lời → 10 s |
| Đề kiểm tra tách khỏi ngân hàng câu luyện | `content/tests/grade-8.json` | Đã kiểm tra lại 10/11: 32 câu đề, **0 câu trùng** với 157 file nội dung luyện |
| Chế độ luyện A (LINGUA-REFLEX) và B (đọc to SGK) | bảng `mode_sessions`, `mode_turns` (migration 0008) | Mỗi lượt nói ghi đủ trường mục 3.8 |
| Câu hỏi hằng tuần "Tuần này em có luyện nói thêm ở đâu không?" | bảng `weekly_checkins` | Chỉ có 1 câu |
| Xuất CSV cho người giữ dữ liệu | `npm run research:export` | Chạy trên máy, có tuỳ chọn có/không cột nhóm A/B |

### Những gì CHƯA CÓ
| Phần thiếu | Vì sao cần |
| --- | --- |
| Các Google Forms (khảo sát CH1, FLCAS, mini-test, khảo sát hằng tuần đầy đủ, phiếu cảm nhận, phỏng vấn) | Quy trình mục 3.2–3.4, 3.9, 3.10 |
| Chỗ lưu điểm chấm 0–1–2 (Accuracy and Completeness) | Hiện chỉ có RL; điểm chấm mù làm tay, chưa có nơi lưu |
| Quy trình chấm mù (đổi tên file, 2 người chấm, kappa) | Mục 3.6 |
| Tài khoản "nhóm nghiên cứu" | Hiện chỉ có vai trò học sinh / giáo viên |
| Trang thống kê nghiên cứu | Chưa có, chỉ có xuất CSV bằng lệnh |
| Ghi nhận phiếu đồng ý và rút khỏi nghiên cứu | Quy trình mục 3.1 làm trên giấy, web chưa ghi |

### Rủi ro cho tính trung thực của nghiên cứu (phát hiện khi kiểm tra)
1. **Chấm mù.** Quy trình mục 2.3 và 3.6: chỉ Lâm và người xây web biết ai thuộc nhóm A/B; Duy và Hiệu chấm bài nên không được biết.
   Trang thống kê có so sánh A/B sẽ làm lộ danh sách. **Cách xử lý (nhóm đã chọn):** hai mức quyền, xem mục "Quyền" bên dưới.
   Chú ý: số buổi luyện từng học sinh theo loại hoạt động ("đọc to" hay "Speed Q&A") cũng làm lộ nhóm, nên mức "xem mù" chỉ thấy tổng.
2. **Lịch đã trễ.** Theo nhóm trả lời ngày 10/11: chưa làm khảo sát CH1, kiểm tra đầu vào, FLCAS, mini-test, chưa chia nhóm.
   Lịch trong Quy trình (đầu vào 02–04/11, luyện từ 09/11) cần được nhóm và cô Vân **dời lại**. Mình KHÔNG tự đổi số buổi (15), thời lượng (10–15 phút) hay cách đo.
   Phần 13 của Quy trình có sẵn phương án: lùi lịch, nếu không đủ thời gian thì rút còn 12 buổi và ghi rõ trong báo cáo. Đây là quyết định của nhóm.
3. **Chỉ có 1 câu hỏi hằng tuần trên web.** Form 5 hỏi đủ các yếu tố gây nhiễu. Câu trên web vẫn giữ nguyên (không sửa phần đo của nghiên cứu).

---

## Kế hoạch triển khai

| Phase | Nội dung | Trạng thái |
| --- | --- | --- |
| 1. Kiểm tra | Bảng trên | Xong |
| 2. Form nghiên cứu | Apps Script tạo Form 1, 2, 3, 5, 6, 7, 8, 9 + bảng chấm mù (Form 4) | Có mã + test; chưa chạy trên Google thật |
| 3. Đường dữ liệu | Migration 0015 (quyền nghiên cứu, điểm chấm, phiếu đồng ý), script chấm mù + nhập điểm, kết nối Google Sheets qua Apps Script | Có mã; chờ chạy 0015 và cấu hình |
| 4. Trang thống kê | `/research`: Tổng quan, Nói, Lo âu, Luyện tập, Khảo sát, Dữ liệu (lọc, CSV), Chất lượng dữ liệu | Có mã; xem bằng dữ liệu mẫu, chưa có dữ liệu thật |
| 5. Kiểm thử | Test tự động cho form (FLCAS trước = sau, mini-test 20 câu, không trùng ngân hàng luyện), tính điểm, xem mù không lộ nhóm | `tests/research-forms.test.ts`, `tests/research-dashboard.test.ts` |
| 6. Hướng dẫn | HUONG-DAN.md | Xong |

### Quyền (hai mức)
| Mức | Ai | Thấy gì |
| --- | --- | --- |
| `blind` (xem mù) | Duy, Hiệu, Nam Anh, cô Vân | Số liệu chung của cả mẫu, dữ liệu theo mã học sinh **không có cột nhóm**, chất lượng dữ liệu |
| `key` (giữ danh sách) | Lâm (+ người xây web nếu nhóm cho phép) | Thêm so sánh nhóm A/B và cột nhóm trong CSV |

Sau khi chấm mù xong, người giữ danh sách bật `unblinded` thì mọi người mức `blind` mới thấy so sánh A/B.

### Luồng dữ liệu
```
Google Forms ──► Google Sheets ──► Apps Script (web app, có mã bí mật) ──► máy chủ LINGUA-REFLEX ──► /research
Web LINGUA-REFLEX ──► Supabase (kiểm tra nói, luyện tập) ─────────────────────────────────────────┘
File ghi âm ──► research:blind (đổi tên R0001…) ──► 2 người chấm (Google Sheet) ──► research:import-scores ──► Supabase
```
Mã bí mật và khóa Supabase chỉ nằm trên máy chủ (biến môi trường), không bao giờ ở trình duyệt.
Mọi bảng chỉ có **mã học sinh**, không có họ tên, email hay số điện thoại.
