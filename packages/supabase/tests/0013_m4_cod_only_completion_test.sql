begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values ('aaaaaaaa-eeee-eeee-eeee-eeeeeeeeeeee', 'owner-auto-selesai@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-eeee-eeee-eeee-eeeeeeeeeeee","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko Auto Selesai', 'makanan', 'TRANSFER') $$,
  'create_business auto selesai'
);

insert into test_ids
select 'biz', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz'),
      'Sosis Auto Selesai',
      75000,
      0,
      array['sosis auto selesai'],
      20,
      55000
    )
  $$,
  'create_product stok 20'
);

insert into test_ids
select 'prod', id from public.products where nama = 'Sosis Auto Selesai';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_transfer', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 2,
        'harga_satuan', 75000
      )),
      15000,
      0,
      'Siti Transfer',
      '0812-1111-0201',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order transfer untuk pelunasan saat DIKIRIM'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_transfer')) $$,
  'confirm_order transfer'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_transfer'), null, null, 0::bigint) $$,
  'ship_order transfer'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_transfer'),
      'PELUNASAN',
      165000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan transfer penuh saat DIKIRIM'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_transfer')),
  'DIKIRIM'::order_status,
  'pelunasan transfer saat DIKIRIM TIDAK auto-SELESAI'
);

select is(
  (
    select count(*)::int
    from public.journal_entries
    where order_id = (select id from test_ids where key = 'order_transfer')
      and kejadian = 'T4'
  ),
  1,
  'T4 tetap dipost untuk pelunasan transfer'
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
      '0812-1111-0202',
      null,
      null,
      array['COD']::text[],
      null
    )
  $$,
  'order COD untuk auto selesai'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cod')) $$,
  'confirm_order COD'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_cod'), null, null, 0::bigint) $$,
  'ship_order COD'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_cod'),
      'COD',
      165000::bigint,
      'COD',
      null
    )
  $$,
  'catat COD diterima penuh'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_cod')),
  'SELESAI'::order_status,
  'COD tetap auto-SELESAI'
);

select is(
  (
    select count(*)::int
    from public.journal_entries
    where order_id = (select id from test_ids where key = 'order_cod')
      and kejadian = 'T5'
  ),
  1,
  'T5 COD tetap dipost sekali saat kirim'
);

select * from finish();
rollback;
