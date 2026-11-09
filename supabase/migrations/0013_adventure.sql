-- LINGUA-REFLEX 0013: Bản đồ phiêu lưu (trò chơi hóa). Chạy SAU 0012, trong SQL Editor của Supabase.
--
-- Ba hệ thống tách riêng:
--  1. Tiến trình trò chơi (file này): XP, cấp phiêu lưu, thành tích, đồ trang trí, lượt chơi mini-game.
--  2. Tiến trình học (module_lessons, module_attempts, 0010): kỹ năng nói tính từ số đo thật, KHÔNG đọc bảng nào ở đây.
--  3. Đo lường nghiên cứu (0006, 0008, 0009): không đổi gì, không liên quan tới XP.
--
-- Nguyên tắc:
--  * XP chỉ được máy chủ ghi, từ việc học có thật (xong một bài, lần đầu xong một mini-game, thử thách trong ngày).
--    Mỗi nguồn XP có khóa riêng (source), unique theo học sinh: không thể nhận hai lần, không cày được.
--  * Không có bảng chuỗi ngày, không trừ XP. Thành tích chỉ mở đồ trang trí, không cộng gì vào kết quả học.
--  * Học sinh chỉ ĐỌC dữ liệu của mình; giáo viên đọc học sinh trong lớp mình. Không có policy ghi cho người dùng.

create table public.xp_events (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  source      text not null check (char_length(source) between 3 and 120),   -- "lesson:<id>", "game:<module>:<game>", "daily:<ngày>"
  kind        text not null check (kind in ('quest', 'game', 'daily')),
  xp          smallint not null check (xp between 1 and 500),
  created_at  timestamptz not null default now(),
  unique (student_id, source)
);
create index xp_events_student_idx on public.xp_events (student_id, created_at);

create table public.achievements (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  key         text not null check (key ~ '^[a-z_]{3,40}$'),
  earned_at   timestamptz not null default now(),
  evidence    text check (char_length(evidence) <= 200),                     -- dựa trên việc gì (để giải thích được)
  primary key (student_id, key)
);

create table public.adventure_profiles (
  student_id  uuid primary key references public.profiles (id) on delete cascade,
  cosmetics   jsonb not null default '{}'::jsonb,                            -- {"flag": "...", "season": "...", "trail": "..."}
  updated_at  timestamptz not null default now()
);

-- Mini-game: máy chủ chọn câu (items, KHÔNG có đáp án), chấm từng câu khi học sinh trả lời (answers).
create table public.game_rounds (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles (id) on delete cascade,
  module_id    uuid not null references public.modules (id) on delete cascade,
  game         text not null check (game in ('vocab_match', 'sentence_builder', 'grammar_fix', 'conversation_choice', 'quick_think')),
  items        jsonb not null,
  answers      jsonb not null default '[]'::jsonb,
  total        smallint not null check (total between 1 and 12),
  correct      smallint check (correct between 0 and 12),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index game_rounds_student_idx on public.game_rounds (student_id, module_id, game, started_at);

alter table public.xp_events enable row level security;
alter table public.achievements enable row level security;
alter table public.adventure_profiles enable row level security;
alter table public.game_rounds enable row level security;

create policy "read own or class xp" on public.xp_events
  for select to authenticated using (student_id = (select auth.uid()) or public.teaches_student(student_id));
create policy "read own or class achievements" on public.achievements
  for select to authenticated using (student_id = (select auth.uid()) or public.teaches_student(student_id));
create policy "read own adventure profile" on public.adventure_profiles
  for select to authenticated using (student_id = (select auth.uid()));
create policy "read own or class game rounds" on public.game_rounds
  for select to authenticated using (student_id = (select auth.uid()) or public.teaches_student(student_id));
-- Không có policy ghi: chỉ máy chủ (khóa service_role) ghi, sau khi đã kiểm tra người đang đăng nhập.
