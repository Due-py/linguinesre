# LINGUA-REFLEX

Nền tảng luyện nói tiếng Anh có AI cho học sinh lớp 6–12, bám theo sách Global Success. Mục tiêu và nguyên tắc: xem [CLAUDE.md](CLAUDE.md); thiết kế: [DESIGN.md](DESIGN.md).

Công nghệ: Next.js (App Router), React, TypeScript, Tailwind CSS v4, Supabase, Vercel.

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền giá trị thật (chưa cần ở M0)
npm run dev                  # http://localhost:3000
```

Kiểm tra trước khi đẩy code: `npm run lint && npm run typecheck && npm run test && npm run build`.
Kiểm tra giao diện: build + `npx next start -p 3124`, rồi `node scripts/ui-check.mjs / 375` (đo cuộn ngang bằng Edge thật). Trên Git Bash đặt `MSYS_NO_PATHCONV=1` trước lệnh khi truyền đường dẫn bắt đầu bằng `/`.

## Trạng thái

| Mốc | Trạng thái |
|---|---|
| M0 Nền + landing | Xong, đã kiểm tra |
| M1 Đăng nhập, đăng ký, quên mật khẩu, onboarding | **Đã viết, giao diện và kiểm tra biểu mẫu đã thử bằng trình duyệt; chưa thử luồng đăng ký → onboarding với Supabase thật** (cần chạy `0001_core.sql` và tắt "Confirm email") |
| M2 Lớp học, dashboard học sinh/giáo viên | **Đã viết; chưa kiểm chứng quyền trên Supabase thật** (chạy `node scripts/test-rls.mjs` sau khi chạy migration) |
| M3 Nội dung đủ 78 Unit lớp 6–12 (1.170 câu hỏi) | **Đã viết và kiểm tra cấu trúc** (`npm run content:check`, `tests/content.test.ts`). Lớp 8 Unit 1–3 đã nạp vào Supabase; cả 78 Unit **đã nạp vào Supabase và đã duyệt** (29/10, người duyệt: Nhóm LINGUA-REFLEX). Chưa có thầy cô bộ môn đọc lại |
| M4 Buổi luyện nói (ghi âm, chép lời, gợi ý 4 mức, lưu, tiếp tục) | **Đã kiểm tra trên Supabase thật**: 24/24 kiểm tra quyền (`npm run test:sessions`), toàn luồng bằng Edge với micro giả và `MOCK_AI=1` (`npm run test:e2e`). **Chưa thử với giọng nói thật, Deepgram và OpenAI TTS thật.** Chưa có: giữ bản ghi khi mất mạng |
| M5 Phản hồi từng câu (đo trực tiếp + AI nhận xét, nói lại tối đa 3 lần, so sánh) | **Đã viết.** Phần AI đã thử với OpenAI thật (`npm run test:feedback`: 4/4 đạt với `gpt-5.6-terra` và `gpt-4.1-mini`, gồm câu có lỗi, câu quá ngắn, câu có lệnh chèn). **Đã kiểm tra trên Supabase thật**: quyền đọc/ghi phản hồi trong `npm run test:sessions`, luồng nói lại + so sánh trong `npm run test:e2e` (`MOCK_AI=1`). **Chưa thử với giọng nói thật trên điện thoại và với học sinh thật.** |
| M6 Tổng kết buổi, lịch sử, dashboard học sinh thật, giáo viên xem buổi luyện của học sinh | **Đã viết.** Quy tắc tổng kết có test (`tests/summary.test.ts`). Giao diện đã xem bằng Edge ở 375px/1280px qua `/dev-preview/session-report`, `/dev-preview/student-new`, `/dev-preview/student-in-class`. **Đã kiểm tra trên Supabase thật**: `npm run test:sessions` 41/41 (gồm `complete_session`), `npm run test:e2e` 42/42 (tổng kết, lịch sử, dashboard, giáo viên xem buổi của học sinh trong lớp). **Chưa thử bằng tay trên điện thoại thật**; "điểm cần cải thiện" (cần ≥ 3 buổi) mới có test thuần, chưa có test trình duyệt |
| M7 Quyền riêng tư, xóa dữ liệu, hoàn thiện | **Đã làm và đã thử trên Supabase thật** (30/10): trang `/quyen-rieng-tu` (khớp với mã: dữ liệu lưu, dịch vụ nhận dữ liệu, ai được xem), trang `/account` xóa tài khoản kèm file ghi âm ở cả 3 kho (`npm run test:e2e-account` 10/10), trang lỗi, trang không tìm thấy, trang đang tải |
| Khóa luyện tự do với người tham gia nghiên cứu (việc 3.0, 30/10) | **Đã làm và đã thử trên Supabase thật** (`npm run test:practice-lock` 14/14): RLS (`0009`) chặn người tham gia tạo buổi và lưu câu trả lời luyện tự do khi `study_over` chưa bật; máy chủ chặn trang `/student/practice/**`, `/student/history`, `/student/sessions/**`, các thao tác lưu/nhận xét/kết thúc buổi, `/api/transcribe`, `/api/tts`. Học sinh thường không bị ảnh hưởng (`test:e2e` 43/43, `test:sessions` 41/41) |
| Giai đoạn 1 cải tiến (3.1–3.6, 30/10) | **Đã làm, đã thử với `MOCK_AI=1`, chưa commit.**<br>3.1 `/login` có hai tab "Mã học sinh" / "Email" (giữ `?as=email`); khối màu thấp trên điện thoại, nút Đăng nhập nằm trong màn hình đầu (đã xem ảnh 390px).<br>3.2 Trang chủ mới: tiêu đề về phản xạ, thẻ ví dụ Speed Q&A có vạch thời gian (CSS, tắt khi giảm chuyển động), sơ đồ Kim tự tháp SVG, mục "Hiện web có những gì", FAQ "Khác gì ELSA?".<br>3.3 Bỏ câu hỏi "Muốn cải thiện" (cột `goal` giữ nguyên).<br>3.4 Trang học sinh: khối "Thời gian bắt đầu nói" (`src/lib/reaction.ts`, test `tests/reaction.test.ts`); "Lớp của bạn" chuyển sang `/account`. Khối có biểu đồ (≥ 2 buổi có số đo) mới thử bằng test thuần và dữ liệu mẫu ở `/dev-preview/student-in-class`, chưa xem với dữ liệu thật.<br>3.5 AI nhận xét chỉ khi bấm "Xem nhận xét của AI"; đo trực tiếp hiện ngay; so sánh lần 1/lần 2 vẫn chạy khi chưa có AI (`test:e2e` 45/45).<br>3.6 Trang lớp của giáo viên: số buổi tuần này, thời gian bắt đầu nói buổi gần nhất, số bạn đã luyện mỗi Unit (`src/lib/classStats.ts`, test `tests/classStats.test.ts`); chưa thử bằng trình duyệt với lớp có dữ liệu |
| Giao diện sáng kiểu Stripe/Linear | **Đã làm** (30/10): token mới trong `globals.css`, phông Inter, xem DESIGN.md. Đã xem bằng ảnh chụp trang chủ, đăng nhập, trang học sinh ở 390px/1280px. Các bài thử trình duyệt cũ vẫn đạt (`test:e2e`, `test:e2e-test`) |
| NC1 Nghiên cứu: đăng nhập mã HS + PIN, chế độ Kiểm tra (mục 3.5), đo RL tự động (mục 3.7), lệnh cho nhóm | **Đã kiểm tra trên Supabase thật** (29/10): `npm run test:research` 15/15 (quyền), `npm run test:e2e-test` 19/19 (cả bài bằng Edge, micro giả im lặng, `MOCK_AI=1`: đăng nhập mã + PIN, 2 câu mẫu + 15 câu, tự dừng sau 10 giây im lặng, file ghi âm, đo RL). Đề đã nạp kèm giọng đọc (giọng `cedar`, mô hình `gpt-4o-mini-tts-2025-12-15`, 32 file, Deepgram nghe lại đúng từng chữ). **Không đổi giọng cho tới hết bài kiểm tra lần 2.** **Chưa thử trên điện thoại thật, chưa thử Deepgram thật cho RL.** Giữa hai câu có khoảng 4–5 giây chờ máy chủ |
| NC2 Chế độ A (Pyramid L0–L3, Speed Q&A 5 → 3 → 1,5 giây, Rescue Cascade, Micro-Roleplay), Chế độ B (đọc to), log từng lượt + CSV, câu hỏi hằng tuần | **Đã viết.** Quy tắc có test (`tests/modes.test.ts`: lập buổi, mức Speed Q&A, chấm nhanh, ngày/tuần giờ VN, nội dung không gần đề kiểm tra). Nội dung bài đọc, hội thoại, đề nói: lớp 8 Unit 1–6 (`content/research/grade-8-modes.json`, nhóm tự viết). **Đã kiểm tra trên Supabase thật** (30/10): `npm run test:research` 21/21 (gồm 6 mục quyền của chế độ luyện), `npm run test:e2e-modes` 21/21 (cả buổi A L0 → L3 và buổi B bằng Edge, `MOCK_AI=1`). Chưa thử trên điện thoại thật, chưa thử với Deepgram thật |

Kiểm tra: `npm run lint && npm run typecheck && npm run test && npm run build`. Test thuần gồm mã lớp, biểu mẫu, chọn câu, gợi ý, phát hiện bắt đầu nói, số đo và kiểm chứng phản hồi AI.

### Phản hồi AI (M5)

- Mã: `src/lib/feedback/` (`measures.ts` đo bằng quy tắc; `core.ts` câu lệnh, lược đồ, kiểm chứng, gọi OpenAI; `generate.ts` chỉ chạy ở máy chủ). Hành động `requestFeedback` trong `src/app/(student)/student/practice/actions.ts`.
- Mô hình đặt ở `OPENAI_FEEDBACK_MODEL`. Mô hình phải nhận `response_format: json_schema` qua Chat Completions. Thử mô hình khác mà không sửa `.env.local`: `OPENAI_FEEDBACK_MODEL=<tên> npm run test:feedback`.
- Máy chủ bỏ mọi lỗi ngữ pháp mà AI không trích đúng nguyên văn từ chữ ghi lời, bỏ câu gợi ý quá dài, và không nhận xét ngữ pháp/từ vựng khi câu dưới 4 từ.
- Không gửi tên hay email sang OpenAI. Mỗi học sinh tối đa 20 lần/phút, 300 lần/ngày (`src/lib/usage.ts`). Câu đã có nhận xét thì không gọi AI lại.

## Thiết lập Supabase (làm một lần)

1. Chạy `supabase/migrations/0001_core.sql` trong SQL Editor.
2. Authentication > Providers > Email: tắt "Confirm email" khi phát triển (Supabase mặc định chỉ gửi vài email mỗi giờ, không đủ cho cả lớp đăng ký). Trước khi dùng thật, gắn SMTP riêng rồi bật lại; ứng dụng tự nhận ra chế độ nào đang bật.
3. Authentication > URL Configuration: Site URL `http://localhost:3000`, thêm Redirect URL `http://localhost:3000/auth/callback`.
4. `npm run test:rls` để kiểm tra phân quyền (tạo và xóa tài khoản thử `@example.test`).
5. Chạy `supabase/migrations/0002_content.sql`, rồi `npm run content:seed` để nạp nội dung (trạng thái nháp).
5b. Chạy `supabase/migrations/0007_grades_6_12.sql` để nhận học sinh, lớp và Unit lớp 10–12 (trước đây chỉ 6–9).
5c. Chạy `supabase/migrations/0008_modes.sql` (hai chế độ luyện của nghiên cứu, sau 0006), rồi `0009_practice_lock.sql` (khóa luyện tự do với người tham gia cho tới `study_over`).
6. Chạy `supabase/migrations/0003_sessions.sql`, `0004_feedback.sql` và `0005_complete_session.sql`, rồi `npm run test:sessions` (quyền buổi luyện và phản hồi) và `npm run test:e2e` (cả luồng bằng trình duyệt, cần web chạy với `MOCK_AI=1` ở cổng 3126).
7. Sau khi thầy cô đọc kỹ một Unit: `npm run content:approve -- 8 1 "Tên người duyệt"`. Chỉ Unit đã duyệt mới hiện cho học sinh. Sửa file JSON rồi nạp lại thì Unit tự về nháp.

## Nội dung luyện tập

`content/grade-<khối>/unit-<số>.json`, đủ 78 Unit: lớp 6–9 mỗi khối 12 Unit, lớp 10–12 mỗi khối 10 Unit. Mỗi Unit: 12 từ vựng, 6 khung câu, 15 câu hỏi (độ khó 1–3), mỗi câu có đủ 4 mức gợi ý (hướng nghĩ, từ khóa, khung câu, câu ví dụ). Chỉ lấy chủ đề, từ vựng, mẫu ngữ pháp từ Book map và Glossary của SGK Global Success 6–12; mọi câu hỏi và ví dụ đều tự viết. Cấu trúc và luật kiểm tra: `src/lib/content/schema.ts`. Câu luyện lớp 8 không được gần câu trong đề kiểm tra nghiên cứu (`tests/research.test.ts`). Một số câu hỏi trùng nguyên văn giữa các khối khác nhau (8 câu); không ảnh hưởng vì học sinh chỉ thấy Unit của khối mình.

### Tổng kết và lịch sử (M6)

- Buổi chỉ "hoàn thành" qua `complete_session` (0005), khi mọi câu đã có câu trả lời. Học sinh bấm "Xem tổng kết buổi luyện" ở cuối buổi.
- Tổng kết, mục tiêu buổi sau và "điểm cần cải thiện" tính bằng quy tắc cố định trong `src/lib/summary.ts` (không qua AI), luôn kèm căn cứ. Mỗi câu chỉ tính lần trả lời cuối. "Điểm cần cải thiện" chỉ hiện khi đã có ít nhất 3 buổi hoàn thành.
- `src/lib/sessions.ts` đọc bằng client thường nên RLS quyết định ai xem được: học sinh xem buổi của mình (`/student/sessions/[id]`, `/student/history`), giáo viên xem học sinh trong lớp mình (`/teacher/students/[id]`, `/teacher/sessions/[id]`). Bản ghi âm phát qua đường dẫn ký tên hết hạn sau 1 giờ.

## Nghiên cứu (quy trình 23/10/2026)

Lệnh cho nhóm nghiên cứu. Mọi file xuất ra nằm trong `files/research/` (không đưa lên GitHub). Chạy trên máy có `.env.local`.

| Khi nào | Lệnh |
|---|---|
| Một lần, sau khi chạy `0006_research.sql` | `npm run research:seed-tests` nạp đề A/B lớp 8 (`content/tests/grade-8.json`) và tạo sẵn giọng đọc |
| Tối 01/11, sau khi bốc thăm thứ tự đề | `npm run research:students -- files/research/hoc-sinh.csv` (cột `code,grade,form_order[,pilot]`), in file `phieu-dang-nhap-*.csv` phát cho học sinh |
| Học sinh quên PIN | `npm run research:students -- --reset HS008` |
| 30–31/10 thử đề với lớp 9 | Tạo tài khoản với cột `pilot` = 1: làm đề A rồi đề B liền nhau |
| 04–06/11 đo RL và kiểm chứng tay | `npm run research:export -- --audio` (CSV từng câu + tóm tắt trung vị RL mỗi học sinh + file ghi âm) |
| Có câu "chưa đo được" | `npm run research:rescore` |
| 06/11 sau khi bốc thăm nhóm | `npm run research:arms -- files/research/chia-nhom.csv` (cột `code,arm`) |
| 09/11 bắt đầu giai đoạn luyện | `npm run research:settings -- practice_open true` (Unit luyện: `practice_units`, mặc định 1,2,3; mỗi Unit 5 buổi) |
| Hằng tuần, theo dõi luyện tập | `npm run research:export -- --practice` (thêm CSV từng lượt nói theo mục 3.8, từng buổi, câu hỏi hằng tuần; CÓ chế độ A/B, không gửi người chấm) |
| 30/11 mở bài kiểm tra lần 2 | `npm run research:settings -- post_test_open true` |
| Sau 15/12 | `npm run research:settings -- study_over true` (mọi người dùng chế độ A và trang luyện tự do) |

- Học sinh đăng nhập ở `/login` bằng mã + PIN; giáo viên dùng `/login?as=email`. Không lưu họ tên học sinh.
- Bài kiểm tra: câu hỏi (chữ + giọng đọc tạo sẵn, cùng giọng cho mọi câu) → tiếng bíp → ghi âm, tự sang câu sau khi im lặng 10 giây hoặc sau 20 giây. Không đồng hồ, không nhận xét. Tiếng bíp được trộn thẳng vào file ghi âm (880 Hz, 150 ms, bắt đầu ở giây 0,30 của file) để đo tay bằng Audacity.
- RL máy đo = từ lúc hết tiếng bíp tới đầu từ có nghĩa đầu tiên theo Deepgram (`src/lib/research/latency.ts`), bỏ uh/um/er/ah/hmm; quá 10 giây ghi 10 giây và "không trả lời".
- Trong thực nghiệm, người tham gia chỉ luyện qua chế độ được gán (A hoặc B), **mỗi ngày một buổi**, sau khi đã làm bài kiểm tra lần 1, đã chia nhóm và nhóm đã bật `practice_open`. Trang luyện tự do chỉ mở sau `study_over`. Đầu mỗi tuần phải trả lời câu hỏi "có luyện nói thêm ở đâu khác không" trước khi luyện.
- **Chế độ A** (`src/components/ModeRunner.tsx`, quy tắc trong `src/lib/research/modes.ts`), khoảng 12–15 phút, 29 lượt nói:
  - L0: 6 từ vựng. Nhìn nghĩa tiếng Việt, nói từ, nghe mẫu, nói theo.
  - L1: 3 khung câu, rồi 6 câu Speed Q&A.
  - L2: 3 câu mở rộng có lý do, có AI nhận xét khi bấm.
  - L3: Micro-Roleplay 4 lượt, rồi nói một đoạn.
  - Speed Q&A: máy chủ tính mức giới hạn từ lịch sử. Kịp giờ 3 lượt liền thì nhanh hơn, trễ 2 lượt liền thì chậm lại. Kịp giờ tính theo RL đo bằng Deepgram (cùng cách đo với bài kiểm tra: từ hết tiếng bíp, bỏ uh/um).
  - Rescue Cascade: gợi ý mở từng mức. Lượt đầu chưa được thì tự mở thêm một mức và cho nói lại.
- **Chế độ B** (`src/components/ReadRunner.tsx`): đọc to 4 bài (2 hội thoại, 2 đoạn văn) của Unit, mỗi bài 2 lần, có ghi âm, đếm thời gian luyện. Không gợi ý, không AI.
- Mỗi lượt nói là một dòng `mode_turns`, file ghi âm trong kho riêng `mode-recordings` (24 kbps). Thời gian luyện chỉ tính khi trang luyện đang mở trên màn hình. Buổi "hoàn thành ≥ 10 phút" dùng cột `du_10_phut` khi xuất.
- Học sinh không đọc được đề, bài làm hay file ghi âm; không tự ghi lượt luyện, thời gian hay chế độ (kiểm tra bằng `npm run test:research`).
- `--with-arm` khi xuất dữ liệu chỉ dành cho người giữ danh sách nhóm; không gửi file đó cho người chấm.

## Xem giao diện khi chưa đăng nhập

Chạy `npm run dev`, mở `/dev-preview/student-new`, `/dev-preview/student-in-class`, `/dev-preview/teacher-empty`, `/dev-preview/teacher-classes`, `/dev-preview/onboarding`. Các trang này dùng **dữ liệu mẫu**, chỉ để xem bố cục, và trả 404 ở bản production.

## Lưu ý cho người duy trì

- `next.config.ts` cố ý **không** bật `cacheComponents`/`partialPrefetching` (mặc định của bộ khởi tạo): hầu hết trang phụ thuộc phiên đăng nhập.
- Nội dung landing phải được rà lại ở M7 để chỉ nói những gì đã chạy thật (đặc biệt: phản hồi AI, trợ giúp 4 mức, trang quyền riêng tư).
