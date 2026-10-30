-- LINGUA-REFLEX 0009: khóa trang luyện tự do với người tham gia nghiên cứu cho tới khi nghiên cứu kết thúc.
-- Chạy SAU 0008. Chạy lại được.
--
-- Vì sao: trong thực nghiệm, người tham gia chỉ được luyện qua chế độ A/B được gán (một buổi mỗi ngày). Giao diện và máy chủ
-- đã chặn, nhưng quy tắc RLS của practice_sessions vẫn cho mọi học sinh tự tạo buổi luyện tự do nếu gọi thẳng vào cơ sở dữ
-- liệu. RLS là lớp quyết định, nên thêm điều kiện ở đây: người tham gia chỉ tạo buổi / lưu câu trả lời khi study_over = true.

-- true = người đang đăng nhập là người tham gia nghiên cứu và nghiên cứu chưa kết thúc.
create or replace function public.practice_locked()
returns boolean language sql security definer stable set search_path = ''
as $$
  select exists (select 1 from public.research_participants where student_id = (select auth.uid()))
     and coalesce((select value from public.research_settings where key = 'study_over'), 'false'::jsonb) <> 'true'::jsonb;
$$;
revoke all on function public.practice_locked() from public, anon;
grant execute on function public.practice_locked() to authenticated;

-- Giữ nguyên như 0003, thêm "not public.practice_locked()".
drop policy if exists "student starts session" on public.practice_sessions;
create policy "student starts session" on public.practice_sessions
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'in_progress'
    and completed_at is null
    and public.is_student()
    and not public.practice_locked()
    and exists (select 1 from public.units u where u.id = unit_id and u.status = 'approved')
    and not exists (
      select 1 from unnest(question_ids) q(id)
      where not exists (select 1 from public.questions x where x.id = q.id and x.unit_id = practice_sessions.unit_id and x.active)
    )
  );

drop policy if exists "student saves answer" on public.session_answers;
create policy "student saves answer" on public.session_answers
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and not public.practice_locked()
    and exists (
      select 1 from public.practice_sessions s
      where s.id = session_id and s.student_id = (select auth.uid())
        and s.status = 'in_progress' and question_id = any (s.question_ids)
    )
    and (audio_path is null or audio_path like (select auth.uid())::text || '/' || session_id::text || '/%')
  );
