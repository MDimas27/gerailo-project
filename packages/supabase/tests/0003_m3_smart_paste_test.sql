-- Test golden 0003: fondasi M3, RPC konfirmasi, kuota AI, consent, RLS.
begin;

create extension if not exists pgtap with schema extensions;

select plan(55);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('55555555-5555-5555-5555-555555555555', 'owner-m3-a@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'owner-m3-b@test.local');

-- --- Usaha A ---
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M3 A', 'makanan', 'TRANSFER') $$,
  'create_business M3 usaha A'
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
  'create_product Sosis'
);

insert into test_ids
select 'prod_a', id from public.products where nama = 'Sosis';

select is(
  (select harga_jual from public.products where id = (select id from test_ids where key = 'prod_a')),
  25000::bigint,
  'harga Sosis = 25000'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_a', public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 3
        )
      ),
      15000,
      50000,
      'Siti',
      '0812-8899-7766',
      'Jl. Melati',
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'confirm_draft_order membuat order A'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_a')),
  'DRAFT'::order_status,
  'order baru berstatus DRAFT'
);

select is(
  (select ongkir from public.orders where id = (select id from test_ids where key = 'order_a')),
  15000::bigint,
  'ongkir tersimpan dari input terkonfirmasi'
);

select is(
  (select dp from public.orders where id = (select id from test_ids where key = 'order_a')),
  50000::bigint,
  'DP tersimpan dari input terkonfirmasi'
);

select is(
  (
    select sum(qty * harga_satuan)::bigint
    from public.order_items
    where order_id = (select id from test_ids where key = 'order_a')
  ),
  75000::bigint,
  'total item dihitung server = 3 x 25000'
);

select is(
  (
    select harga_satuan
    from public.order_items
    where order_id = (select id from test_ids where key = 'order_a')
    limit 1
  ),
  25000::bigint,
  'harga_satuan diambil dari katalog, bukan klien'
);

select is(
  (select count(*) from public.customers where business_id = (select id from test_ids where key = 'biz_a')),
  1::bigint,
  'satu pelanggan dibuat'
);

select is(
  (select telepon from public.customers where business_id = (select id from test_ids where key = 'biz_a')),
  '6281288997766',
  'telepon dinormalisasi ke 628...'
);

select is(
  (select nomor from public.orders where id = (select id from test_ids where key = 'order_a')),
  'ORD-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-001',
  'nomor order harian pertama'
);

select is(
  (select length(share_token) from public.orders where id = (select id from test_ids where key = 'order_a')),
  32,
  'share_token 32 karakter hex'
);

select is(
  (select count(*) from public.stock_movements where order_id = (select id from test_ids where key = 'order_a')),
  0::bigint,
  'M3 belum menyentuh stok'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_b', public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 1
        )
      ),
      0,
      0,
      'Siti',
      '0812-8899-7766',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'konfirmasi kedua dengan telepon sama'
);

select is(
  (select count(*) from public.customers where business_id = (select id from test_ids where key = 'biz_a')),
  1::bigint,
  'pelanggan tidak dobel'
);

select is(
  (select count(*) from public.orders where business_id = (select id from test_ids where key = 'biz_a')),
  2::bigint,
  'dua order dibuat'
);

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 1,
          'harga', 1
        )
      ),
      0,
      0,
      'Siti',
      '0812-8899-7766'
    )
  $$,
  '22023',
  'HARGA_DARI_KLIEN_DITOLAK',
  'field harga dari klien ditolak'
);

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 1,
          'total', 1
        )
      ),
      0,
      0,
      'Siti',
      '0812-8899-7766'
    )
  $$,
  '22023',
  'HARGA_DARI_KLIEN_DITOLAK',
  'field total dari klien ditolak'
);

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 0
        )
      ),
      0,
      0,
      'Siti',
      '0812-8899-7766'
    )
  $$,
  '22023',
  'QTY_TIDAK_VALID',
  'qty 0 ditolak'
);

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 1
        )
      ),
      15000,
      999999999,
      'Siti',
      '0812-8899-7766'
    )
  $$,
  '22023',
  'DP_MELEBIHI_TOTAL',
  'DP melebihi total + ongkir ditolak'
);

-- --- Usaha B ---
set local request.jwt.claims =
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko M3 B', 'fashion', 'COD') $$,
  'create_business M3 usaha B'
);

insert into test_ids
select 'biz_b', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz_b'),
      'Produk B',
      20000
    )
  $$,
  'create_product usaha B'
);

insert into test_ids
select 'prod_b', id from public.products where nama = 'Produk B';

set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_b'),
          'qty', 1
        )
      ),
      0,
      0,
      'Siti',
      '0812-8899-7766'
    )
  $$,
  '22023',
  'PRODUK_TIDAK_DITEMUKAN',
  'usaha A tidak bisa memakai produk usaha B'
);

select is(
  (select count(*) from public.products where business_id = (select id from test_ids where key = 'biz_b')),
  0::bigint,
  'usaha A tidak melihat produk usaha B'
);

set local request.jwt.claims =
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

select is(
  (select count(*) from public.orders where business_id = (select id from test_ids where key = 'biz_a')),
  0::bigint,
  'usaha B tidak melihat order usaha A'
);

-- --- Anon ---
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

select throws_ok(
  $$
    select public.confirm_draft_order(
      jsonb_build_array(
        jsonb_build_object(
          'product_id', (select id from test_ids where key = 'prod_a'),
          'qty', 1
        )
      ),
      0,
      0,
      'Siti',
      '0812-8899-7766'
    )
  $$,
  '42501',
  'permission denied for function confirm_draft_order',
  'anon tidak bisa memanggil confirm_draft_order'
);

