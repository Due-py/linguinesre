-- LINGUA-REFLEX 0006: dữ liệu nghiên cứu (quy trình nghiên cứu 23/10/2026). Chạy SAU 0005_complete_session.sql.
--
-- Nguyên tắc:
--  * Học sinh tham gia đăng nhập bằng mã (VD: HS008) + PIN. Không lưu họ tên: tên hiển thị chính là mã.
--  * Mọi bảng ở đây CHỈ máy chủ ghi (khóa service role). Học sinh chỉ đọc dòng tham gia của chính mình.
--  * Câu hỏi kiểm tra không cho học sinh đọc trực tiếp: máy chủ đưa từng câu khi tới lượt, để không ai xem trước đề.
--  * Bài làm kiểm tra nằm ở kho "test-recordings" riêng: học sinh không đọc, không xóa được (giữ nguyên dữ liệu đo).
--  * Danh sách nhóm A/B (arm) không hiện cho giáo viên hay người chấm; chỉ xuất bằng script của người giữ danh sách.

create table public.research_participants (
  student_id  uuid primary key references public.profiles (id) on delete cascade,
  code        text not null unique check (code ~ '^[A-Z]{2}[0-9]{2,4}$'),
  grade       smallint not null check (grade between 6 and 12),
  form_order  text not null check (form_order in ('AB', 'BA')),   -- bốc thăm ngày 01/11
  arm         text check (arm in ('A', 'B')),                     -- bốc thăm ngày 06/11; trống = chưa chia nhóm
  pilot       boolean not null default false,                     -- thử đề: làm cả hai đề liền nhau, không vào phân tích
  created_at  timestamptz not null default now()
);
alter table public.research_participants enable row level security;
create policy "read own participation" on public.research_participants
  for select to authenticated using (student_id = (select auth.uid()));

-- Câu hỏi kiểm tra (form W = câu làm mẫu, không tính điểm). Không có policy: chỉ máy chủ đọc.
create table public.test_items (
  id        uuid primary key default gen_random_uuid(),
  grade     smallint not null,
  form      text not null check (form in ('A', 'B', 'W')),
  position  smallint not null check (position between 1 and 30),
  unit_no   smallint,
  kind      text check (kind in ('personal', 'reason', 'situation')),
  text      text not null check (char_length(text) between 1 and 200),
  unique (grade, form, position)
);
alter table public.test_items enable row level security;

create table public.test_attempts (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  phase         text not null check (phase in ('pre', 'post')),
  form          text not null check (form in ('A', 'B')),
  status        text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  user_agent    text check (char_length(user_agent) <= 300),
  unique (student_id, phase)
);
alter table public.test_attempts enable row level security;
create policy "read own attempts" on public.test_attempts
  for select to authenticated using (student_id = (select auth.uid()));

-- Một dòng cho mỗi câu đã ghi âm. rl_ms do máy đo (Deepgram); kiểm chứng bằng đo tay 20% file (mục 3.7).
create table public.test_responses (
  id              uuid primary key default gen_random_uuid(),
  attempt_id      uuid not null references public.test_attempts (id) on delete cascade,
  student_id      uuid not null references public.profiles (id) on delete cascade,
  item_id         uuid not null references public.test_items (id),
  form            text not null check (form in ('A', 'B', 'W')),
  position        smallint not null,
  audio_path      text not null,
  beep_end_ms     integer not null check (beep_end_ms between 0 and 10000),  -- mốc hết tiếng bíp trong file ghi âm
  duration_ms     integer check (duration_ms between 0 and 60000),
  rl_ms           integer check (rl_ms between 0 and 10000),
  -- pending: đã lưu file, đang chép lời; failed: chép lời lỗi (chạy lại bằng npm run research:rescore).
  rl_status       text not null default 'pending' check (rl_status in ('pending', 'ok', 'no_response', 'failed')),
  first_word      text,
  transcript      text check (char_length(transcript) <= 2000),
  words           jsonb,
  created_at      timestamptz not null default now(),
  unique (attempt_id, item_id)
);
create index test_responses_attempt_idx on public.test_responses (attempt_id);
alter table public.test_responses enable row level security;

-- Cài đặt do nhóm nghiên cứu bật/tắt bằng script (VD: post_test_open). Không có policy.
create table public.research_settings (
  key    text primary key,
  value  jsonb not null
);
alter table public.research_settings enable row level security;
insert into public.research_settings (key, value) values ('post_test_open', 'false') on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('test-recordings', 'test-recordings', false, 10485760, array['audio/webm', 'audio/mp4', 'audio/ogg'])
on conflict (id) do nothing;
-- test-recordings: không có policy, chỉ máy chủ ghi/đọc.
