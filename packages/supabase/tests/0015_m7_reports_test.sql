-- Test golden 0015: M7 laporan — v_pnl_bulan, v_arus_kas, v_piutang_ump + RLS.
-- Fixture diturunkan dari docs/ACCOUNTING-RULES.md (Siti) + docs/MODULES/M7-REPORTS.md.
-- Pin kode akun: piutang 1-1030, UMP 2-2010, kas 1-1010, bank 1-1020.
-- RED proof: views belum ada saat file ini pertama dijalankan (relation does not exist).
begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('15151515-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner-m7-a@test.local'),
  ('25252525-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner-m7-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"15151515-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select public.create_business('Toko M7 A', 'makanan', 'TRANSFER');

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

select public.create_product(
  (select id from test_ids where key = 'biz_a'),
  'Sosis M7',
  75000,
  0,
  array['sosis m7'],
  3,
  55000
);

insert into test_ids
select 'prod_sosis', id from public.products where nama = 'Sosis M7';

-- --- Order Siti: 3x75.000 + ongkir 15.000, DP 100.000, kirim, lunas 140.000 ---
insert into test_ids (key, id)
select 'order_siti', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from test_ids where key = 'prod_sosis'),
    'qty', 3,
    'harga_satuan', 75000
  )),
  15000,
  100000,
  'Siti M7',
  '0812-3333-0001',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select public.confirm_order((select id from test_ids where key = 'order_siti'));

select public.record_payment(
  (select id from test_ids where key = 'order_siti'),
  'DP',
  100000::bigint,
  'MANUAL',
  null
);

select public.ship_order((select id from test_ids where key = 'order_siti'), 'JNE', null, 0::bigint);

-- --- G1: laba rugi bulanan (akrual) ---
select is(
  (select pendapatan::bigint from public.v_pnl_bulan
   where business_id = (select id from test_ids where key = 'biz_a')
     and bulan = date_trunc('month', now())::date),
  240000::bigint,
  'G1 pendapatan bulan berjalan 240000'
);

select is(
  (select hpp::bigint from public.v_pnl_bulan
   where business_id = (select id from test_ids where key = 'biz_a')
     and bulan = date_trunc('month', now())::date),
  165000::bigint,
  'G1 HPP bulan berjalan 165000'
);

select is(
  (select laba_kotor::bigint from public.v_pnl_bulan
   where business_id = (select id from test_ids where key = 'biz_a')
     and bulan = date_trunc('month', now())::date),
  75000::bigint,
  'G1 laba kotor bulan berjalan 75000'
);

select is(
  (select beban::bigint from public.v_pnl_bulan
   where business_id = (select id from test_ids where key = 'biz_a')
     and bulan = date_trunc('month', now())::date),
  0::bigint,
  'G1 beban bulan berjalan 0 (tanpa T9 di fixture)'
);

-- --- G3: piutang tampil saat DIKIRIM belum lunas (kode 1-1030) ---
select is(
  (select piutang::bigint from public.v_piutang_ump
   where order_id = (select id from test_ids where key = 'order_siti')),
  140000::bigint,
  'G3 piutang 140000 saat belum lunas'
);

-- --- pelunasan non-COD: tetap DIKIRIM, lalu diterima ---
select public.record_payment(
  (select id from test_ids where key = 'order_siti'),
  'PELUNASAN',
  140000::bigint,
  'MANUAL',
  null
);

select public.receive_order((select id from test_ids where key = 'order_siti'));

-- --- G1 tetap: pelunasan tidak mengubah pendapatan/HPP ---
select is(
  (select pendapatan::bigint from public.v_pnl_bulan
   where business_id = (select id from test_ids where key = 'biz_a')
     and bulan = date_trunc('month', now())::date),
  240000::bigint,
  'G1 pelunasan tidak mengubah pendapatan'
);

-- --- G3 final: piutang 0, UMP 0 (sudah dikonsumsi saat kirim) ---
select is(
  (select piutang::bigint from public.v_piutang_ump
   where order_id = (select id from test_ids where key = 'order_siti')),
  0::bigint,
  'G3 piutang 0 setelah lunas'
);

select is(
  (select uang_muka::bigint from public.v_piutang_ump
   where order_id = (select id from test_ids where key = 'order_siti')),
  0::bigint,
  'G3 UMP 0 untuk order Siti yang sudah dikirim'
);

-- --- G2: arus kas metode langsung, hanya 1-1010/1-1020 ---
select is(
  (select coalesce(sum(masuk), 0)::bigint from public.v_arus_kas
   where business_id = (select id from test_ids where key = 'biz_a')
     and tanggal = current_date),
  240000::bigint,
  'G2 kas masuk 240000 (T1 100000 + T4 140000)'
);

select is(
  (select coalesce(sum(keluar), 0)::bigint from public.v_arus_kas
   where business_id = (select id from test_ids where key = 'biz_a')
     and tanggal = current_date),
  0::bigint,
  'G2 kas keluar 0 di fixture'
);

select is(
  (select count(*)::int from public.v_arus_kas
   where business_id = (select id from test_ids where key = 'biz_a')
     and tanggal = current_date
     and akun_kode not in ('1-1010', '1-1020')),
  0,
  'G2 tidak ada akun non-kas/bank di arus kas'
);

-- --- G3: UMP menggantung tampil TERPISAH dari piutang ---
insert into test_ids (key, id)
select 'order_dp', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from test_ids where key = 'prod_sosis'),
    'qty', 1,
    'harga_satuan', 75000
  )),
  0,
  50000,
  'Budi M7',
  '0812-3333-0002',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select public.confirm_order((select id from test_ids where key = 'order_dp'));

select public.record_payment(
  (select id from test_ids where key = 'order_dp'),
  'DP',
  50000::bigint,
  'MANUAL',
  null
);

select is(
  (select uang_muka::bigint from public.v_piutang_ump
   where order_id = (select id from test_ids where key = 'order_dp')),
  50000::bigint,
  'G3 UMP 50000 menggantung (order belum dikirim)'
);

select is(
  (select piutang::bigint from public.v_piutang_ump
   where order_id = (select id from test_ids where key = 'order_dp')),
  0::bigint,
  'G3 piutang 0 untuk order yang belum dikirim'
);

select is(
  (select customer_nama from public.v_piutang_ump
   where order_id = (select id from test_ids where key = 'order_dp')),
  'Budi M7',
  'G3 breakdown pelanggan: nama tersedia'
);

-- --- G6: RLS negatif lintas usaha ---
select public.create_business('Toko M7 B', 'fashion', 'COD');

set local request.jwt.claims =
  '{"sub":"25252525-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.v_pnl_bulan
   where business_id = (select id from test_ids where key = 'biz_a')),
  0,
  'G6 usaha B tidak melihat v_pnl_bulan usaha A'
);

select is(
  (select count(*)::int from public.v_arus_kas
   where business_id = (select id from test_ids where key = 'biz_a')),
  0,
  'G6 usaha B tidak melihat v_arus_kas usaha A'
);

select is(
  (select count(*)::int from public.v_piutang_ump
   where business_id = (select id from test_ids where key = 'biz_a')),
  0,
  'G6 usaha B tidak melihat v_piutang_ump usaha A'
);

select * from finish();
rollback;
