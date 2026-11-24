begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);
create temporary table test_text (
  key text primary key,
  value text not null
);

grant select, insert on test_ids to authenticated, anon, service_role;
grant select, insert on test_text to authenticated, anon, service_role;

insert into auth.users (id, email)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'owner-m4-verify@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko Midtrans Verifikasi', 'makanan', 'TRANSFER') $$,
  'create_business verifikasi webhook'
);
insert into test_ids
select 'biz', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz'),
      'Kopi Susu',
      25000,
      0,
      array['kopi susu'],
      0,
      null
    )
  $$,
  'create_product Kopi Susu'
);
insert into test_ids
select 'prod', id from public.products where nama = 'Kopi Susu';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Rani', '0812-4444-4444', null, null,
      array['QRIS']::text[], null
    )
  $$,
  'create order untuk verifikasi event'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order')) $$,
  'konfirmasi order verifikasi'
);

select lives_ok(
  $$
    insert into test_text (key, value)
    select 'intent', public.create_payment_intent(
      (select id from test_ids where key = 'order'), 'PELUNASAN', 30
    ) ->> 'provider_order_id'
  $$,
  'create_payment_intent untuk verifikasi'
);

select is(
  (
    select amount::text
    from public.payment_intents
    where provider_order_id = (select value from test_text where key = 'intent')
  ),
  '30000',
  'intent amount 30000 dari server'
);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-raw-verify-001',
      jsonb_build_object(
        'order_id', (select value from test_text where key = 'intent'),
        'transaction_status', 'settlement',
        'status_code', '200',
        'gross_amount', '30000.00'
      ),
      'UNVERIFIED'
    )
  $$,
  'raw event dicatat UNVERIFIED sebelum verifikasi tanda tangan'
);

select throws_ok(
  $$
    select public.apply_payment_event(
      'evt-raw-verify-001',
      (select value from test_text where key = 'intent'),
      30000::bigint, 'settlement', '200', 'ACCEPT'
    )
  $$,
  '22023',
  'EVENT_BELUM_VERIFIED',
  'event UNVERIFIED belum boleh diposting'
);

select throws_ok(
  $$ update public.payment_events set signature_status = 'VERIFIED' where event_id = 'evt-raw-verify-001' $$,
  '42501',
  'permission denied for table payment_events',
  'payload raw event tidak bisa diubah'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';

select throws_ok(
  $$ select public.mark_payment_event_verified('evt-raw-verify-001', 'VERIFIED') $$,
  '42501',
  'permission denied for function mark_payment_event_verified',
  'authenticated tidak boleh menandai verifikasi'
);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select lives_ok(
  $$ select public.mark_payment_event_verified('evt-raw-verify-001', 'VERIFIED') $$,
  'service_role mencatat hasil verifikasi secara append-only'
);

select lives_ok(
  $$ select public.mark_payment_event_verified('evt-raw-verify-001', 'VERIFIED') $$,
  'mark verifikasi idempoten'
);

select is(
  public.apply_payment_event(
    'evt-raw-verify-001',
    (select value from test_text where key = 'intent'),
    30000::bigint, 'settlement', '200', 'ACCEPT'
  ),
  'POSTED',
  'event terverifikasi diposting lewat core pembayaran'
);

set local role postgres;

select is(
  (
    select count(*)::int
    from public.payments p
    where p.order_id = (select id from test_ids where key = 'order')
      and p.kanal = 'MIDTRANS'
  ),
  1,
  'satu pembayaran MIDTRANS tercatat'
);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select throws_ok(
  $$ select * from public.payment_event_verifications limit 1 $$,
  '42501',
  'permission denied for table payment_event_verifications',
  'service_role tidak bisa SELECT langsung tabel verifikasi'
);

select is(
  public.apply_payment_event(
    'evt-raw-verify-001',
    (select value from test_text where key = 'intent'),
    30000::bigint, 'settlement', '200', 'ACCEPT'
  ),
  'POSTED',
  'replay event mengembalikan outcome yang sama'
);

rollback;
