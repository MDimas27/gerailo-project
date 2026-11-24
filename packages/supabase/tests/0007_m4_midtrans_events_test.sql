begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

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
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'owner-m4-webhook-a@test.local'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'owner-m4-webhook-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko Midtrans A', 'makanan', 'TRANSFER') $$,
  'create_business owner Midtrans A'
);
insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz_a'),
      'Es Teh',
      25000,
      0,
      array['es teh'],
      0,
      null
    )
  $$,
  'create_product Es Teh untuk webhook test'
);
insert into test_ids
select 'prod', id from public.products where nama = 'Es Teh';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_expire', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Siti', '0812-1111-1111', null, null,
      array['QRIS']::text[], null
    )
  $$,
  'order untuk event expire'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_success', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Budi', '0812-2222-2222', null, null,
      array['QRIS']::text[], null
    )
  $$,
  'order untuk event sukses'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_cancel', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod'),
        'qty', 1,
        'harga_satuan', 25000
      )),
      5000, 0, 'Andi', '0812-3333-3333', null, null,
      array['QRIS']::text[], null
    )
  $$,
  'order untuk uji intent pada order batal'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_expire')) $$,
  'konfirmasi order expire'
);
select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_success')) $$,
  'konfirmasi order sukses'
);
select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cancel')) $$,
  'konfirmasi order batal'
);
select lives_ok(
  $$ select public.cancel_order((select id from test_ids where key = 'order_cancel')) $$,
  'batalkan order untuk uji intent'
);

select lives_ok(
  $$
    insert into test_text (key, value)
    select 'intent_expire', public.create_payment_intent(
      (select id from test_ids where key = 'order_expire'), 'PELUNASAN', 30
    ) ->> 'provider_order_id'
  $$,
  'create_payment_intent untuk order expire'
);

select lives_ok(
  $$
    insert into test_text (key, value)
    select 'intent_success', public.create_payment_intent(
      (select id from test_ids where key = 'order_success'), 'PELUNASAN', 30
    ) ->> 'provider_order_id'
  $$,
  'create_payment_intent untuk order sukses'
);

select is(
  (
    select amount::text
    from public.payment_intents
    where provider_order_id = (select value from test_text where key = 'intent_expire')
  ),
  '30000',
  'intent amount dihitung server = 25000 + ongkir 5000'
);

select is(
  (
    select status::text
    from public.payment_intents
    where provider_order_id = (select value from test_text where key = 'intent_expire')
  ),
  'PENDING',
  'intent awalnya PENDING'
);

select throws_ok(
  $$
    select public.create_payment_intent(
      (select id from test_ids where key = 'order_cancel'), 'PELUNASAN', 30
    )
  $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'intent ditolak untuk order BATAL'
);

select throws_ok(
  $$
    select public.create_payment_intent(
      (select id from test_ids where key = 'order_success'), 'PELUNASAN', 30,
      (select id from test_ids where key = 'biz_a')::text
    )
  $$,
  '42883',
  null,
  'create_payment_intent tidak menerima business_id dari client'
);

set local role service_role;
set local request.jwt.claims = '{"role":"service_role"}';

select throws_ok(
  $$ select * from public.payment_intents limit 1 $$,
  '42501',
  'permission denied for table payment_intents',
  'service_role tidak bisa SELECT langsung payment_intents'
);

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-expire-001',
      jsonb_build_object(
        'order_id', (select value from test_text where key = 'intent_expire'),
        'transaction_status', 'expire',
        'status_code', '400',
        'gross_amount', '30000.00'
      ),
      'VERIFIED'
    )
  $$,
  'log raw event expire'
);

select throws_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-expire-001', '{}'::jsonb, 'VERIFIED'
    )
  $$,
  '23505',
  null,
  'replay event_id ditolak oleh unique constraint'
);

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-unverified-001', '{}'::jsonb, 'UNVERIFIED'
    )
  $$,
  'log event dengan tanda tangan belum diverifikasi'
);

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-success-001',
      jsonb_build_object(
        'order_id', (select value from test_text where key = 'intent_success'),
        'transaction_status', 'settlement',
        'status_code', '200',
        'gross_amount', '30000.00'
      ),
      'VERIFIED'
    )
  $$,
  'log raw event sukses'
);

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-second-001', '{}'::jsonb, 'VERIFIED'
    )
  $$,
  'log event kedua untuk uji intent sudah PAID'
);

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-mismatch-001', '{}'::jsonb, 'VERIFIED'
    )
  $$,
  'log event nominal mismatch'
);

select lives_ok(
  $$
    select public.log_payment_event(
      'MIDTRANS', 'evt-invalid-001', '{}'::jsonb, 'INVALID'
    )
  $$,
  'log event tanda tangan invalid'
);

select throws_ok(
  $$ select * from public.payment_events limit 1 $$,
  '42501',
  'permission denied for table payment_events',
  'service_role tidak bisa SELECT langsung payment_events'
);

