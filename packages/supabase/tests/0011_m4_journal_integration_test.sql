begin;

create extension if not exists pgtap with schema extensions;

select plan(92);

create temporary table test_ids (
  key text primary key,
  id uuid not null
);

create temporary table test_ints (
  key text primary key,
  val bigint not null
);

grant select, insert on test_ids to authenticated, anon;
grant select, insert on test_ints to authenticated, anon;

insert into auth.users (id, email)
values
  ('cccccccc-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'owner-jurnal-integration-a@test.local'),
  ('dddddddd-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner-jurnal-integration-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"cccccccc-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko Jurnal Integrasi A', 'makanan', 'TRANSFER') $$,
  'create_business integrasi jurnal A'
);

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz_a'),
      'Sosis Jurnal',
      75000,
      0,
      array['sosis jurnal'],
      10,
      55000
    )
  $$,
  'create_product Sosis Jurnal dengan stok awal dan HPP'
);

insert into test_ids
select 'prod_sosis', id from public.products where nama = 'Sosis Jurnal';

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_sosis')),
  55000::bigint,
  'stok awal menetapkan HPP rata-rata 55000'
);

select lives_ok(
  $$
    select public.create_product(
      (select id from test_ids where key = 'biz_a'),
      'Bumbu Jurnal',
      10000,
      0,
      array['bumbu jurnal'],
      10,
      50000
    )
  $$,
  'create_product Bumbu Jurnal untuk uji rata-rata'
);

insert into test_ids
select 'prod_bumbu', id from public.products where nama = 'Bumbu Jurnal';

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_siti', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 3,
        'harga_satuan', 75000
      )),
      15000,
      100000,
      'Siti Jurnal',
      '0812-1111-0001',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order Siti untuk T1–T4'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_siti')) $$,
  'confirm_order Siti — T0 tanpa jurnal'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DIKONFIRMASI'::order_status,
  'status Siti DIKONFIRMASI'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_siti')),
  0,
  'T0 confirm_order tidak membuat jurnal'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'jurnal_dp_siti', public.record_payment(
      (select id from test_ids where key = 'order_siti'),
      'DP',
      100000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP Siti dicatat — T1'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_siti') and kejadian = 'T1'),
  1,
  'T1 Siti tepat satu jurnal'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_siti')
      and je.kejadian = 'T1'
      and a.kode = '1-1010'
  ),
  100000::bigint,
  'T1 Siti mendebit Kas 100000'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_siti')
      and je.kejadian = 'T1'
      and a.kode = '2-2010'
  ),
  100000::bigint,
  'T1 Siti mengkredit UMP 100000'
);

select lives_ok(
  $$ select public.mark_ready((select id from test_ids where key = 'order_siti')) $$,
  'mark_ready Siti'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_siti')),
  1,
  'mark_ready tidak menambah jurnal'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_siti'), 'JNE', null) $$,
  'ship_order Siti — T2 + T3 + KELUAR'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DIKIRIM'::order_status,
  'status Siti DIKIRIM'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_siti') and kejadian = 'T2'),
  1,
  'T2 Siti tepat satu jurnal'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_siti') and kejadian = 'T3'),
  1,
  'T3 Siti tepat satu jurnal — HPP tidak dobel'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_siti')
      and je.kejadian = 'T3'
      and a.kode = '5-5010'
  ),
  165000::bigint,
  'T3 Siti HPP 165000'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_siti')
      and je.kejadian = 'T3'
      and a.kode = '1-1040'
  ),
  165000::bigint,
  'T3 Siti mengkredit Persediaan 165000'
);

select is(
  (select coalesce(saldo, 0)::bigint from public.v_stock_balance where product_id = (select id from test_ids where key = 'prod_sosis')),
  7::bigint,
  'stok Sosis setelah kirim = 7'
);

select is(
  (select count(*)::int from public.stock_movements where order_id = (select id from test_ids where key = 'order_siti') and jenis = 'KELUAR'::stock_movement_type),
  1,
  'satu movement KELUAR per order'
);

