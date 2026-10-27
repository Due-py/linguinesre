-- Example: create a class code. Change the code/name/grade, then run in SQL Editor.
-- Codes: 4-16 characters, A-Z, 0-9 and "-". Make them hard to guess (e.g. 8A1-XK7Q).
insert into public.classes (code, name, grade)
values ('8A1-XK7Q', 'Lớp 8A1 – FPT Bắc Giang', 8);

-- Close a class (no new sign-ups) later with:
-- update public.classes set is_open = false where code = '8A1-XK7Q';
