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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'owner-jurnal-core-a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'owner-jurnal-core-b@test.local');

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","role":"authenticated"}';

select lives_ok(
  $$ select public.create_business('Toko Jurnal Core A', 'makanan', 'TRANSFER') $$,
  'create_business untuk jurnal core A'
);

insert into test_ids
select 'biz_a', id from public.businesses where owner_id = auth.uid();

insert into test_ids (key, id)
select 'akun_kas', id from public.accounts where business_id = (select id from test_ids where key = 'biz_a') and kode = '1-1010';

insert into test_ids (key, id)
select 'akun_ump', id from public.accounts where business_id = (select id from test_ids where key = 'biz_a') and kode = '2-2010';

select has_table('public', 'journal_entries', 'tabel journal_entries tersedia');
select has_table('public', 'journal_lines', 'tabel journal_lines tersedia');
select has_column('public', 'journal_entries', 'reversi_dari_id', 'journal_entries punya reversi_dari_id');
select has_column('public', 'journal_lines', 'business_id', 'journal_lines punya business_id');
select has_column('public', 'journal_lines', 'tanggal', 'journal_lines punya tanggal');
select has_function(
  'public',
  'post_journal',
  array['uuid', 'text', 'timestamptz', 'uuid', 'uuid', 'jsonb'],
  'post_journal internal tersedia'
);

set local role postgres;

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'jurnal_1', public.post_journal(
      (select id from test_ids where key = 'biz_a'),
      'T1',
      now(),
      null,
      null,
      jsonb_build_array(
        jsonb_build_object('account_kode', '1-1010', 'debit', 50000::bigint, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '2-2010', 'debit', 0::bigint, 'kredit', 50000::bigint)
      )
    )
  $$,
  'post_journal menerima jurnal seimbang T1'
);

select is(
  (select count(*)::int from public.journal_lines where entry_id = (select id from test_ids where key = 'jurnal_1')),
  2,
  'jurnal seimbang punya dua baris'
);

select is(
  (select sum(debit)::bigint from public.journal_lines where entry_id = (select id from test_ids where key = 'jurnal_1')),
  50000::bigint,
  'total debit jurnal T1 = 50000'
);

select is(
  (select sum(kredit)::bigint from public.journal_lines where entry_id = (select id from test_ids where key = 'jurnal_1')),
  50000::bigint,
  'total kredit jurnal T1 = 50000'
);

select lives_ok(
  $$
    insert into test_ids (key, id)
    select 'jurnal_reversi', public.post_journal(
      (select id from test_ids where key = 'biz_a'),
      'T11',
      now(),
      null,
      (select id from test_ids where key = 'jurnal_1'),
      jsonb_build_array(
        jsonb_build_object('account_kode', '1-1010', 'debit', 0::bigint, 'kredit', 50000::bigint),
        jsonb_build_object('account_kode', '2-2010', 'debit', 50000::bigint, 'kredit', 0::bigint)
      )
    )
  $$,
  'post_journal menerima entri reversi'
);

select is(
  (select reversi_dari_id from public.journal_entries where id = (select id from test_ids where key = 'jurnal_reversi')),
  (select id from test_ids where key = 'jurnal_1'),
  'entri reversi merujuk jurnal asal'
);

select throws_ok(
  $$
    insert into public.journal_entries (id, business_id, kejadian, tanggal)
    values ('cccccccc-cccc-cccc-cccc-ccccccccccc1', (select id from test_ids where key = 'biz_a'), 'T1', now());
    insert into public.journal_lines (id, entry_id, business_id, account_id, tanggal, debit, kredit)
    values
      ('cccccccc-cccc-cccc-cccc-ccccccccccc2', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', (select id from test_ids where key = 'biz_a'), (select id from test_ids where key = 'akun_kas'), now(), 50000::bigint, 0::bigint),
      ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'cccccccc-cccc-cccc-cccc-ccccccccccc1', (select id from test_ids where key = 'biz_a'), (select id from test_ids where key = 'akun_ump'), now(), 0::bigint, 40000::bigint);
    set constraints all immediate;
  $$,
  '22023',
  'JURNAL_TIDAK_SEIMBANG',
  'insert jurnal timpang langsung ditolak trigger DEFERRED'
);

set local role authenticated;
set local request.jwt.claims =
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","role":"authenticated"}';

select throws_ok(
  $$
    update public.journal_entries
    set kejadian = 'T2'
    where id = (select id from test_ids where key = 'jurnal_1')
  $$,
  '42501',
  'permission denied for table journal_entries',
  'UPDATE jurnal ditolak untuk authenticated'
);

select throws_ok(
  $$
    delete from public.journal_lines
    where entry_id = (select id from test_ids where key = 'jurnal_1')
  $$,
  '42501',
  'permission denied for table journal_lines',
  'DELETE baris jurnal ditolak untuk authenticated'
);

select throws_ok(
  $$
    select public.post_journal(
      (select id from test_ids where key = 'biz_a'),
      'T1',
      now(),
      null,
      null,
      jsonb_build_array(
        jsonb_build_object('account_kode', '1-1010', 'debit', 1000::bigint, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '2-2010', 'debit', 0::bigint, 'kredit', 1000::bigint)
      )
    )
  $$,
  '42501',
  'permission denied for function post_journal',
  'post_journal tidak bisa dipanggil klien'
);

select lives_ok(
  $$ select public.create_business('Toko Jurnal Core B', 'makanan', 'TRANSFER') $$,
  'create_business untuk uji RLS jurnal B'
);

set local request.jwt.claims =
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.journal_entries where id = (select id from test_ids where key = 'jurnal_1')),
  0,
  'jurnal usaha A tidak terlihat oleh usaha B'
);

select * from finish();
rollback;
