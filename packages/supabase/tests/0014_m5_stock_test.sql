-- Test golden 0014: M5 stok — moving average, blokir stok minus, edge case, retur HPP.
-- Fixture diturunkan dari docs/MODULES/M5-STOCK.md + docs/ACCOUNTING-RULES.md,
-- bukan dari implementasi. RED probe G2: PENYESUAIAN negatif melebihi saldo.
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
  ('14141414-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner-m5-a@test.local'),
  ('24242424-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner-m5-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"14141414-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select public.create_business('Toko M5 A', 'makanan', 'TRANSFER');

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

-- --- Produk utama: 10 @10.000, lalu MASUK 10 @12.000 -> HPP 11.000 ---
select public.create_product(
  (select id from test_ids where key = 'biz_a'),
  'Sosis M5',
  75000,
  5,
  array['sosis m5'],
  10,
  10000
);

insert into test_ids
select 'prod_sosis', id from public.products where nama = 'Sosis M5';

select public.record_stock_move(
  (select id from test_ids where key = 'prod_sosis'),
  'MASUK',
  10,
  12000::bigint,
  'restock pembelian',
  null
);

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_sosis')),
  11000::bigint,
  'G1 moving average 10@10000 + 10@12000 = 11000'
);

-- --- Kasus batas .5: 1@10.000 + 1@11.001 -> round(21001/2) = 10501 ---
select public.create_product(
  (select id from test_ids where key = 'biz_a'),
  'Batas Setengah',
  20000,
  0,
  array['batas setengah'],
  1,
  10000
);

insert into test_ids
select 'prod_setengah', id from public.products where nama = 'Batas Setengah';

select public.record_stock_move(
  (select id from test_ids where key = 'prod_setengah'),
  'MASUK',
  1,
  11001::bigint,
  'pembelian batas setengah',
  null
);

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_setengah')),
  10501::bigint,
  'G1 kasus batas .5: round(21001/2) = 10501 (half-up)'
);

-- --- Kirim 5 pcs: KELUAR -5 @11000, T3 HPP 55000, saldo 15 ---
insert into test_ids (key, id)
select 'order_sosis', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from test_ids where key = 'prod_sosis'),
    'qty', 5,
    'harga_satuan', 75000
  )),
  0,
  0,
  'Siti M5',
  '0812-2222-0001',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select public.confirm_order((select id from test_ids where key = 'order_sosis'));

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_sosis'), 'JNE', null, 0::bigint) $$,
  'G1 ship_order 5 pcs memposting T2+T3 + KELUAR'
);

select is(
  (
    select keluar.harga_beli
    from public.stock_movements keluar
    where keluar.order_id = (select id from test_ids where key = 'order_sosis')
      and keluar.jenis = 'KELUAR'::stock_movement_type
  ),
  11000::bigint,
  'G1 movement KELUAR memakai HPP rata-rata 11000'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_sosis')
      and je.kejadian = 'T3'
      and a.kode = '5-5010'
  ),
  55000::bigint,
  'G1 T3 HPP 5 x 11000 = 55000'
);

select is(
  (select saldo::bigint from public.v_stock_balance where product_id = (select id from test_ids where key = 'prod_sosis')),
  15::bigint,
  'G1 saldo Sosis = 15 setelah kirim'
);

-- --- G2: PENYESUAIAN negatif melebihi saldo DIBLOKIR (RED probe) ---
select throws_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_sosis'),
      'PENYESUAIAN',
      -20,
      null,
      'koreksi opname berlebih',
      null
    )
  $$,
  '22023',
  'STOK_TIDAK_CUKUP: Sosis M5 — tersedia 15, butuh 20',
  'G2 RED probe: penyesuaian minus melebihi saldo ditolak'
);

select is(
  (select saldo::bigint from public.v_stock_balance where product_id = (select id from test_ids where key = 'prod_sosis')),
  15::bigint,
  'G2 saldo tetap 15 setelah penolakan'
);

-- --- G4: penyesuaian wajib alasan, penyesuaian valid tidak mengubah HPP ---
select throws_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_sosis'),
      'PENYESUAIAN',
      -2,
      null,
      '   ',
      null
    )
  $$,
  '22023',
  'ALASAN_WAJIB',
  'G4 penyesuaian tanpa alasan ditolak 22023/ALASAN_WAJIB'
);

select lives_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_sosis'),
      'PENYESUAIAN',
      -2,
      null,
      'barang rusak opname',
      null
    )
  $$,
  'G4 penyesuaian dengan alasan diterima'
);

select is(
  (select saldo::bigint from public.v_stock_balance where product_id = (select id from test_ids where key = 'prod_sosis')),
  13::bigint,
  'G4 saldo Sosis = 13 setelah penyesuaian -2'
);

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_sosis')),
  11000::bigint,
  'G4 penyesuaian tidak mengubah HPP rata-rata'
);

