begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('eeeeeeee-cccc-cccc-cccc-cccccccccccc', 'owner-gagal-kirim-a@test.local'),
  ('ffffffff-dddd-dddd-dddd-dddddddddddd', 'owner-gagal-kirim-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"eeeeeeee-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}';

select has_function(
  'public',
  'gagal_kirim',
  array['uuid'],
  'gagal_kirim tersedia'
);

select lives_ok(
  $$ select public.create_business('Toko Gagal Kirim', 'makanan', 'TRANSFER') $$,
  'create_business gagal kirim'
);

insert into test_ids
select 'biz', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz'),
      'Sosis Gagal Kirim',
      75000,
      0,
      array['sosis gagal kirim'],
      10,
      55000
    )
  $$,
  'create_product dengan stok awal 10'
);

insert into test_ids
select 'prod', id from public.products where nama = 'Sosis Gagal Kirim';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_prepaid', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 3,
        'harga_satuan', 75000
      )),
      15000,
      100000,
      'Siti Gagal Kirim',
      '0812-1111-0099',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order prepaid untuk gagal kirim'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_prepaid')) $$,
  'confirm_order prepaid'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_prepaid'),
      'DP',
      100000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP prepaid dicatat'
);

select lives_ok(
  $$
    select public.ship_order(
      (select id from test_ids where key = 'order_prepaid'),
      'JNE',
      null,
      0::bigint
    )
  $$,
  'ship_order prepaid memposting T2+T3'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_prepaid')),
  'DIKIRIM'::order_status,
  'status prepaid DIKIRIM setelah kirim'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_prepaid'),
      'PELUNASAN',
      140000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan prepaid saat DIKIRIM dicatat'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_prepaid')),
  'DIKIRIM'::order_status,
  'pelunasan non-COD tidak auto-SELESAI'
);

select lives_ok(
  $$ select public.gagal_kirim((select id from test_ids where key = 'order_prepaid')) $$,
  'gagal_kirim prepaid berhasil'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_prepaid')),
  'BATAL'::order_status,
  'gagal_kirim memindahkan DIKIRIM ke BATAL'
);

select is(
  (
    select count(*)::int
    from public.journal_entries
    where order_id = (select id from test_ids where key = 'order_prepaid')
      and reversi_dari_id is not null
  ),
  3,
  'reversi penuh T2+T3+T4; T1 tetap sebagai liabilitas DP'
);

select is(
  (
    select count(*)::int
    from (
      select a.kode, sum(jl.debit - jl.kredit) as net
      from public.journal_lines jl
      join public.journal_entries je on je.id = jl.entry_id
      join public.accounts a on a.id = jl.account_id
      where je.order_id = (select id from test_ids where key = 'order_prepaid')
        and a.kode not in ('1-1010', '1-1020', '2-2010')
      group by a.kode
      having sum(jl.debit - jl.kredit) <> 0
    ) sisa
  ),
  0,
  'round-trip net-0 di akun pendapatan/HPP/piutang/beban'
);

