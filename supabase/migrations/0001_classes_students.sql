-- LinguaReflex: classes, students and login lockouts.
-- Run once in Supabase → SQL Editor (see docs/supabase-setup.md).

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9-]{4,16}$'),
  name text not null,
  grade int not null check (grade between 6 and 12),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row per student account. id = the Supabase Auth user id.
-- No real names, no email: only a nickname chosen by the student.
create table public.students (
  id uuid primary key references auth.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete restrict,
  nickname text not null check (char_length(nickname) between 2 and 20),
  nickname_key text not null,
  baseline_done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (class_id, nickname_key)
);

-- Wrong-PIN counter per (class, nickname). Only the server (secret key) touches it.
create table public.login_attempts (
  class_id uuid not null references public.classes (id) on delete cascade,
  nickname_key text not null,
  failed_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  primary key (class_id, nickname_key)
);

-- Row-level security: with RLS on and no policy, nobody but the secret key can read a table.
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.login_attempts enable row level security;

-- A signed-in student can read their own row...
create policy "students read own row"
  on public.students for select to authenticated
  using (id = (select auth.uid()));

-- ...and their own class (to show its name). Other classes stay hidden.
create policy "students read own class"
  on public.classes for select to authenticated
  using (id in (select s.class_id from public.students s where s.id = (select auth.uid())));

-- Nothing else is allowed from the browser: no inserts/updates/deletes for
-- students, and no access at all to login_attempts.
