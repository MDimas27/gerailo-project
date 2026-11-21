-- Test golden 0001: create_business (19 COA, rollback) + RLS lintas usaha.
-- Dijalankan oleh `supabase test db --workdir packages`.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

-- Dua pengguna auth untuk menguji isolasi RLS.
insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@test.local');

-- --- Usaha A ---
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko A', 'makanan', 'TRANSFER') $$,
  'create_business membuat usaha A'
);

select is(
  (select count(*) from public.accounts),
  19::bigint,
  'usaha A mendapat tepat 19 akun COA'
);

select is(
  (select count(*) from public.app_settings),
  1::bigint,
  'usaha A mendapat tepat 1 app_settings'
);

select is(
  (select count(*) from public.businesses),
  1::bigint,
  'usaha A melihat tepat 1 usaha'
);

-- Validasi input gagal harus rollback tanpa meninggalkan usaha.
select throws_ok(
  $$ select public.create_business('', 'makanan', 'TRANSFER') $$,
  '22023',
  'NAMA_USAHA_TIDAK_VALID',
  'nama kosong ditolak'
);

select is(
  (select count(*) from public.businesses),
  1::bigint,
  'usaha gagal tidak meninggalkan baris businesses'
);

-- --- Usaha B ---
set local request.jwt.claims =
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko B', 'fashion', 'COD') $$,
  'create_business membuat usaha B'
);

select is(
  (select count(*) from public.businesses),
  1::bigint,
  'usaha B hanya melihat usaha miliknya'
);

select is(
  (select count(*) from public.accounts),
  19::bigint,
  'usaha B hanya melihat 19 akun miliknya'
);

-- --- Isolasi RLS dari sisi A ---
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select is(
  (select count(*) from public.businesses where nama = 'Toko B'),
  0::bigint,
  'usaha A tidak bisa melihat usaha B'
);

select is(
  (
    select count(*)
    from public.accounts a
    join public.businesses b on b.id = a.business_id
    where b.nama = 'Toko B'
  ),
  0::bigint,
  'usaha A tidak bisa melihat akun COA usaha B'
);

-- --- Anon tidak boleh membuat usaha ---
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$ select public.create_business('Toko Anon', 'lainnya', 'TRANSFER') $$,
  '42501',
  'permission denied for function create_business',
  'anon tidak boleh mengeksekusi create_business'
);

-- --- Rollback penuh saat seed COA gagal ---
reset role;

create function public._test_fail_accounts()
returns trigger
language plpgsql
as $$
begin
  raise exception 'SEED_COA_DIPAKSA_GAGAL';
end;
$$;

create trigger _test_fail_accounts
before insert on public.accounts
for each row execute function public._test_fail_accounts();

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select throws_ok(
  $$ select public.create_business('Toko Gagal', 'makanan', 'TRANSFER') $$,
  'P0001',
  'SEED_COA_DIPAKSA_GAGAL',
  'seed COA gagal menggagalkan seluruh transaksi'
);

reset role;
drop trigger _test_fail_accounts on public.accounts;
drop function public._test_fail_accounts();

select is(
  (select count(*) from public.businesses),
  2::bigint,
  'tidak ada usaha tersisa setelah seed COA gagal (rollback penuh)'
);

reset role;
select * from finish();
rollback;
