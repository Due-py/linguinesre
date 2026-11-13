-- LINGUA-REFLEX 0017: bài thi thử nói (một lần). Chạy SAU 0016. Chỉ THÊM bảng mới, không sửa dữ liệu cũ. Chạy lại không sao.
--
--  * mock_test_invites: ai được giao bài thi thử. Chỉ tạo bằng lệnh `npm run mocktest:send` (một lần, cho học sinh đang có);
--    tài khoản tạo sau đó không tự nhận bài.
--  * mock_test_answers: câu trả lời từng câu (chữ máy chép, số đo nội dung, file ghi âm trong kho "recordings" của học sinh).
--  * Khác dạng bài kiểm tra nghiên cứu: không tiếng bíp, không đo thời gian bắt đầu nói (để không làm học sinh quen dạng đề).
-- Học sinh chỉ ĐỌC dòng của mình; mọi thao tác ghi đi qua máy chủ.

create table if not exists public.mock_test_invites (
  student_id    uuid primary key references public.profiles (id) on delete cascade,
  grade         smallint not null check (grade between 6 and 12),
  sent_at       timestamptz not null default now(),
  completed_at  timestamptz
);
alter table public.mock_test_invites enable row level security;
drop policy if exists "read own mock invite" on public.mock_test_invites;
create policy "read own mock invite" on public.mock_test_invites
  for select to authenticated using (student_id = (select auth.uid()));

create table if not exists public.mock_test_answers (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  grade        smallint not null check (grade between 6 and 12),
  question_id  text not null check (question_id ~ '^q[0-9]{2}$'),
  transcript   text check (char_length(transcript) <= 2000),
  checks       jsonb not null default '{}'::jsonb,
  audio_path   text,
  updated_at   timestamptz not null default now(),
  unique (student_id, question_id)
);
alter table public.mock_test_answers enable row level security;
drop policy if exists "read own mock answers" on public.mock_test_answers;
create policy "read own mock answers" on public.mock_test_answers
  for select to authenticated using (student_id = (select auth.uid()));
