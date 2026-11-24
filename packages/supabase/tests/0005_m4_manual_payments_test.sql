begin;

create extension if not exists pgtap with schema extensions;

select plan(49);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('88888888-8888-8888-8888-888888888888', 'owner-m4-manual-a@test.local'),
  ('99999999-9999-9999-9999-999999999999', 'owner-m4-manual-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M4 Manual A', 'makanan', 'TRANSFER') $$,
  'create_business M4 manual usaha A'
);

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz_a'),
      'Sosis',
      25000,
      0,
      array['sosis'],
      0,
      null
    )
  $$,
  'create_product Sosis untuk test M4 manual'
);

insert into test_ids
select 'prod', id from public.products where nama = 'Sosis';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_siti', public.confirm_draft_order(
      jsonb_build_array(jsonb_build_object('product_id', (select id from test_ids where key = 'prod'), 'qty', 3)),
      15000,
      50000,
      'Siti',
      '0812-8899-7766',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order Siti DRAFT untuk alur DP + pelunasan'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_full', public.confirm_draft_order(
      jsonb_build_array(jsonb_build_object('product_id', (select id from test_ids where key = 'prod'), 'qty', 2)),
      0,
      0,
      'Budi',
      '0812-7777-6666',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order pelunasan penuh sekali bayar'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_cod', public.confirm_draft_order(
      jsonb_build_array(jsonb_build_object('product_id', (select id from test_ids where key = 'prod'), 'qty', 1)),
      0,
      0,
      'Andi',
      '0812-6666-5555',
      null,
      null,
      array['COD']::text[],
      null
    )
  $$,
  'order COD tanpa DP'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_dua_dp', public.confirm_draft_order(
      jsonb_build_array(jsonb_build_object('product_id', (select id from test_ids where key = 'prod'), 'qty', 4)),
      0,
      0,
      'Dewi',
      '0812-5555-4444',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order dua DP parsial'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_cancel', public.confirm_draft_order(
      jsonb_build_array(jsonb_build_object('product_id', (select id from test_ids where key = 'prod'), 'qty', 1)),
      0,
      0,
      'Eka',
      '0812-4444-3333',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order batal sebelum kirim'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_illegal', public.confirm_draft_order(
      jsonb_build_array(jsonb_build_object('product_id', (select id from test_ids where key = 'prod'), 'qty', 1)),
      0,
      0,
      'Fajar',
      '0812-3333-2222',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order transisi ilegal SELESAI ke DIKIRIM'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DRAFT'::order_status,
  'baseline order Siti DRAFT'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_siti')) $$,
  'confirm_order DRAFT ke DIKONFIRMASI'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DIKONFIRMASI'::order_status,
  'status DIKONFIRMASI setelah confirm_order'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_siti'),
      'DP',
      50000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP manual 50000 diterima'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DP_DITERIMA'::order_status,
  'DP mengubah status ke DP_DITERIMA'
);

select is(
  (select coalesce(sum(jumlah), 0)::bigint from public.payments where order_id = (select id from test_ids where key = 'order_siti')),
  50000::bigint,
  'jumlah pembayaran Siti setelah DP = 50000'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_siti'),
      'PELUNASAN',
      40000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan manual 40000 diterima'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DP_DITERIMA'::order_status,
  'pelunasan penuh belum mengubah status sebelum pengiriman'
);

select is(
  (select coalesce(sum(jumlah), 0)::bigint from public.payments where order_id = (select id from test_ids where key = 'order_siti')),
  90000::bigint,
  'total pembayaran Siti = 90000 (3 x 25000 + ongkir 15000)'
);

select throws_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_siti'),
      'PELUNASAN',
      1::bigint,
      'MANUAL',
      null
    )
  $$,
  '22023',
  'PEMBAYARAN_MELEBIHI_TOTAL',
  'pembayaran melebihi sisa ditolak'
);

select lives_ok(
  $$ select public.mark_ready((select id from test_ids where key = 'order_siti')) $$,
  'mark_ready dari DP_DITERIMA ke SIAP_DIKIRIM'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'SIAP_DIKIRIM'::order_status,
  'status SIAP_DIKIRIM'
);

