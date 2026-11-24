begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner-m4-receive-a@test.local'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner-m4-receive-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M4 Receive A', 'makanan', 'TRANSFER') $$,
  'create_business receive order'
);

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz_a'),
      'Kopi Terima',
      25000,
      0,
      array['kopi terima'],
      0,
      null
    )
  $$,
  'create_product Kopi Terima'
);

insert into test_ids
select 'prod', id from public.products where nama = 'Kopi Terima';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'prepaid', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Rina', '0812-1111-1111', null, null,
      array['TRANSFER']::text[], null
    )
  $$,
  'create order prepaid lunas'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'prepaid')) $$,
  'confirm order prepaid'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'prepaid'),
      'PELUNASAN',
      30000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan prepaid dicatat'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'prepaid'), 'JNE', null) $$,
  'ship_order prepaid ke DIKIRIM'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'prepaid')),
  'DIKIRIM'::order_status,
  'status DIKIRIM setelah ship_order'
);

select lives_ok(
  $$ select public.receive_order((select id from test_ids where key = 'prepaid')) $$,
  'receive_order prepaid lunas DIKIRIM ke SELESAI'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'prepaid')),
  'SELESAI'::order_status,
  'status SELESAI setelah receive_order'
);

select is(
  (select count(*)::bigint from public.payments where order_id = (select id from test_ids where key = 'prepaid')),
  1::bigint,
  'receive_order tidak menambah pembayaran'
);

select throws_ok(
  $$ select public.receive_order((select id from test_ids where key = 'prepaid')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'receive_order dobel dari SELESAI ditolak'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'shortcut', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Budi', '0812-2222-2222', null, null,
      array['TRANSFER']::text[], null
    )
  $$,
  'create order shortcut'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'shortcut')) $$,
  'confirm order shortcut'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'shortcut'),
      'PELUNASAN',
      30000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan order shortcut'
);

select lives_ok(
  $$ select public.mark_ready((select id from test_ids where key = 'shortcut')) $$,
  'mark_ready order shortcut'
);

select throws_ok(
  $$ select public.receive_order((select id from test_ids where key = 'shortcut')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'receive_order dari SIAP_DIKIRIM ditolak'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'shortcut')),
  'SIAP_DIKIRIM'::order_status,
  'shortcut tetap SIAP_DIKIRIM'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'sisa', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Siti', '0812-3333-3333', null, null,
      array['TRANSFER']::text[], null
    )
  $$,
  'create order sisa'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'sisa')) $$,
  'confirm order sisa'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'sisa'),
      'DP',
      10000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP order sisa dicatat'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'sisa')) $$,
  'ship_order order sisa'
);

select throws_ok(
  $$ select public.receive_order((select id from test_ids where key = 'sisa')) $$,
  '22023',
  'MASIH ADA SISA — catat pelunasan dulu',
  'receive_order ditolak saat sisa lebih dari nol'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'sisa')),
  'DIKIRIM'::order_status,
  'order sisa tetap DIKIRIM'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'cod', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Andi', '0812-4444-4444', null, null,
      array['COD']::text[], null
    )
  $$,
  'create order COD'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'cod')) $$,
  'confirm order COD'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'cod')) $$,
  'ship_order order COD'
);

select throws_ok(
  $$ select public.receive_order((select id from test_ids where key = 'cod')) $$,
  '22023',
  'MASIH ADA SISA — catat pelunasan dulu',
  'receive_order ditolak untuk COD belum dicatat'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'cod')),
  'DIKIRIM'::order_status,
  'order COD tetap DIKIRIM'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'tenant', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Dewi', '0812-5555-5555', null, null,
      array['TRANSFER']::text[], null
    )
  $$,
  'create order tenant'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'tenant')) $$,
  'confirm order tenant'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'tenant'),
      'PELUNASAN',
      30000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan order tenant'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'tenant')) $$,
  'ship_order order tenant'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

select throws_ok(
  $$ select public.receive_order((select id from test_ids where key = 'tenant')) $$,
  '42501',
  'AKSES_DITOLAK',
  'receive_order lintas tenant ditolak'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'cancel_kirim', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Eko', '0812-6666-6666', null, null,
      array['TRANSFER']::text[], null
    )
  $$,
  'create order cancel kirim'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'cancel_kirim')) $$,
  'confirm order cancel kirim'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'cancel_kirim'),
      'PELUNASAN',
      30000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan order cancel kirim'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'cancel_kirim')) $$,
  'ship_order order cancel kirim'
);

select throws_ok(
  $$ select public.cancel_order((select id from test_ids where key = 'cancel_kirim')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'cancel_order di DIKIRIM ditolak'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'cancel_kirim')),
  'DIKIRIM'::order_status,
  'order cancel kirim tetap DIKIRIM'
);