select throws_ok(
  $$ update public.payment_events set signature_status = 'VERIFIED' where event_id = 'evt-expire-001' $$,
  '42501',
  'permission denied for table payment_events',
  'payment_events append-only untuk service_role'
);

select throws_ok(
  $$
    select public.apply_payment_event(
      'evt-unverified-001',
      (select value from test_text where key = 'intent_success'),
      30000::bigint, 'settlement', '200', 'ACCEPT'
    )
  $$,
  '22023',
  'EVENT_BELUM_VERIFIED',
  'event UNVERIFIED tidak boleh diposting'
);

select throws_ok(
  $$
    select public.apply_payment_event(
      'evt-invalid-001',
      (select value from test_text where key = 'intent_success'),
      30000::bigint, 'settlement', '200', 'ACCEPT'
    )
  $$,
  '22023',
  'TANDA_TANGAN_TIDAK_VALID',
  'event INVALID tidak boleh diposting'
);

select throws_ok(
  $$
    select public.apply_payment_event(
      'evt-mismatch-001',
      (select value from test_text where key = 'intent_success'),
      99999::bigint, 'settlement', '200', 'ACCEPT'
    )
  $$,
  '22023',
  'NOMINAL_TIDAK_COCOK',
  'gross_amount harus sama dengan amount server-side'
);

select is(
  public.apply_payment_event(
    'evt-expire-001',
    (select value from test_text where key = 'intent_expire'),
    30000::bigint, 'expire', '400', null
  ),
  'IGNORED',
  'event expire menghasilkan IGNORED'
);

select is(
  (
    select status::text
    from public.payment_intents
    where provider_order_id = (select value from test_text where key = 'intent_expire')
  ),
  'EXPIRED',
  'intent expire berstatus EXPIRED'
);

select is(
  (
    select count(*)::bigint
    from public.payments
    where order_id = (select id from test_ids where key = 'order_expire')
  ),
  0::bigint,
  'event expire tidak membuat pembayaran'
);

select is(
  public.apply_payment_event(
    'evt-success-001',
    (select value from test_text where key = 'intent_success'),
    30000::bigint, 'settlement', '200', 'ACCEPT'
  ),
  'POSTED',
  'event settlement sukses diposting lewat _post_payment'
);

select is(
  (
    select jumlah::text
    from public.payments
    where order_id = (select id from test_ids where key = 'order_success')
  ),
  '30000',
  'pembayaran Midtrans tercatat BIGINT 30000'
);

select is(
  (
    select status::text
    from public.payment_intents
    where provider_order_id = (select value from test_text where key = 'intent_success')
  ),
  'PAID',
  'intent sukses berstatus PAID'
);

select is(
  public.apply_payment_event(
    'evt-success-001',
    (select value from test_text where key = 'intent_success'),
    30000::bigint, 'settlement', '200', 'ACCEPT'
  ),
  'POSTED',
  'replay event sukses mengembalikan outcome POSTED tanpa efek'
);

select is(
  (
    select count(*)::bigint
    from public.payments
    where order_id = (select id from test_ids where key = 'order_success')
  ),
  1::bigint,
  'replay tidak membuat pembayaran ganda'
);

select is(
  (
    select count(*)::bigint
    from public.payment_event_outcomes
    where event_id = 'evt-success-001'
  ),
  1::bigint,
  'outcome append-only hanya satu baris per event'
);

select throws_ok(
  $$
    select public.apply_payment_event(
      'evt-second-001',
      (select value from test_text where key = 'intent_success'),
      30000::bigint, 'settlement', '200', 'ACCEPT'
    )
  $$,
  '22023',
  'INTENT_TIDAK_AKTIF',
  'event kedua pada intent PAID ditolak'
);

select throws_ok(
  $$ select * from public.payment_event_outcomes limit 1 $$,
  '42501',
  'permission denied for table payment_event_outcomes',
  'service_role tidak bisa SELECT langsung payment_event_outcomes'
);

select throws_ok(
  $$
    insert into public.payment_event_outcomes (order_id, event_id, provider, outcome)
    values (
      (select id from test_ids where key = 'order_success'),
      'evt-direct-001', 'MIDTRANS', 'POSTED'
    )
  $$,
  '42501',
  'permission denied for table payment_event_outcomes',
  'service_role tidak bisa INSERT langsung outcome'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select throws_ok(
  $$ select * from public.payment_events limit 1 $$,
  '42501',
  'permission denied for table payment_events',
  'authenticated tidak bisa membaca raw event'
);

select throws_ok(
  $$
    select public.log_payment_event('MIDTRANS', 'evt-user-001', '{}'::jsonb, 'VERIFIED')
  $$,
  '42501',
  'permission denied for function log_payment_event',
  'authenticated tidak boleh log event'
);

select throws_ok(
  $$
    select public.apply_payment_event(
      'evt-success-001',
      (select value from test_text where key = 'intent_success'),
      30000::bigint, 'settlement', '200', 'ACCEPT'
    )
  $$,
  '42501',
  'permission denied for function apply_payment_event',
  'authenticated tidak boleh apply event'
);

select * from finish();
rollback;
