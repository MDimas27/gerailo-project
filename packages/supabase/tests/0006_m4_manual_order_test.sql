begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner-m4-order-a@test.local'),
  ('22222222-2222-4222-8222-222222222222', 'owner-m4-order-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M4 Order A', 'makanan', 'TRANSFER') $$,
  'create_business owner A'
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
  'create_product Sosis katalog'
);

insert into test_ids
select 'prod', id from public.products where nama = 'Sosis';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_manual', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 2,
        'harga_satuan', 30000
      )),
      5000,
      20000,
      'Rani',
      '0812-1111-2222',
      'Jl. Mawar 1',
      'Catatan manual',
      array['TRANSFER']::text[],
      null
    )
  $$,
  'create_manual_order menyimpan harga manual'
);

select is(
  (
    select status::text
    from public.orders
    where id = (select id from test_ids where key = 'order_manual')
  ),
  'DRAFT',
  'order manual awalnya DRAFT'
);

select is(
  (
    select nama
    from public.customers c
    join public.orders o
      on o.customer_id = c.id and o.business_id = c.business_id
    where o.id = (select id from test_ids where key = 'order_manual')
  ),
  'Rani',
  'create_manual_order membuat customer'
);

select is(
  (
    select harga_satuan::text
    from public.order_items
    where order_id = (select id from test_ids where key = 'order_manual')
  ),
  '30000',
  'harga manual dipakai, bukan harga katalog 25000'
);

select is(
  (
    select (o.ongkir + coalesce(sum(oi.qty::bigint * oi.harga_satuan), 0))::text
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    where o.id = (select id from test_ids where key = 'order_manual')
    group by o.ongkir
  ),
  '65000',
  'total server = 2x30000 + ongkir 5000'
);

select lives_ok(
  $$
    select public.confirm_order((select id from test_ids where key = 'order_manual'))
  $$,
  'confirm_order jalan untuk order manual'
);

select is(
  (
    select status::text
    from public.orders
    where id = (select id from test_ids where key = 'order_manual')
  ),
  'DIKONFIRMASI',
  'status order manual berubah ke DIKONFIRMASI'
);

select throws_ok(
  $$
    select public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 2,
        'harga_satuan', 30000
      )),
      5000,
      66000,
      'Rani',
      '0812-1111-2222',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  '22023',
  'DP_MELEBIHI_TOTAL',
  'DP melebihi total manual ditolak'
);

select throws_ok(
  $$
    select public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 2,
        'harga_satuan', 0
      )),
      0,
      0,
      'Rani',
      '0812-1111-2222',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  '22023',
  'ITEM_TIDAK_VALID',
  'harga satuan 0 ditolak'
);

select throws_ok(
  $$
    select public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 2,
        'harga_satuan', 30000,
        'total', 60000
      )),
      0,
      0,
      'Rani',
      '0812-1111-2222',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  '22023',
  'ITEM_TIDAK_VALID',
  'field tambahan pada item ditolak'
);

select throws_ok(
  $$
    select public.create_manual_order(
      jsonb_build_array(),
      0,
      0,
      'Rani',
      '0812-1111-2222',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  '22023',
  'ITEM_KOSONG',
  'order tanpa item ditolak'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_dedup', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 31000
      )),
      0,
      0,
      'Rani Updated',
      '0812.1111.2222',
      null,
      null,
      array['COD']::text[],
      null
    )
  $$,
  'create_manual_order dedup pelanggan oleh telepon'
);

select is(
  (
    select count(*)::text
    from public.customers
    where business_id = (select id from test_ids where key = 'biz_a')
      and telepon = '6281211112222'
  ),
  '1',
  'satu customer untuk telepon yang sama'
);

set local request.jwt.claims =
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';

select lives_ok(
  $$
    select public.create_business('Toko M4 Order B', 'fashion', 'TRANSFER')
  $$,
  'create_business owner B untuk uji lintas usaha'
);

select throws_ok(
  $$
    select public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      0,
      0,
      'Penyusup',
      '0813-9999-8888',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  '22023',
  'PRODUK_TIDAK_DITEMUKAN',
  'produk usaha lain ditolak'
);

set local role anon;

select throws_ok(
  $$
    select public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      0,
      0,
      'Anon',
      '0813-7777-6666',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  '42501',
  'permission denied for function create_manual_order',
  'anon tidak boleh memanggil create_manual_order'
);

select throws_ok(
  $$
    insert into public.orders (business_id, customer_id, ongkir, dp)
    values (
      (select id from test_ids where key = 'biz_a'),
      (select customer_id from public.orders
        where id = (select id from test_ids where key = 'order_manual')),
      0,
      0
    )
  $$,
  '42501',
  'permission denied for table orders',
  'insert orders langsung dari klien tetap ditolak RLS'
);

rollback;
