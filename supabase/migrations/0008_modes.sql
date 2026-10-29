-- LINGUA-REFLEX 0008: hai chế độ luyện của nghiên cứu (mục 2.4, 3.8, Phần 11). Chạy SAU 0006 và 0007.
--
--  * Chế độ A (LINGUA-REFLEX): Pyramid L0–L3, Speed Q&A 5 → 3 → 1,5 giây, Rescue Cascade, Micro-Roleplay.
--  * Chế độ B (đọc to): đọc to bài hội thoại / đoạn văn cùng Unit, có ghi âm, đếm thời gian luyện.
--  * Mỗi lượt nói ghi một dòng mode_turns (đủ các trường ở mục 3.8) để xuất CSV.
--  * Học sinh chỉ ĐỌC được dữ liệu của mình. Mọi thao tác ghi đi qua máy chủ (khóa máy chủ) SAU khi kiểm tra buổi luyện
--    thuộc về người đang đăng nhập, để học sinh không tự sửa số đo, buổi số hay chế độ.

create table public.mode_sessions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  mode          text not null check (mode in ('A', 'B')),
  session_no    smallint not null check (session_no >= 1),             -- buổi số (1, 2, 3...) của học sinh này
  grade         smallint not null check (grade between 6 and 12),
  unit_no       smallint not null check (unit_no between 1 and 20),
  day           date not null,                                         -- ngày theo giờ Việt Nam
  plan          jsonb not null,                                        -- các bước của buổi (máy chủ tạo, cố định)
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  active_ms     integer not null default 0 check (active_ms between 0 and 14400000),  -- thời gian thật sự mở trang luyện
  started_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  completed_at  timestamptz,
  user_agent    text,
  unique (student_id, session_no)
);
create index mode_sessions_student_idx on public.mode_sessions (student_id, day desc);

create table public.mode_turns (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.mode_sessions (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  mode           text not null check (mode in ('A', 'B')),
  step           smallint not null check (step >= 0),                  -- vị trí trong plan
  layer          text check (layer in ('L0', 'L1', 'L2', 'L3')),       -- trống với chế độ B
  activity       text not null check (activity in ('vocab', 'frame', 'speed', 'expand', 'roleplay', 'talk', 'read_aloud')),
  item_ref       text not null check (char_length(item_ref) <= 40),
  prompt         text not null check (char_length(prompt) <= 600),
  attempt_no     smallint not null default 1 check (attempt_no between 1 and 3),
  time_limit_ms  integer check (time_limit_ms in (5000, 3000, 1500)),  -- trống = không giới hạn
  rl_ms          integer check (rl_ms between 0 and 60000),
  rl_status      text not null default 'pending' check (rl_status in ('pending', 'ok', 'no_response', 'failed', 'not_measured')),
  rl_client_ms   integer check (rl_client_ms between 0 and 60000),     -- ước lượng của trình duyệt (dùng khi máy chủ chưa đo được)
  in_limit       boolean,                                               -- trống khi không giới hạn thời gian
  hint_level     smallint not null default 0 check (hint_level between 0 and 4),
  beep_end_ms    integer check (beep_end_ms between 0 and 10000),
  duration_ms    integer not null check (duration_ms between 0 and 600000),
  transcript     text check (char_length(transcript) <= 4000),
  words          jsonb,
  check_result   jsonb,
  feedback       jsonb,
  audio_path     text not null,
  created_at     timestamptz not null default now(),
  unique (session_id, step, attempt_no)
);
create index mode_turns_session_idx on public.mode_turns (session_id, step);
create index mode_turns_student_idx on public.mode_turns (student_id, created_at);

-- Câu hỏi hằng tuần (mục 2.4): "Tuần này em có luyện nói tiếng Anh thêm ở đâu khác không?"
create table public.weekly_checkins (
  student_id          uuid not null references public.profiles (id) on delete cascade,
  week_start          date not null,                                    -- thứ Hai của tuần, giờ Việt Nam
  practised_elsewhere boolean not null,
  detail              text check (char_length(detail) <= 300),
  created_at          timestamptz not null default now(),
  primary key (student_id, week_start)
);

alter table public.mode_sessions enable row level security;
alter table public.mode_turns enable row level security;
alter table public.weekly_checkins enable row level security;

create policy "read own mode sessions" on public.mode_sessions
  for select to authenticated using (student_id = (select auth.uid()));
create policy "read own mode turns" on public.mode_turns
  for select to authenticated using (student_id = (select auth.uid()));
create policy "read own checkins" on public.weekly_checkins
  for select to authenticated using (student_id = (select auth.uid()));
-- Không có policy insert/update/delete: chỉ máy chủ ghi.

-- File ghi âm của hai chế độ: kho riêng, không policy (chỉ máy chủ đọc/ghi).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('mode-recordings', 'mode-recordings', false, 10485760, array['audio/webm', 'audio/mp4', 'audio/ogg'])
on conflict (id) do nothing;

-- Cài đặt:
--  practice_open:  mở hai chế độ luyện cho mọi người tham gia đã chia nhóm (dự kiến 09/11). Người thử đề luôn được mở.
--  practice_units: các Unit lớp 8 dùng để luyện, mỗi Unit 5 buổi theo thứ tự.
--  study_over:     sau 15/12: mọi người tham gia dùng chế độ A và trang luyện tự do (mục 2.4, đạo đức).
insert into public.research_settings (key, value) values
  ('practice_open', 'false'::jsonb),
  ('practice_units', '[1, 2, 3]'::jsonb),
  ('study_over', 'false'::jsonb)
on conflict (key) do nothing;