select is(
  (select coalesce(sum(qty), 0)::bigint from public.stock_movements where order_id = (select id from test_ids where key = 'order_siti') and jenis = 'KELUAR'::stock_movement_type),
  -3::bigint,
  'qty KELUAR Siti = -3'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_siti'),
      'PELUNASAN',
      140000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan Siti dicatat — T4'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_siti') and kejadian = 'T4'),
  1,
  'T4 Siti tepat satu jurnal'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'DIKIRIM'::order_status,
  'Siti tetap DIKIRIM setelah pelunasan non-COD'
);

select lives_ok(
  $$ select public.receive_order((select id from test_ids where key = 'order_siti')) $$,
  'receive_order Siti setelah pelunasan'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_siti')),
  'SELESAI'::order_status,
  'Siti SELESAI setelah diterima'
);

select is(
  (select pendapatan::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a') and tanggal = current_date),
  240000::bigint,
  'rekap harian pendapatan Siti 240000'
);

select is(
  (select hpp::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a') and tanggal = current_date),
  165000::bigint,
  'rekap harian HPP Siti 165000'
);

select is(
  (select laba_kotor::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a') and tanggal = current_date),
  75000::bigint,
  'rekap harian laba kotor Siti 75000'
);

select is(
  (select kas_masuk::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a') and tanggal = current_date),
  240000::bigint,
  'rekap harian kas masuk Siti 240000'
);

select is(
  (select piutang::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a') and tanggal = current_date),
  0::bigint,
  'rekap harian piutang Siti nol'
);

select is(
  (select uang_muka::bigint from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a') and tanggal = current_date),
  0::bigint,
  'rekap harian UMP Siti nol'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_prepaid', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 1,
        'harga_satuan', 75000
      )),
      0,
      0,
      'Rina Jurnal',
      '0812-1111-0002',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order prepaid untuk uji receive_order'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_prepaid')) $$,
  'confirm_order prepaid'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_prepaid'),
      'PELUNASAN',
      75000::bigint,
      'MANUAL',
      null
    )
  $$,
  'pelunasan prepaid sebelum kirim masuk UMP'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_prepaid'), 'JNE', null, 0::bigint) $$,
  'ship_order prepaid'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_prepaid')),
  3,
  'prepaid punya T1 + T2 + T3 sebelum diterima'
);

select lives_ok(
  $$ select public.receive_order((select id from test_ids where key = 'order_prepaid')) $$,
  'receive_order prepaid'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_prepaid')),
  'SELESAI'::order_status,
  'receive_order prepaid ke SELESAI'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_prepaid')),
  3,
  'receive_order tidak menambah jurnal'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_cod', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 1,
        'harga_satuan', 75000
      )),
      10000,
      0,
      'Andi Jurnal',
      '0812-1111-0003',
      null,
      null,
      array['COD']::text[],
      null
    )
  $$,
  'order COD tanpa DP'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cod')) $$,
  'confirm_order COD tanpa DP'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_cod'), 'JNE', null, 0::bigint) $$,
  'ship_order COD tanpa DP — T5 + T3'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_cod') and kejadian = 'T5'),
  1,
  'T5 COD tanpa DP tepat satu jurnal'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_cod')
      and je.kejadian = 'T5'
      and a.kode = '1-1010'
  ),
  85000::bigint,
  'T5 mendebit Kas 85000 termasuk ongkir'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_cod')
      and je.kejadian = 'T5'
      and a.kode = '4-4010'
  ),
  75000::bigint,
  'T5 mengkredit Pendapatan penjualan 75000'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_cod')
      and je.kejadian = 'T5'
      and a.kode = '4-4020'
  ),
  10000::bigint,
  'T5 mengkredit Pendapatan ongkir 10000'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_cod'),
      'COD',
      85000::bigint,
      'COD',
      null,
      0::bigint
    )
  $$,
  'catat COD diterima tanpa jurnal ganda'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_cod')),
  2,
  'COD payment tidak menambah T5/T3'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_cod')),
  'SELESAI'::order_status,
  'COD SELESAI setelah catat COD diterima'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_cod_dp', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 2,
        'harga_satuan', 75000
      )),
      0,
      50000,
      'Dewi Jurnal',
      '0812-1111-0004',
      null,
      null,
      array['COD']::text[],
      null
    )
  $$,
  'order COD dengan DP'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_cod_dp')) $$,
  'confirm_order COD dengan DP'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_cod_dp'),
      'DP',
      50000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP COD dicatat — T1'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_cod_dp'), 'JNE', null, 0::bigint) $$,
  'ship_order COD dengan DP — T6 + T3'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_cod_dp') and kejadian = 'T6'),
  1,
  'T6 COD+DP tepat satu jurnal'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_cod_dp')
      and je.kejadian = 'T6'
      and a.kode = '1-1010'
  ),
  100000::bigint,
  'T6 mendebit Kas sisa 100000'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_cod_dp')
      and je.kejadian = 'T6'
      and a.kode = '2-2010'
  ),
  50000::bigint,
  'T6 mendebit UMP 50000'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_cod_dp')
      and je.kejadian = 'T6'
      and a.kode = '4-4010'
  ),
  150000::bigint,
  'T6 mengkredit Pendapatan 150000'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_cod_dp'),
      'COD',
      100000::bigint,
      'COD',
      null,
      0::bigint
    )
  $$,
  'pelunasan COD+DP dicatat tanpa jurnal ganda'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_cod_dp')),
  3,
  'COD+DP tetap T1 + T6 + T3'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_t7', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 1,
        'harga_satuan', 75000
      )),
      0,
      0,
      'Fitri Jurnal',
      '0812-1111-0005',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order T7 ongkir ditanggung penjual'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_t7')) $$,
  'confirm_order T7'
);

