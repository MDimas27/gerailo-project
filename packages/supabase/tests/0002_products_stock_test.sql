-- Test golden 0002: produk, alias, kuota, stok awal, RPC, RLS.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('33333333-3333-3333-3333-333333333333', 'owner-m2-a@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'owner-m2-b@test.local');

-- --- Usaha A ---
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M2 A', 'makanan', 'TRANSFER') $$,
  'create_business M2 usaha A'
);

insert into test_ids
select 'business_a', id from public.businesses where owner_id = auth.uid();

select is(
  (select plan from public.businesses where id = (select id from test_ids where key = 'business_a')),
  'FREE',
  'usaha baru default paket FREE'
);

select is(
  (select onboarding_selesai from public.businesses where id = (select id from test_ids where key = 'business_a')),
  false,
  'usaha baru belum menyelesaikan onboarding'
);

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'business_a'),
      'Kopi Gula',
      15000,
      5,
      array['kopi gula', 'kg'],
      10,
      8000
    )
  $$,
  'create_product membuat produk + alias + stok awal'
);

select is(
  (select harga_jual from public.products where nama = 'Kopi Gula'),
  15000::bigint,
  'harga jual tersimpan sebagai BIGINT'
);

select is(
  (select count(*) from public.product_aliases where product_id = (select id from public.products where nama = 'Kopi Gula')),
  2::bigint,
  'dua alias tersimpan'
);

select is(
  (
    select count(*)
    from public.stock_movements
    where product_id = (select id from public.products where nama = 'Kopi Gula')
      and jenis = 'MASUK'
      and qty = 10
      and alasan = 'stok awal'
  ),
  1::bigint,
  'stok awal membentuk satu movement MASUK'
);

select is(
  (select saldo from public.v_stock_balance where product_id = (select id from public.products where nama = 'Kopi Gula')),
  10::bigint,
  'saldo stok dari view = 10'
);

select throws_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'business_a'),
      'Harga Nol',
      0
    )
  $$,
  '22023',
  'HARGA_TIDAK_VALID',
  'harga 0 ditolak'
);

select throws_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'business_a'),
      'Kopi Susu',
      18000,
      0,
      array['KOPI GULA']
    )
  $$,
  '23505',
  'ALIAS_DUPLIKAT',
  'alias duplikat case-insensitive ditolak'
);

-- Isi kuota FREE sampai 100 produk aktif (1 sudah ada + 99).
select lives_ok(
  $$
    insert into public.products (business_id, nama, harga_jual)
    select (select id from test_ids where key = 'business_a'), 'Produk ' || g, 1000
    from generate_series(1, 99) as g
  $$,
  '99 produk tambahan masuk sampai kuota 100'
);

select throws_ok(
  $$
    insert into public.products (business_id, nama, harga_jual)
    values ((select id from test_ids where key = 'business_a'), 'Produk 101', 1000)
  $$,
  'P0001',
  'PRODUK_QUOTA_TERLAMPAUI',
  'produk ke-101 paket FREE ditolak'
);

select lives_ok(
  $$
    update public.products set aktif = false
    where business_id = (select id from test_ids where key = 'business_a')
      and nama = 'Kopi Gula'
  $$,
  'soft-delete produk aktif'
);

select lives_ok(
  $$
    insert into public.products (business_id, nama, harga_jual)
    values ((select id from test_ids where key = 'business_a'), 'Produk Setelah Arsip', 1000)
  $$,
  'produk baru lolos kuota setelah soft-delete'
);

select throws_ok(
  $$
    select public.record_stock_move(
      (select id from public.products where nama = 'Kopi Gula'),
      'KELUAR',
      -1,
      null,
      'kirim',
      null
    )
  $$,
  '42501',
  'KELUAR_HANYA_VIA_ORDER',
  'KELUAR dari klien ditolak'
);

select throws_ok(
  $$
    select public.record_stock_move(
      (select id from public.products where nama = 'Kopi Gula'),
      'PENYESUAIAN',
      -2,
      null,
      '',
      null
    )
  $$,
  '22023',
  'ALASAN_WAJIB',
  'penyesuaian tanpa alasan ditolak'
);

select lives_ok(
  $$
    select public.record_stock_move(
      (select id from public.products where nama = 'Kopi Gula'),
      'PENYESUAIAN',
      -2,
      null,
      'barang rusak',
      null
    )
  $$,
  'penyesuaian dengan alasan diterima'
);

-- --- Usaha B ---
set local request.jwt.claims =
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M2 B', 'fashion', 'COD') $$,
  'create_business M2 usaha B'
);

insert into test_ids
select 'business_b', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'business_b'),
      'Produk B',
      20000
    )
  $$,
  'usaha B membuat produk sendiri'
);

select is(
  (
    select count(*)
    from public.products
    where business_id = (select id from test_ids where key = 'business_a')
  ),
  0::bigint,
  'usaha B tidak melihat produk usaha A'
);

select throws_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'business_a'),
      'Produk Selundupan',
      1000
    )
  $$,
  '42501',
  'USAHA_TIDAK_DITEMUKAN',
  'usaha B tidak bisa menulis produk usaha A'
);

-- --- Kembali ke A ---
set local request.jwt.claims =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$
    update public.businesses set plan = 'STARTER'
    where id = (select id from test_ids where key = 'business_a')
  $$,
  '42501',
  'permission denied for table businesses',
  'pemilik tidak bisa mengubah plan sendiri'
);

-- --- Anon tidak boleh memanggil RPC / menulis stok ---
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'business_a'),
      'Produk Anon',
      1000
    )
  $$,
  '42501',
  'permission denied for function create_product',
  'anon tidak boleh create_product'
);

reset role;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';

select throws_ok(
  $$
    insert into public.stock_movements (business_id, product_id, jenis, qty, alasan)
    values (
      (select id from test_ids where key = 'business_a'),
      (select id from public.products where nama = 'Kopi Gula'),
      'MASUK',
      1,
      'langsung'
    )
  $$,
  '42501',
  'permission denied for table stock_movements',
  'stok tidak boleh ditulis langsung'
);

select * from finish();
rollback;