select is(
  (select pendapatan::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz') and tanggal = current_date),
  0::bigint,
  'pendapatan hantu hilang dari rekap harian'
);

select is(
  (select hpp::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz') and tanggal = current_date),
  0::bigint,
  'HPP hantu hilang dari rekap harian'
);

select is(
  (select piutang::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz') and tanggal = current_date),
  0::bigint,
  'piutang kembali nol'
);

select is(
  (select uang_muka::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz') and tanggal = current_date),
  100000::bigint,
  'uang muka DP tetap sebagai liabilitas sampai direfund'
);

select is(
  (select beban::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz') and tanggal = current_date),
  0::bigint,
  'beban tetap nol'
);

select is(
  (select kas_masuk::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz') and tanggal = current_date),
  100000::bigint,
  'kas DP masih tercatat sebagai liabilitas sampai direfund'
);

select is(
  (
    select count(*)::int
    from public.stock_movements
    where order_id = (select id from test_ids where key = 'order_prepaid')
      and jenis = 'MASUK'::stock_movement_type
  ),
  1,
  'pengembalian stok dicatat sekali sebagai MASUK'
);

select is(
  (select coalesce(sum(qty), 0)::bigint from public.stock_movements where product_id = (select id from test_ids where key = 'prod')),
  10::bigint,
  'stok tersedia kembali ke 10 setelah round-trip'
);

select is(
  (
    select count(*)::int
    from public.stock_movements
    where order_id = (select id from test_ids where key = 'order_prepaid')
      and jenis = 'KELUAR'::stock_movement_type
  ),
  1,
  'baris KELUAR lama tetap ada (immutable)'
);

select throws_ok(
  $$ select public.gagal_kirim((select id from test_ids where key = 'order_prepaid')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'gagal_kirim kedua kali ditolak'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_cod', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 2,
        'harga_satuan', 75000
      )),
      15000,
      0,
      'Budi COD',
      '0812-1111-0100',
      null,
      null,
      array['COD']::text[],
      null
    )
  $$,
  'order COD untuk gagal kirim'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cod')) $$,
  'confirm_order COD'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_cod'), null, null, 0::bigint) $$,
  'ship_order COD memposting T5+T3'
);

select lives_ok(
  $$ select public.gagal_kirim((select id from test_ids where key = 'order_cod')) $$,
  'gagal_kirim COD berhasil'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_cod')),
  'BATAL'::order_status,
  'COD gagal kirim tidak menggantung di DIKIRIM'
);

select is(
  (
    select count(*)::int
    from public.journal_entries
    where order_id = (select id from test_ids where key = 'order_cod')
      and reversi_dari_id is not null
  ),
  2,
  'reversi penuh T5+T3 pada COD'
);

select is(
  (
    select count(*)::int
    from (
      select a.kode, sum(jl.debit - jl.kredit) as net
      from public.journal_lines jl
      join public.journal_entries je on je.id = jl.entry_id
      join public.accounts a on a.id = jl.account_id
      where je.order_id = (select id from test_ids where key = 'order_cod')
        and a.kode not in ('1-1010', '1-1020', '2-2010')
      group by a.kode
      having sum(jl.debit - jl.kredit) <> 0
    ) sisa
  ),
  0,
  'COD round-trip net-0 di semua akun non-kas'
);

select is(
  (select coalesce(sum(qty), 0)::bigint from public.stock_movements where product_id = (select id from test_ids where key = 'prod')),
  10::bigint,
  'stok COD kembali ke 10 setelah round-trip'
);

select public.create_product(
  (select id from test_ids where key = 'biz'),
  'Sosis Snapshot HPP',
  75000,
  0,
  array['sosis snapshot hpp'],
  10,
  50000
);

insert into test_ids
select 'prod_snapshot', id from public.products where nama = 'Sosis Snapshot HPP';

insert into test_ids (key, id)
select 'order_snapshot', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from test_ids where key = 'prod_snapshot'),
    'qty', 1,
    'harga_satuan', 75000
  )),
  0,
  0,
  'Siti Snapshot HPP',
  '0812-1111-0102',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select public.confirm_order((select id from test_ids where key = 'order_snapshot'));
select public.ship_order((select id from test_ids where key = 'order_snapshot'), null, null, 0::bigint);
select public.record_stock_move(
  (select id from test_ids where key = 'prod_snapshot'),
  'MASUK',
  10,
  80000,
  'pembelian setelah kirim',
  null
);

select public.gagal_kirim((select id from test_ids where key = 'order_snapshot'));

select is(
  (
    select masuk.harga_beli
    from public.stock_movements masuk
    where masuk.order_id = (select id from test_ids where key = 'order_snapshot')
      and masuk.jenis = 'MASUK'::stock_movement_type
  ),
  (
    select keluar.harga_beli
    from public.stock_movements keluar
    where keluar.order_id = (select id from test_ids where key = 'order_snapshot')
      and keluar.jenis = 'KELUAR'::stock_movement_type
  ),
  'snapshot HPP pengembalian = harga_beli KELUAR saat barang dikirim'
);

select isnt(
  (
    select masuk.harga_beli
    from public.stock_movements masuk
    where masuk.order_id = (select id from test_ids where key = 'order_snapshot')
      and masuk.jenis = 'MASUK'::stock_movement_type
  ),
  (select hpp_rata_rata from public.products where id = (select id from test_ids where key = 'prod_snapshot')),
  'snapshot HPP pengembalian BUKAN moving average saat gagal_kirim'
);

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz'),
      'Sosis Stok Kurang',
      75000,
      0,
      array['sosis stok kurang'],
      1,
      55000
    )
  $$,
  'create_product dengan stok hanya 1'
);

insert into test_ids
select 'prod_kurang', id from public.products where nama = 'Sosis Stok Kurang';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_kurang', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_kurang'),
        'qty', 2,
        'harga_satuan', 75000
      )),
      0,
      0,
      'Siti Stok Kurang',
      '0812-1111-0101',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order qty 2 dibuat meski stok hanya 1'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_kurang')) $$,
  'confirm_order stok kurang'
);

select throws_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_kurang'), null, null, 0::bigint) $$,
  '22023',
  'STOK_TIDAK_CUKUP: Sosis Stok Kurang — tersedia 1, butuh 2',
  'ship_order menolak stok kurang dengan pesan jelas'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_kurang')),
  'DIKONFIRMASI'::order_status,
  'status tetap DIKONFIRMASI saat stok kurang'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_kurang')),
  0,
  'stok kurang tidak memposting jurnal'
);

set local request.jwt.claims =
  '{"sub":"ffffffff-dddd-dddd-dddd-dddddddddddd","role":"authenticated"}';

select throws_ok(
  $$ select public.gagal_kirim((select id from test_ids where key = 'order_prepaid')) $$,
  '42501',
  'AKSES_DITOLAK',
  'gagal_kirim menolak owner usaha lain'
);

select * from finish();
rollback;
