begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('77777777-7777-7777-7777-777777777777', 'owner-m4-metode@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"77777777-7777-7777-7777-777777777777","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko Metode', 'makanan', 'TRANSFER') $$,
  'create_business untuk test metode bayar'
);

insert into test_ids
select 'biz', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz'),
      'Sosis',
      25000,
      0,
      array['sosis'],
      0,
      null
    )
  $$,
  'create_product untuk test metode bayar'
);

insert into test_ids
select 'prod', id from public.products where nama = 'Sosis';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order', public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod'),
          'qty', 2
        )
      ),
      0,
      0,
      'Budi',
      '0812-9999-8888',
      null,
      null,
      array['TRANSFER', 'cod', 'COD']::text[],
      null
    )
  $$,
  'confirm_draft_order menerima beberapa metode bayar'
);

select is(
  (
    select metode_bayar
    from public.orders
    where id = (select id from test_ids where key = 'order')
  ),
  array['COD','TRANSFER']::text[],
  'metode bayar disimpan unik, uppercase, terurut'
);

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod'),
          'qty', 1
        )
      ),
      0,
      0,
      'Budi',
      '0812-9999-8888',
      null,
      null,
      array['TRANSFER', 'COD', 'QRIS', 'LAINNYA', 'COD']::text[],
      null
    )
  $$,
  '22023',
  'METODE_BAYAR_TIDAK_VALID',
  'lebih dari empat metode unik ditolak'
);

rollback;