select throws_ok(
  $$ select count(*) from public.orders $$,
  '42501',
  'permission denied for table orders',
  'anon tidak bisa membaca orders'
);

reset role;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select throws_ok(
  $$
    insert into public.orders (business_id, customer_id, ongkir, dp)
    values (
      (select id from test_ids where key = 'biz_a'),
      (select id from public.customers where business_id = (select id from test_ids where key = 'biz_a') limit 1),
      0,
      0
    )
  $$,
  '42501',
  'permission denied for table orders',
  'INSERT orders langsung ditolak'
);

select throws_ok(
  $$
    insert into public.ai_usage_logs (business_id, sumber, skor)
    values ((select id from test_ids where key = 'biz_a'), 'AI', 0.5)
  $$,
  '42501',
  'permission denied for table ai_usage_logs',
  'INSERT ai_usage_logs langsung ditolak'
);

-- --- Kuota AI ---
select throws_ok(
  $$ select public.claim_ai_quota('glm', 10, 0.8) $$,
  'P0001',
  'AI_QUOTA_EXCEEDED',
  'paket FREE kuota AI = 0'
);

reset role;
update public.businesses
set plan = 'STARTER'
where id = (select id from test_ids where key = 'biz_a');
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select is(
  (select plan from public.businesses where id = (select id from test_ids where key = 'biz_a')),
  'STARTER',
  'plan usaha A di-upgrade ke STARTER'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'log_ai', public.claim_ai_quota('glm', 10, 0.8, 'chat rahasia')
  $$,
  'claim kuota AI tanpa consent'
);

select is(
  (select kuota_ai_terpakai from public.app_settings where business_id = (select id from test_ids where key = 'biz_a')),
  1,
  'kuota terpakai = 1'
);

select is(
  (select sumber from public.ai_usage_logs where id = (select id from test_ids where key = 'log_ai')),
  'AI',
  'sumber log = AI'
);

select is(
  (select token from public.ai_usage_logs where id = (select id from test_ids where key = 'log_ai')),
  10,
  'token tercatat = 10'
);

select is(
  (select simpan_teks from public.ai_usage_logs where id = (select id from test_ids where key = 'log_ai')),
  false,
  'tanpa consent teks asli tidak disimpan'
);

select is(
  (select teks_asli from public.ai_usage_logs where id = (select id from test_ids where key = 'log_ai')),
  null::text,
  'teks_asli null tanpa consent'
);

select lives_ok(
  $$
    update public.businesses
    set pdpr_consent_at = now()
    where id = (select id from test_ids where key = 'biz_a')
  $$,
  'consent PDP dipersist'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'log_ai2', public.claim_ai_quota('glm', 12, 0.9, 'chat rahasia')
  $$,
  'claim kuota AI setelah consent'
);

select is(
  (select teks_asli from public.ai_usage_logs where id = (select id from test_ids where key = 'log_ai2')),
  'chat rahasia',
  'teks asli disimpan setelah consent'
);

select is(
  (select simpan_teks from public.ai_usage_logs where id = (select id from test_ids where key = 'log_ai2')),
  true,
  'simpan_teks true setelah consent'
);

select is(
  (select kuota_ai_terpakai from public.app_settings where business_id = (select id from test_ids where key = 'biz_a')),
  2,
  'kuota terpakai = 2'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'log_parser', public.log_parser_extraction(0.75, 'chat parser')
  $$,
  'log ekstraksi parser pola'
);

select is(
  (select kuota_ai_terpakai from public.app_settings where business_id = (select id from test_ids where key = 'biz_a')),
  2,
  'log parser tidak menambah kuota AI'
);

select is(
  (select sumber from public.ai_usage_logs where id = (select id from test_ids where key = 'log_parser')),
  'PARSER',
  'sumber log = PARSER'
);

reset role;
update public.app_settings
set kuota_ai_periode = date '2020-01-01'
where business_id = (select id from test_ids where key = 'biz_a');
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'log_reset', public.claim_ai_quota('glm', 1, 0.5)
  $$,
  'claim setelah lazy reset periode'
);

select is(
  (select kuota_ai_terpakai from public.app_settings where business_id = (select id from test_ids where key = 'biz_a')),
  1,
  'kuota direset ke 1'
);

select is(
  (select kuota_ai_periode from public.app_settings where business_id = (select id from test_ids where key = 'biz_a')),
  date_trunc('month', now())::date,
  'periode direset ke bulan berjalan'
);

select lives_ok(
  $$ select public.mark_extraction_corrected((select id from test_ids where key = 'log_parser')) $$,
  'tandai ekstraksi dikoreksi'
);

select is(
  (select dikoreksi from public.ai_usage_logs where id = (select id from test_ids where key = 'log_parser')),
  true,
  'flag dikoreksi = true'
);

set local request.jwt.claims =
  '{"sub":"66666666-6666-6666-6666-666666666666","role":"authenticated"}';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'log_b', public.log_parser_extraction(0.5)
  $$,
  'usaha B membuat log parser sendiri'
);

set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select throws_ok(
  $$ select public.mark_extraction_corrected((select id from test_ids where key = 'log_b')) $$,
  '42501',
  'LOG_TIDAK_DITEMUKAN',
  'usaha A tidak bisa mengoreksi log usaha B'
);

reset role;
update public.app_settings
set kuota_ai_terpakai = 299
where business_id = (select id from test_ids where key = 'biz_a');
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}';

select lives_ok(
  $$ select public.claim_ai_quota('glm', 1, 0.5) $$,
  'claim ke-300 STARTER masih diterima'
);

select throws_ok(
  $$ select public.claim_ai_quota('glm', 1, 0.5) $$,
  'P0001',
  'AI_QUOTA_EXCEEDED',
  'claim ke-301 ditolak'
);

select * from finish();
rollback;