select lives_ok(
  $$ select public.complete_order((select id from test_ids where key = 'order_siti'), 'JNE', null) $$,
  'complete_order status-only ke DIKIRIM'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DIKIRIM'::order_status,
  'status DIKIRIM setelah complete_order slice 1'
);

select lives_ok(
  $$
    select public.set_shipping(
      (select id from test_ids where key = 'order_siti'),
      'JNE',
      'RESI001'
    )
  $$,
  'set_shipping menyimpan resi'
);

select is(
  (select nomor_resi from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'RESI001',
  'nomor resi tersimpan'
);

select is(
  (select count(*)::bigint from public.payments where order_id = (select id from test_ids where key = 'order_siti')),
  2::bigint,
  'set_shipping tidak menambah pembayaran'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cancel')) $$,
  'confirm_order untuk order batal'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_cancel'),
      'DP',
      10000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP dicatat sebelum batal'
);

select lives_ok(
  $$ select public.cancel_order((select id from test_ids where key = 'order_cancel')) $$,
  'cancel_order sebelum kirim'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_cancel')),
  'BATAL'::order_status,
  'status BATAL setelah cancel_order'
);

select is(
  (select count(*)::bigint from public.payments where order_id = (select id from test_ids where key = 'order_cancel')),
  1::bigint,
  'riwayat pembayaran tetap ada saat batal'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_full')) $$,
  'confirm_order pelunasan penuh sekali bayar'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_full'),
      'PELUNASAN',
      50000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan penuh 50000 diterima sekali bayar'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_full')),
  'DP_DITERIMA'::order_status,
  'pelunasan penuh sekali bayar menempati DP_DITERIMA'
);

select is(
  (select coalesce(sum(jumlah), 0)::bigint from public.payments where order_id = (select id from test_ids where key = 'order_full')),
  50000::bigint,
  'total pembayaran penuh = 50000'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cod')) $$,
  'confirm_order COD tanpa DP'
);

select lives_ok(
  $$ select public.mark_ready((select id from test_ids where key = 'order_cod')) $$,
  'COD tanpa DP langsung mark_ready, DP_DITERIMA diskip'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_cod')),
  'SIAP_DIKIRIM'::order_status,
  'COD tanpa DP berstatus SIAP_DIKIRIM tanpa DP_DITERIMA'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_dua_dp')) $$,
  'confirm_order dua DP parsial'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_dua_dp'),
      'DP',
      40000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP pertama 40000'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_dua_dp'),
      'DP',
      60000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP kedua 60000'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_dua_dp')),
  'DP_DITERIMA'::order_status,
  'dua DP parsial tetap DP_DITERIMA'
);

select is(
  (select coalesce(sum(jumlah), 0)::bigint from public.payments where order_id = (select id from test_ids where key = 'order_dua_dp')),
  100000::bigint,
  'dua DP parsial akumulasi menjadi 100000'
);

select throws_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_dua_dp')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'confirm_order kedua ditolak'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M4 Manual B', 'makanan', 'TRANSFER') $$,
  'create_business M4 manual usaha B'
);

select throws_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_siti')) $$,
  '42501',
  'AKSES_DITOLAK',
  'usaha B tidak bisa mengubah order usaha A'
);

set local role anon;
set local request.jwt.claims = '{}';

select throws_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_siti'),
      'DP',
      1000::bigint,
      'MANUAL',
      null
    )
  $$,
  '42501',
  'AUTH_REQUIRED',
  'anon tidak bisa mencatat pembayaran'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';

select throws_ok(
  $$
    update public.orders
    set status = 'DIKIRIM'
    where id = (select id from test_ids where key = 'order_full')
  $$,
  '42501',
  'permission denied for table orders',
  'UPDATE langsung orders ditolak'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_illegal')) $$,
  'confirm_order order untuk uji transisi ilegal'
);

set local role postgres;
update public.orders
set status = 'SELESAI'
where id = (select id from test_ids where key = 'order_illegal');
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"88888888-8888-8888-8888-888888888888","role":"authenticated"}';

select throws_ok(
  $$ select public.complete_order((select id from test_ids where key = 'order_illegal')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'SELESAI ke DIKIRIM ditolak'
);

select * from finish();
rollback;
