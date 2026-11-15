-- LINGUA-REFLEX 0019: AI chấm bài thi thử nói (gợi ý, thầy cô sửa được). Chạy SAU 0018. Chỉ THÊM bảng mới. Chạy lại không sao.
--
--  * mock_test_ai_grades: điểm 0/1/2 từng câu do QUY TẮC CỐ ĐỊNH tính từ nhận định có/không của AI trên lời máy chép
--    (cơ sở chấm: src/lib/mockAiGrade.ts, docs/thi-thu-cham-ai.md). Lưu cả quy tắc đã áp dụng (R0–R5), nhận định và
--    trích dẫn của AI, mô hình, phiên bản thang chấm và lời máy chép lúc chấm để kiểm tra lại được.
--  * Chỉ máy chủ ghi (khóa quản trị, không có policy ghi). Giáo viên của lớp đọc được. Học sinh không đọc.
--  * Điểm thầy cô (mock_test_grades, 0018) luôn được ưu tiên hơn điểm AI.

create table if not exists public.mock_test_ai_grades (
  student_id      uuid not null references public.profiles (id) on delete cascade,
  question_id     text not null check (question_id ~ '^q[0-9]{2}$'),
  score           smallint not null check (score between 0 and 2),
  rule            text not null check (rule in ('R0', 'R1', 'R2', 'R3', 'R4', 'R5')),
  judgement       jsonb not null default '{}'::jsonb,
  model           text not null,
  rubric_version  text not null,
  transcript      text check (char_length(transcript) <= 2000),
  graded_at       timestamptz not null default now(),
  primary key (student_id, question_id)
);
alter table public.mock_test_ai_grades enable row level security;
drop policy if exists "class teacher reads mock ai grades" on public.mock_test_ai_grades;
create policy "class teacher reads mock ai grades" on public.mock_test_ai_grades
  for select to authenticated using (public.teaches_student(student_id));
grant select on public.mock_test_ai_grades to authenticated;
