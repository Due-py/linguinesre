-- LINGUA-REFLEX 0004: phản hồi AI cho từng câu trả lời (M5). Chạy SAU 0003_sessions.sql.
--
-- Nguyên tắc:
--  * Chỉ máy chủ ghi (khóa service role, sau khi đã kiểm tra câu trả lời thuộc về học sinh). Không có policy ghi nào,
--    nên học sinh không tự sửa hay tự tạo nhận xét được.
--  * Học sinh đọc phản hồi của mình; giáo viên đọc phản hồi của học sinh trong lớp mình.
--  * "Đo trực tiếp" (số từ, từ khóa, có lý do) KHÔNG lưu ở đây: tính lại từ câu trả lời bằng quy tắc mỗi lần hiển thị.
--  * status = 'failed': AI lỗi hoặc trả sai lược đồ. Giao diện nói "Chưa có nhận xét"; học sinh có thể thử lại.

create table public.answer_feedback (
  answer_id   uuid primary key references public.session_answers (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  status      text not null check (status in ('ok', 'failed')),
  model       text not null check (char_length(model) <= 100),
  payload     jsonb,
  created_at  timestamptz not null default now(),
  check ((status = 'ok') = (payload is not null))
);
create index answer_feedback_student_idx on public.answer_feedback (student_id);

alter table public.answer_feedback enable row level security;

create policy "read feedback" on public.answer_feedback
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_student(student_id));
