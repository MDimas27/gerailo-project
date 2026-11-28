-- 0015 — M7: views laporan (security_invoker; turunan journal_lines/journal_entries).
-- Tidak ada agregat paralel: semua angka dari jurnal (rules/01 §10).
-- Pin kode akun (docs/ACCOUNTING-RULES.md): piutang 1-1030, UMP 2-2010,
-- kas 1-1010, bank/e-wallet 1-1020, pendapatan 4-4010/4-4020, HPP 5-5010,
-- beban 6-6010..6-6050.

-- Laba rugi bulanan (akrual sederhana): pendapatan saat DIKIRIM, beban saat dibuat.
create or replace view public.v_pnl_bulan
with (security_invoker = true)
as
select
  s.business_id,
  s.bulan,
  s.pendapatan,
  s.hpp,
  s.beban,
  (s.pendapatan - s.hpp)::bigint as laba_kotor
from (
  select
    jl.business_id,
    date_trunc('month', jl.tanggal)::date as bulan,
    coalesce(sum(
      case when a.kode in ('4-4010', '4-4020') then jl.kredit - jl.debit else 0 end
    ), 0)::bigint as pendapatan,
    coalesce(sum(
      case when a.kode = '5-5010' then jl.debit - jl.kredit else 0 end
    ), 0)::bigint as hpp,
    coalesce(sum(
      case when a.kode like '6-%' then jl.debit - jl.kredit else 0 end
    ), 0)::bigint as beban
  from public.journal_lines jl
  join public.accounts a on a.id = jl.account_id
  group by jl.business_id, date_trunc('month', jl.tanggal)::date
) s;

-- Arus kas metode langsung: HANYA akun kas/bank (1-1010, 1-1020) per hari.
create or replace view public.v_arus_kas
with (security_invoker = true)
as
select
  jl.business_id,
  jl.tanggal::date as tanggal,
  a.kode as akun_kode,
  a.nama as akun_nama,
  coalesce(sum(
    case when jl.debit > jl.kredit then jl.debit - jl.kredit else 0 end
  ), 0)::bigint as masuk,
  coalesce(sum(
    case when jl.kredit > jl.debit then jl.kredit - jl.debit else 0 end
  ), 0)::bigint as keluar
from public.journal_lines jl
join public.accounts a on a.id = jl.account_id
where a.kode in ('1-1010', '1-1020')
group by jl.business_id, jl.tanggal::date, a.kode, a.nama;

-- Piutang & UMP per order (TERPISAH) + breakdown pelanggan untuk laporan v1.
-- Piutang = saldo akun 1-1030 per order; UMP = saldo akun 2-2010 per order.
create or replace view public.v_piutang_ump
with (security_invoker = true)
as
select
  o.business_id,
  o.id as order_id,
  o.nomor,
  o.status,
  o.created_at,
  c.nama as customer_nama,
  c.telepon as customer_telepon,
  (
    select o.ongkir + coalesce(sum(oi.qty::bigint * oi.harga_satuan), 0)
    from public.order_items oi
    where oi.order_id = o.id
  )::bigint as total,
  coalesce((
    select sum(jl.debit - jl.kredit)
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = o.id
      and a.kode = '1-1030'
  ), 0)::bigint as piutang,
  coalesce((
    select sum(jl.kredit - jl.debit)
    from public.journal_lines jl
    join public.journal_entries je on je.id = jl.entry_id
    join public.accounts a on a.id = jl.account_id
    where je.order_id = o.id
      and a.kode = '2-2010'
  ), 0)::bigint as uang_muka
from public.orders o
left join public.customers c on c.id = o.customer_id;

revoke all on public.v_pnl_bulan from public, anon;
grant select on public.v_pnl_bulan to authenticated, service_role;

revoke all on public.v_arus_kas from public, anon;
grant select on public.v_arus_kas to authenticated, service_role;

revoke all on public.v_piutang_ump from public, anon;
grant select on public.v_piutang_ump to authenticated, service_role;
