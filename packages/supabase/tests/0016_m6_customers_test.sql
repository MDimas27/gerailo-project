-- Test golden 0016: M6 pelanggan — RPC CRUD/arsip, dedup, FK, RLS.
-- RED proof: kolom `aktif` + RPC belum ada saat file ini pertama dijalankan.
-- Label: G1-G5/G12/G14 RED asli; G6/G7/G8 re-pin perilaku lama.
begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

grant select, insert on test_ids to authenticated, anon;

insert into auth.users (id, email)
values
  ('16161616-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner-m6-a@test.local'),
  ('26262626-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner-m6-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"16161616-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select public.create_business('Toko M6 A', 'makanan', 'TRANSFER');

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

-- --- G1: upsert baru + normalisasi telepon ---
insert into test_ids (key, id)
select 'siti', public.upsert_customer(
  'Siti', '0812-1111-0001', 'Jl. Melati 1', 'langganan sambal'
);

select is(
  (select telepon from public.customers where id = (select id from test_ids where key = 'siti')),
  '6281211110001',
  'G1 telepon ternormalisasi 628…'
);

select is(
  (select aktif from public.customers where id = (select id from test_ids where key = 'siti')),
  true,
  'G1 pelanggan baru default aktif=true'
);

-- --- G2: duplikat telepon beda format (termasuk arsip) ---
select throws_ok(
  $$ select public.upsert_customer('Siti Kembar', '+62 812-1111-0001') $$,
  '22023',
  'TELEPON_TERDAFTAR',
  'G2 duplikat telepon beda format ditolak'
);

insert into test_ids (key, id)
select 'budi', public.upsert_customer('Budi', '0812-2222-0002');

-- --- G3: update (profil & telepon) ---
select throws_ok(
  $$
    select public.update_customer(
      (select id from test_ids where key = 'budi'),
      'Budi',
      '0812-1111-0001'
    )
  $$,
  '22023',
  'TELEPON_TERDAFTAR',
  'G3 update ke telepon existing ditolak'
);

select lives_ok(
  $$
    select public.update_customer(
      (select id from test_ids where key = 'siti'),
      'Siti Rahma',
      '0812-1111-0001',
      'Jl. Melati 2',
      'catatan baru'
    )
  $$,
  'G3 update profil pelanggan berhasil'
);

select is(
  (select nama from public.customers where id = (select id from test_ids where key = 'siti')),
  'Siti Rahma',
  'G3 nama ter-update'
);

select lives_ok(
  $$
    select public.update_customer(
      (select id from test_ids where key = 'budi'),
      'Budi',
      '0813-3333-0003'
    )
  $$,
  'G3b update telepon ke nomor unik berhasil'
);

select is(
  (select telepon from public.customers where id = (select id from test_ids where key = 'budi')),
  '6281333330003',
  'G3b telepon baru tersimpan ternormalisasi'
);

-- --- G12: validasi catatan > 500 ---
select throws_ok(
  $$
    select public.update_customer(
      (select id from test_ids where key = 'siti'),
      'Siti Rahma',
      '0812-1111-0001',
      null,
      repeat('x', 501)
    )
  $$,
  '22023',
  'CATATAN_TERLALU_PANJANG',
  'G12 catatan > 500 ditolak RPC'
);

-- --- G4: arsip + reaktivasi ---
select lives_ok(
  $$ select public.set_customer_aktif((select id from test_ids where key = 'siti'), false) $$,
  'G4 arsip pelanggan'
);

select is(
  (select aktif from public.customers where id = (select id from test_ids where key = 'siti')),
  false,
  'G4 aktif=false setelah arsip'
);

select throws_ok(
  $$ select public.upsert_customer('Siti Arsip', '0812-1111-0001') $$,
  '22023',
  'TELEPON_TERDAFTAR',
  'G2b telepon pelanggan arsip tetap unik'
);

select lives_ok(
  $$ select public.set_customer_aktif((select id from test_ids where key = 'siti'), true) $$,
  'G4 reaktivasi pelanggan'
);

select is(
  (select aktif from public.customers where id = (select id from test_ids where key = 'siti')),
  true,
  'G4 aktif=true setelah reaktivasi'
);

-- --- G5: hapus keras pelanggan tanpa order ---
select lives_ok(
  $$ select public.hapus_customer((select id from test_ids where key = 'budi')) $$,
  'G5 hapus pelanggan tanpa order berhasil'
);

select is(
  (select count(*)::int from public.customers where nama = 'Budi'),
  0,
  'G5 pelanggan tanpa order benar-benar terhapus'
);

-- --- G8: RLS negatif lintas usaha ---
select public.create_business('Toko M6 B', 'fashion', 'COD');

set local request.jwt.claims =
  '{"sub":"26262626-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.customers
   where business_id = (select id from test_ids where key = 'biz_a')),
  0,
  'G8 usaha B tidak melihat pelanggan usaha A'
);

