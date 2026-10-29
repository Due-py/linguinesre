-- LINGUA-REFLEX 0003: buổi luyện, câu trả lời, file ghi âm, bộ đếm chống lạm dụng. Chạy SAU 0002_content.sql.
--
-- Nguyên tắc:
--  * Học sinh chỉ đọc/ghi buổi luyện và câu trả lời của chính mình; giáo viên chỉ đọc của học sinh trong lớp mình.
--  * Các số đo thời gian (think_ms, speak_ms) do trình duyệt của học sinh đo: giao diện luôn ghi là "ước lượng".
--  * File ghi âm nằm trong kho riêng tư "recordings", thư mục mang id học sinh. Học sinh xóa được file của mình.
--  * Một buổi chỉ "hoàn thành" khi mọi câu đã lên kế hoạch có ít nhất một câu trả lời (complete_session: sẽ thêm ở M6; 0004 là phản hồi AI).

create table public.practice_sessions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  unit_id       uuid not null references public.units (id) on delete cascade,
  question_ids  uuid[] not null check (cardinality(question_ids) between 1 and 10),  -- thứ tự các câu của buổi
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index practice_sessions_student_idx on public.practice_sessions (student_id, started_at desc);

create table public.session_answers (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.practice_sessions (id) on delete cascade,
  student_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_id           uuid not null references public.questions (id),
  attempt_no            smallint not null check (attempt_no between 1 and 3),
  shown_at              timestamptz not null,           -- lúc câu hỏi hiện ra
  prompt_ended_at       timestamptz not null,           -- lúc đọc xong câu hỏi (hoặc lúc hiện chữ nếu không có giọng đọc)
  think_ms              integer check (think_ms between 0 and 120000),  -- trống nếu không phát hiện được lúc bắt đầu nói
  speak_ms              integer check (speak_ms between 0 and 120000),
  transcript_raw        text not null check (char_length(transcript_raw) <= 2000),   -- máy chép lời
  transcript_final      text not null check (char_length(transcript_final) between 1 and 2000), -- sau khi học sinh sửa
  transcript_edited     boolean not null,
  transcript_confidence real check (transcript_confidence between 0 and 1),
  hint_level            smallint not null default 0 check (hint_level between 0 and 4),
  audio_path            text,
  created_at            timestamptz not null default now(),
  unique (session_id, question_id, attempt_no)
);
create index session_answers_session_idx on public.session_answers (session_id);
create index session_answers_student_idx on public.session_answers (student_id, created_at desc);

-- Bộ đếm lượt gọi dịch vụ tốn tiền (chép lời, phản hồi, giọng đọc). Chỉ máy chủ ghi/đọc (không có policy).
create table public.api_usage (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('transcribe', 'feedback', 'tts')),
  created_at timestamptz not null default now()
);
create index api_usage_user_idx on public.api_usage (user_id, kind, created_at desc);

alter table public.practice_sessions enable row level security;
alter table public.session_answers enable row level security;
alter table public.api_usage enable row level security;

create function public.is_student()
returns boolean language sql security definer stable set search_path = ''
as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student' and onboarded_at is not null); $$;
revoke all on function public.is_student() from public, anon;
grant execute on function public.is_student() to authenticated;

-- Buổi luyện ------------------------------------------------------------------------------
create policy "read sessions" on public.practice_sessions
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_student(student_id));

-- Học sinh tự mở buổi cho Unit đã duyệt; mọi câu trong buổi phải thuộc đúng Unit đó và đang dùng.
create policy "student starts session" on public.practice_sessions
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'in_progress'
    and completed_at is null
    and public.is_student()
    and exists (select 1 from public.units u where u.id = unit_id and u.status = 'approved')
    and not exists (
      select 1 from unnest(question_ids) q(id)
      where not exists (select 1 from public.questions x where x.id = q.id and x.unit_id = practice_sessions.unit_id and x.active)
    )
  );
-- Không có policy update/delete: trạng thái hoàn thành chỉ đổi qua complete_session(). Xóa dữ liệu: xem 0004.

-- Câu trả lời -----------------------------------------------------------------------------
create policy "read answers" on public.session_answers
  for select to authenticated
  using (student_id = (select auth.uid()) or public.teaches_student(student_id));

create policy "student saves answer" on public.session_answers
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.practice_sessions s
      where s.id = session_id and s.student_id = (select auth.uid())
        and s.status = 'in_progress' and question_id = any (s.question_ids)
    )
    and (audio_path is null or audio_path like (select auth.uid())::text || '/' || session_id::text || '/%')
  );

-- Kho file --------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('recordings', 'recordings', false, 10485760, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg', 'audio/wav']),
  ('question-audio', 'question-audio', false, 2097152, array['audio/mpeg'])
on conflict (id) do nothing;
-- question-audio: không có policy; máy chủ tạo và phát giọng đọc câu hỏi.

create policy "student uploads own recordings" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "student or class teacher reads recordings" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'recordings'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or public.teaches_student(((storage.foldername(name))[1])::uuid)
    )
  );
create policy "student deletes own recordings" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
