-- LINGUA-REFLEX 0018: giáo viên xem và chấm bài thi thử nói. Chạy SAU 0017. Chỉ THÊM policy và bảng mới. Chạy lại không sao.
--
--  * Giáo viên ĐỌC được bài thi thử (giao bài, câu trả lời) của học sinh trong lớp mình (teaches_student). Ghi âm đã đọc được
--    nhờ policy "student or class teacher reads recordings" của 0003.
--  * mock_test_grades: điểm giáo viên chấm từng câu (0, 1, 2). Tách riêng khỏi số đo của máy (mock_test_answers.checks).
--  * mock_test_reviews: nhận xét ngắn và mốc "chấm xong" của giáo viên cho một học sinh.
--  * Học sinh KHÔNG đọc được hai bảng chấm (chưa có quyết định cho học sinh xem điểm).

drop policy if exists "class teacher reads mock invites" on public.mock_test_invites;
create policy "class teacher reads mock invites" on public.mock_test_invites
  for select to authenticated using (public.teaches_student(student_id));

drop policy if exists "class teacher reads mock answers" on public.mock_test_answers;
create policy "class teacher reads mock answers" on public.mock_test_answers
  for select to authenticated using (public.teaches_student(student_id));

create table if not exists public.mock_test_grades (
  student_id   uuid not null references public.profiles (id) on delete cascade,
  question_id  text not null check (question_id ~ '^q[0-9]{2}$'),
  score        smallint not null check (score between 0 and 2),
  graded_by    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  graded_at    timestamptz not null default now(),
  primary key (student_id, question_id)
);
alter table public.mock_test_grades enable row level security;
drop policy if exists "class teacher reads mock grades" on public.mock_test_grades;
create policy "class teacher reads mock grades" on public.mock_test_grades
  for select to authenticated using (public.teaches_student(student_id));
drop policy if exists "class teacher writes mock grades" on public.mock_test_grades;
create policy "class teacher writes mock grades" on public.mock_test_grades
  for insert to authenticated with check (public.teaches_student(student_id) and graded_by = (select auth.uid()));
drop policy if exists "class teacher updates mock grades" on public.mock_test_grades;
create policy "class teacher updates mock grades" on public.mock_test_grades
  for update to authenticated using (public.teaches_student(student_id))
  with check (public.teaches_student(student_id) and graded_by = (select auth.uid()));
drop policy if exists "class teacher deletes mock grades" on public.mock_test_grades;
create policy "class teacher deletes mock grades" on public.mock_test_grades
  for delete to authenticated using (public.teaches_student(student_id));

create table if not exists public.mock_test_reviews (
  student_id   uuid primary key references public.profiles (id) on delete cascade,
  note         text check (char_length(note) <= 500),
  done_at      timestamptz,
  reviewed_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  updated_at   timestamptz not null default now()
);
alter table public.mock_test_reviews enable row level security;
drop policy if exists "class teacher reads mock reviews" on public.mock_test_reviews;
create policy "class teacher reads mock reviews" on public.mock_test_reviews
  for select to authenticated using (public.teaches_student(student_id));
drop policy if exists "class teacher writes mock reviews" on public.mock_test_reviews;
create policy "class teacher writes mock reviews" on public.mock_test_reviews
  for insert to authenticated with check (public.teaches_student(student_id) and reviewed_by = (select auth.uid()));
drop policy if exists "class teacher updates mock reviews" on public.mock_test_reviews;
create policy "class teacher updates mock reviews" on public.mock_test_reviews
  for update to authenticated using (public.teaches_student(student_id))
  with check (public.teaches_student(student_id) and reviewed_by = (select auth.uid()));

grant select, insert, update, delete on public.mock_test_grades to authenticated;
grant select, insert, update on public.mock_test_reviews to authenticated;
