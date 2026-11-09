-- LINGUA-REFLEX 0014: Lingua Coins (LC), Cửa hàng Penguin, đồ đã sở hữu. Chạy SAU 0013_adventure.sql, trong SQL Editor.
--
-- Nguyên tắc (tách khỏi việc học và nghiên cứu):
--  * EXP (bảng xp_events của 0013) chỉ tăng, không tiêu, không mua được. LC là tiền ảo RIÊNG, chỉ mua đồ trang trí.
--  * Số dư LC = tổng các giao dịch (coin_transactions). Mỗi khoản nhận có khóa nguồn (source) unique: không nhận trùng.
--  * Mua đồ chỉ qua hàm buy_item (máy chủ gọi bằng khóa service_role): khóa theo học sinh, kiểm tra số dư rồi ghi đồ và
--    giao dịch trong CÙNG một giao dịch CSDL, nên không âm tiền, không mua trùng dù bấm nhiều lần.
--  * Học sinh chỉ ĐỌC dữ liệu của mình. Không có policy ghi cho người dùng.
--  * Công tắc research_settings.gamification_enabled = false tắt hết phần trò chơi (khi cần buổi nghiên cứu có kiểm soát).

create table public.coin_transactions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  delta       integer not null check (delta <> 0 and delta between -10000 and 10000),
  source      text not null check (char_length(source) between 3 and 120),   -- "lesson:<id>", "level:3", "buy:<món>"...
  reason      text not null check (char_length(reason) between 1 and 200),
  created_at  timestamptz not null default now(),
  unique (student_id, source)
);
create index coin_transactions_student_idx on public.coin_transactions (student_id, created_at);

create table public.shop_items (
  key          text primary key check (key ~ '^[a-z0-9_]{2,40}$'),
  slot         text not null check (slot in ('skin', 'accessory', 'background', 'effect')),
  name_vi      text not null check (char_length(name_vi) between 1 and 60),
  description_vi text not null check (char_length(description_vi) between 1 and 200),
  price        integer not null check (price between 1 and 5000),
  sort         smallint not null default 0,
  active       boolean not null default true
);

create table public.owned_items (
  student_id   uuid not null references public.profiles (id) on delete cascade,
  item_key     text not null references public.shop_items (key) on delete cascade,
  acquired_at  timestamptz not null default now(),
  primary key (student_id, item_key)
);

alter table public.coin_transactions enable row level security;
alter table public.shop_items enable row level security;
alter table public.owned_items enable row level security;

create policy "read own coins" on public.coin_transactions
  for select to authenticated using (student_id = (select auth.uid()));
create policy "read shop" on public.shop_items
  for select to authenticated using (true);
create policy "read own items" on public.owned_items
  for select to authenticated using (student_id = (select auth.uid()));
-- Không có policy ghi: chỉ máy chủ ghi.

-- Mua một món: 'ok' | 'no_item' | 'owned' | 'insufficient'. Chỉ máy chủ (service_role) gọi được.
create or replace function public.buy_item(p_student uuid, p_item text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
  v_name text;
  v_balance integer;
begin
  -- Một học sinh mua lần lượt: hai lần bấm cùng lúc không trừ tiền hai lần.
  perform pg_advisory_xact_lock(hashtext('coins:' || p_student::text));
  select price, name_vi into v_price, v_name from shop_items where key = p_item and active;
  if v_price is null then return 'no_item'; end if;
  if exists (select 1 from owned_items where student_id = p_student and item_key = p_item) then return 'owned'; end if;
  select coalesce(sum(delta), 0) into v_balance from coin_transactions where student_id = p_student;
  if v_balance < v_price then return 'insufficient'; end if;
  insert into owned_items (student_id, item_key) values (p_student, p_item);
  insert into coin_transactions (student_id, delta, source, reason) values (p_student, -v_price, 'buy:' || p_item, 'Mua ' || v_name);
  return 'ok';
end;
$$;
revoke all on function public.buy_item(uuid, text) from public, anon, authenticated;
grant execute on function public.buy_item(uuid, text) to service_role;

-- Danh mục đồ (chỉ trang trí, không ảnh hưởng việc học). Giá theo mức LC một Unit đầy đủ (khoảng 250 LC).
insert into public.shop_items (key, slot, name_vi, description_vi, price, sort) values
  ('bg_meadow',   'background', 'Đồng cỏ',          'Đồng cỏ xanh và mây trắng phía sau Linguine.', 40, 10),
  ('bg_kitchen',  'background', 'Bếp nhà Linguine', 'Căn bếp ấm áp có kệ gia vị và nồi mì.', 60, 11),
  ('bg_beach',    'background', 'Bờ biển',          'Cát vàng, sóng nhẹ và mặt trời buổi sáng.', 70, 12),
  ('bg_library',  'background', 'Thư viện',         'Những kệ sách cao cho Linguine đọc sách.', 80, 13),
  ('bg_night',    'background', 'Đêm sao',          'Bầu trời đêm đầy sao và trăng lưỡi liềm.', 90, 14),
  ('fx_sparkle',  'effect',     'Lấp lánh',         'Vài ngôi sao nhỏ lấp lánh quanh Linguine.', 60, 20),
  ('fx_bubbles',  'effect',     'Bong bóng',        'Bong bóng xà phòng bay lên nhẹ nhàng.', 70, 21),
  ('fx_glow',     'effect',     'Vầng sáng',        'Vầng sáng vàng dịu sau lưng Linguine.', 90, 22),
  ('acc_book',    'accessory',  'Cuốn sách nhỏ',    'Một cuốn sách xanh đặt cạnh Linguine.', 40, 30),
  ('acc_balloon', 'accessory',  'Bóng bay',         'Quả bóng bay xanh lá buộc dây.', 40, 31),
  ('acc_plant',   'accessory',  'Chậu cây',         'Chậu cây non tươi tốt.', 50, 32),
  ('acc_cocoa',   'accessory',  'Ly cacao',         'Ly cacao nóng có kem.', 50, 33),
  ('acc_guitar',  'accessory',  'Đàn ghi-ta nhỏ',   'Cây đàn ghi-ta gỗ nhỏ xinh.', 80, 34),
  ('skin_winter', 'skin',       'Linguine mùa đông','Mũ len và khăn quàng ấm áp thay cho mũ đầu bếp.', 150, 40),
  ('skin_sailor', 'skin',       'Linguine thủy thủ','Mũ và cổ áo thủy thủ.', 150, 41),
  ('skin_scholar','skin',       'Linguine học giả', 'Mũ tốt nghiệp và kính tròn.', 200, 42)
on conflict (key) do nothing;

-- Công tắc phần trò chơi (true: bật). Đặt false khi cần buổi nghiên cứu có kiểm soát: ẩn EXP, LC, cửa hàng và dừng thưởng.
insert into public.research_settings (key, value) values ('gamification_enabled', 'true'::jsonb) on conflict do nothing;