select lives_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_t7'), 'JNE', null, 15000::bigint) $$,
  'ship_order T7 dengan biaya kurir 15000'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_t7') and kejadian = 'T7'),
  1,
  'T7 tepat satu jurnal'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_t7')
      and je.kejadian = 'T7'
      and a.kode = '6-6010'
  ),
  15000::bigint,
  'T7 mendebit Beban pengiriman 15000'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_t7')
      and je.kejadian = 'T7'
      and a.kode = '2-2030'
  ),
  15000::bigint,
  'T7 mengkredit Utang kurir 15000'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_qris', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 1,
        'harga_satuan', 75000
      )),
      0,
      0,
      'Nina Jurnal',
      '0812-1111-0006',
      null,
      null,
      array['QRIS']::text[],
      null
    )
  $$,
  'order QRIS untuk T12'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_qris')) $$,
  'confirm_order QRIS'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_qris'),
      'DP',
      75000::bigint,
      'QRIS',
      null,
      700::bigint
    )
  $$,
  'bayar QRIS dengan fee input manual 700 — T1 + T12'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_qris') and kejadian = 'T12'),
  1,
  'T12 fee QRIS tepat satu jurnal'
);

select is(
  (
    select coalesce(sum(jl.debit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_qris')
      and je.kejadian = 'T12'
      and a.kode = '6-6050'
  ),
  700::bigint,
  'T12 mendebit Beban platform 700'
);

select is(
  (
    select coalesce(sum(jl.kredit), 0)::bigint
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = (select id from test_ids where key = 'order_qris')
      and je.kejadian = 'T12'
      and a.kode = '1-1020'
  ),
  700::bigint,
  'T12 mengkredit Bank/e-wallet 700'
);

select lives_ok(
  $$
    select public.record_stock_move(
      (select id from test_ids where key = 'prod_bumbu'),
      'MASUK',
      10,
      60000::bigint,
      'pembelian stok',
      null
    )
  $$,
  'pembelian stok mengubah HPP rata-rata — T8'
);

select is(
  (select hpp_rata_rata::bigint from public.products where id = (select id from test_ids where key = 'prod_bumbu')),
  55000::bigint,
  'HPP rata-rata Bumbu = 55000 setelah pembelian'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'order_batal', public.create_manual_order(
      jsonb_build_array(jsonb_build_object(
        'product_id', (select id from test_ids where key = 'prod_sosis'),
        'qty', 1,
        'harga_satuan', 75000
      )),
      0,
      0,
      'Rudi Jurnal',
      '0812-1111-0007',
      null,
      null,
      array['TRANSFER']::text[],
      null
    )
  $$,
  'order batal sebelum kirim'
);

select lives_ok(
  $$ select public.confirm_order((select id from test_ids where key = 'order_batal')) $$,
  'confirm_order batal'
);

select lives_ok(
  $$
    select public.record_payment(
      (select id from test_ids where key = 'order_batal'),
      'DP',
      50000::bigint,
      'MANUAL',
      null
    )
  $$,
  'DP order batal dicatat'
);

insert into test_ids (key, id)
select 'jurnal_dp_batal', id
from public.journal_entries
where order_id = (select id from test_ids where key = 'order_batal')
  and kejadian = 'T1';

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_batal') and kejadian = 'T1'),
  1,
  'T1 order batal ada sebelum pembatalan'
);

select lives_ok(
  $$ select public.cancel_order((select id from test_ids where key = 'order_batal')) $$,
  'cancel_order sebelum kirim'
);

select is(
  (select status from public.orders where id = (select id from test_ids where key = 'order_batal')),
  'BATAL'::order_status,
  'status order batal = BATAL'
);

select is(
  (select count(*)::int from public.journal_entries where order_id = (select id from test_ids where key = 'order_batal') and reversi_dari_id is not null),
  1,
  'pembatalan membuat satu entri reversi'
);

select is(
  (
    select reversi_dari_id
    from public.journal_entries
    where order_id = (select id from test_ids where key = 'order_batal')
      and reversi_dari_id is not null
  ),
  (select id from test_ids where key = 'jurnal_dp_batal'),
  'reversi merujuk T1 pembayaran DP'
);

select throws_ok(
  $$ select public.ship_order((select id from test_ids where key = 'order_siti'), 'JNE', null, 0::bigint) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'kirim ulang order sudah dikirim ditolak — HPP tidak dobel'
);

select throws_ok(
  $$ select public.cancel_order((select id from test_ids where key = 'order_t7')) $$,
  '22023',
  'TRANSISI_TIDAK_VALID',
  'batal order DIKIRIM tetap ditolak'
);

set local role postgres;

select lives_ok(
  $$
    select public._journal_event(
      p_business_id => (select id from test_ids where key = 'biz_a'),
      p_kejadian => 'T9',
      p_tanggal => now(),
      p_order_id => null,
      p_total => 25000::bigint,
      p_ongkir => 0::bigint,
      p_dp => 0::bigint,
      p_hpp => 0::bigint,
      p_biaya => 0::bigint
    )
  $$,
  'template T9 beban operasional tersedia di SQL'
);

select lives_ok(
  $$
    select public._journal_event(
      p_business_id => (select id from test_ids where key = 'biz_a'),
      p_kejadian => 'T10',
      p_tanggal => now(),
      p_order_id => null,
      p_total => 50000::bigint,
      p_ongkir => 0::bigint,
      p_dp => 0::bigint,
      p_hpp => 0::bigint,
      p_biaya => 0::bigint
    )
  $$,
  'template T10 prive tersedia di SQL'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"cccccccc-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is(
  (select count(*)::int from public.journal_entries where business_id = (select id from test_ids where key = 'biz_a') and kejadian = 'T9'),
  1,
  'T9 tersimpan sebagai jurnal'
);

select is(
  (select count(*)::int from public.journal_entries where business_id = (select id from test_ids where key = 'biz_a') and kejadian = 'T10'),
  1,
  'T10 tersimpan sebagai jurnal'
);

set local request.jwt.claims =
  '{"sub":"dddddddd-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.journal_entries where id = (select id from test_ids where key = 'jurnal_dp_siti')),
  0,
  'RLS jurnal integrasi lintas usaha ditolak'
);

select is(
  (select count(*)::int from public.v_rekap_harian where business_id = (select id from test_ids where key = 'biz_a')),
  0,
  'RLS rekap harian lintas usaha ditolak'
);

select * from finish();
rollback;