select throws_ok(
  $$ select public.set_customer_aktif((select id from test_ids where key = 'siti'), false) $$,
  '22023',
  'PELANGGAN_TIDAK_DITEMUKAN',
  'G8 RPC arsip menolak pelanggan usaha lain'
);

select throws_ok(
  $$
    select public.update_customer(
      (select id from test_ids where key = 'siti'),
      'Diambil Alih',
      '0812-1111-0001'
    )
  $$,
  '22023',
  'PELANGGAN_TIDAK_DITEMUKAN',
  'G8 RPC update menolak pelanggan usaha lain'
);

set local request.jwt.claims =
  '{"sub":"16161616-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- --- G7: auto-link order ke pelanggan existing & arsip ---
select public.create_product(
  (select id from test_ids where key = 'biz_a'),
  'Sosis M6',
  25000,
  0,
  array['sosis m6'],
  0,
  null
);

insert into test_ids (key, id)
select 'order_aktif', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from public.products where nama = 'Sosis M6'),
    'qty', 1,
    'harga_satuan', 25000
  )),
  0,
  0,
  'Siti Rahma',
  '0812-1111-0001',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select is(
  (select customer_id from public.orders where id = (select id from test_ids where key = 'order_aktif')),
  (select id from test_ids where key = 'siti'),
  'G7 re-pin: order auto-link ke pelanggan existing'
);

select public.set_customer_aktif((select id from test_ids where key = 'siti'), false);

insert into test_ids (key, id)
select 'order_arsip', public.create_manual_order(
  jsonb_build_array(jsonb_build_object(
    'product_id', (select id from public.products where nama = 'Sosis M6'),
    'qty', 1,
    'harga_satuan', 25000
  )),
  0,
  0,
  'Siti Rahma',
  '+62 812-1111-0001',
  null,
  null,
  array['TRANSFER']::text[],
  null
);

select is(
  (select customer_id from public.orders where id = (select id from test_ids where key = 'order_arsip')),
  (select id from test_ids where key = 'siti'),
  'G7b re-pin: order tetap auto-link ke pelanggan diarsipkan'
);

select is(
  (select aktif from public.customers where id = (select id from test_ids where key = 'siti')),
  false,
  'G7c pelanggan diarsipkan tidak berubah status oleh order baru'
);

-- --- G6: FK delete-ber-order (re-pin 0003:73 RESTRICT) ---
select throws_ok(
  $$ select public.hapus_customer((select id from test_ids where key = 'siti')) $$,
  '23503',
  null,
  'G6 hapus pelanggan ber-order ditolak FK'
);

-- --- G14: telepon tidak valid ---
select throws_ok(
  $$ select public.upsert_customer('Tanpa Telepon', 'abc') $$,
  '22023',
  'TELEPON_TIDAK_VALID',
  'G14 telepon tidak valid ditolak'
);

select * from finish();
rollback;