select is(
  (
    select coalesce(sum(qty), 0)::bigint
    from public.stock_movements
    where product_id = (select id from test_ids where key = 'prod_sosis')
  ),
  13::bigint,
  'G4 saldo konsisten = SUM(stock_movements.qty)'
);

-- --- G5: KELUAR dari klien ditolak ---
select throws_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_sosis'),
      'KELUAR',
      -1,
      11000::bigint,
      'kirim manual',
      null
    )
  $$,
  '42501',
  'KELUAR_HANYA_VIA_ORDER',
  'G5 record_stock_move menolak KELUAR dari klien'
);

-- --- G9: MASUK tanpa harga saat saldo 0 -> HPP tetap 0 ---
select public.create_product(
  (select id from test_ids where key = 'biz_a'),
  'Tanpa Harga',
  15000,
  0,
  array['tanpa harga'],
  0,
  null
);

insert into test_ids
select 'prod_tanpa_harga', id from public.products where nama = 'Tanpa Harga';

select lives_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_tanpa_harga'),
      'MASUK',
      5,
      null,
      'stok titipan tanpa harga',
      null
    )
  $$,
  'G9 MASUK tanpa harga saat saldo 0 diterima'
);

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_tanpa_harga')),
  0::bigint,
  'G9 HPP tetap 0 saat MASUK tanpa harga'
);

select is(
  (select saldo::bigint from public.v_stock_balance where product_id = (select id from test_ids where key = 'prod_tanpa_harga')),
  5::bigint,
  'G9 saldo bertambah menjadi 5'
);

-- --- G6: retur gagal_kirim memakai snapshot HPP KELUAR + pool HPP diperbarui ---
select public.create_product(
  (select id from test_ids where key = 'biz_a'),
  'Sosis Retur',
  75000,
  0,
  array['sosis retur'],
  10,
  10000
);

insert into test_ids
select 'prod_retur', id from public.products where nama = 'Sosis Retur';

select public.record_stock_move(
  (select id from test_ids where key = 'prod_retur'),
  'MASUK',
  10,
  12000::bigint,
  'restock sebelum kirim',
  null
);

insert into test_ids (key, id)
select 'order_retur', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from test_ids where key = 'prod_retur'),
    'qty', 5,
    'harga_satuan', 75000
  )),
  0,
  0,
  'Budi Retur',
  '0812-2222-0002',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select public.confirm_order((select id from test_ids where key = 'order_retur'));
select public.ship_order((select id from test_ids where key = 'order_retur'), 'JNE', null, 0::bigint);

select public.record_stock_move(
  (select id from test_ids where key = 'prod_retur'),
  'MASUK',
  15,
  20000::bigint,
  'restock setelah kirim',
  null
);

select public.gagal_kirim((select id from test_ids where key = 'order_retur'));

select is(
  (
    select masuk.harga_beli
    from public.stock_movements masuk
    where masuk.order_id = (select id from test_ids where key = 'order_retur')
      and masuk.jenis = 'MASUK'::stock_movement_type
  ),
  11000::bigint,
  'G6 retur MASUK memakai snapshot harga_beli KELUAR (11000)'
);

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_retur')),
  14857::bigint,
  'G6 HPP pool diperbarui round(520000/35) = 14857'
);

select is(
  (select saldo::bigint from public.v_stock_balance where product_id = (select id from test_ids where key = 'prod_retur')),
  35::bigint,
  'G6 saldo akhir 20 - 5 + 15 + 5 = 35'
);

-- --- G7: RLS negatif lintas usaha ---
select public.create_business('Toko M5 B', 'fashion', 'COD');

set local request.jwt.claims =
  '{"sub":"24242424-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (
    select count(*)::int
    from public.stock_movements
    where business_id = (select id from test_ids where key = 'biz_a')
  ),
  0,
  'G7 usaha B tidak melihat stock_movements usaha A'
);

select is(
  (
    select count(*)::int
    from public.v_stock_balance
    where business_id = (select id from test_ids where key = 'biz_a')
  ),
  0,
  'G7 usaha B tidak melihat v_stock_balance usaha A'
);

select throws_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_sosis'),
      'MASUK',
      1,
      1000::bigint,
      'selundupan',
      null
    )
  $$,
  '22023',
  'PRODUK_TIDAK_DITEMUKAN',
  'G7 usaha B tidak bisa menulis stok produk usaha A'
);

set local request.jwt.claims =
  '{"sub":"14141414-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select throws_ok(
  $$
    insert into public.stock_movements (business_id, product_id, jenis, qty, alasan)
    values (
      (select id from test_ids where key = 'biz_a'),
      (select id from test_ids where key = 'prod_sosis'),
      'MASUK',
      1,
      'langsung'
    )
  $$,
  '42501',
  'permission denied for table stock_movements',
  'G7 tulis langsung stock_movements ditolak'
);

select * from finish();
rollback;
