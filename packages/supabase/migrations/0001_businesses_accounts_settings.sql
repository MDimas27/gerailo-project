-- 0001 — fondasi usaha: businesses, accounts, app_settings + RLS + create_business.
-- Semua tabel memakai RLS deny-by-default. Penulisan data awal hanya lewat RPC.

-- Enum tipe akun COA (nilai domain mengikuti docs/ACCOUNTING-RULES.md).
create type public.account_type as enum (
  'ASET',
  'LIABILITAS',
  'EKUITAS',
  'PENDAPATAN',
  'HPP',
  'BEBAN'
);

-- Profil usaha. Satu pemilik per usaha (MVP).
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  jenis text not null check (char_length(btrim(jenis)) between 1 and 60),
  metode_bayar text not null default 'TRANSFER'
    check (metode_bayar in ('TRANSFER', 'COD', 'QRIS', 'LAINNYA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_owner_id_idx on public.businesses (owner_id);

-- COA per usaha (seed 19 akun oleh create_business).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kode text not null check (char_length(btrim(kode)) between 1 and 20),
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  tipe public.account_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, kode)
);

create index accounts_business_id_idx on public.accounts (business_id);

-- Pengaturan usaha; satu baris per usaha.
create table public.app_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  kuota_ai_terpakai integer not null default 0 check (kuota_ai_terpakai >= 0),
  preferensi_export jsonb not null default '{}'::jsonb,
  retensi_log_hari integer not null default 90
    check (retensi_log_hari between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at otomatis untuk ketiga tabel.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

create trigger app_settings_set_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

-- RLS deny-by-default: aktifkan di semua tabel.
alter table public.businesses enable row level security;
alter table public.accounts enable row level security;
alter table public.app_settings enable row level security;

-- businesses: pemilik bisa membaca dan memperbarui profil usahanya.
create policy businesses_select_own
on public.businesses
for select
to authenticated
using (owner_id = (select auth.uid()));

create policy businesses_update_own
on public.businesses
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- accounts: hanya baca; penulisan lewat RPC create_business.
create policy accounts_select_own
on public.accounts
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = accounts.business_id
      and b.owner_id = (select auth.uid())
  )
);

-- app_settings: hanya baca; penulisan lewat RPC / layanan server.
create policy app_settings_select_own
on public.app_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = app_settings.business_id
      and b.owner_id = (select auth.uid())
  )
);

-- RPC atomik: usaha + 19 akun COA + app_settings.
create or replace function public.create_business(
  p_nama text,
  p_jenis text,
  p_metode_bayar text default 'TRANSFER'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_business_id uuid;
  v_nama text := btrim(coalesce(p_nama, ''));
  v_jenis text := btrim(coalesce(p_jenis, ''));
  v_metode text := upper(btrim(coalesce(p_metode_bayar, 'TRANSFER')));
  v_account_count integer;
begin
  if v_owner_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if char_length(v_nama) < 1 or char_length(v_nama) > 120 then
    raise exception 'NAMA_USAHA_TIDAK_VALID' using errcode = '22023';
  end if;

  if char_length(v_jenis) < 1 or char_length(v_jenis) > 60 then
    raise exception 'JENIS_USAHA_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_metode not in ('TRANSFER', 'COD', 'QRIS', 'LAINNYA') then
    raise exception 'METODE_BAYAR_TIDAK_VALID' using errcode = '22023';
  end if;

  insert into public.businesses (owner_id, nama, jenis, metode_bayar)
  values (v_owner_id, v_nama, v_jenis, v_metode)
  returning id into v_business_id;

  insert into public.accounts (business_id, kode, nama, tipe)
  values
    (v_business_id, '1-1010', 'Kas', 'ASET'),
    (v_business_id, '1-1020', 'Bank / e-wallet', 'ASET'),
    (v_business_id, '1-1030', 'Piutang usaha', 'ASET'),
    (v_business_id, '1-1040', 'Persediaan barang', 'ASET'),
    (v_business_id, '2-2010', 'Uang muka pelanggan', 'LIABILITAS'),
    (v_business_id, '2-2020', 'Utang supplier', 'LIABILITAS'),
    (v_business_id, '2-2030', 'Utang biaya / kurir', 'LIABILITAS'),
    (v_business_id, '2-2040', 'Utang pajak (cadangan)', 'LIABILITAS'),
    (v_business_id, '3-3010', 'Modal pemilik', 'EKUITAS'),
    (v_business_id, '3-3020', 'Prive', 'EKUITAS'),
    (v_business_id, '3-3030', 'Laba (tutup tahun)', 'EKUITAS'),
    (v_business_id, '4-4010', 'Pendapatan penjualan', 'PENDAPATAN'),
    (v_business_id, '4-4020', 'Pendapatan ongkir', 'PENDAPATAN'),
    (v_business_id, '5-5010', 'HPP', 'HPP'),
    (v_business_id, '6-6010', 'Beban pengiriman', 'BEBAN'),
    (v_business_id, '6-6020', 'Beban bahan baku / produksi', 'BEBAN'),
    (v_business_id, '6-6030', 'Beban promosi / iklan', 'BEBAN'),
    (v_business_id, '6-6040', 'Beban operasional lain', 'BEBAN'),
    (v_business_id, '6-6050', 'Beban platform / fee gateway', 'BEBAN');

  select count(*) into v_account_count
  from public.accounts
  where business_id = v_business_id;

  if v_account_count <> 19 then
    raise exception 'SEED_COA_GAGAL' using errcode = 'P0001';
  end if;

  insert into public.app_settings (business_id)
  values (v_business_id);

  return v_business_id;
end;
$$;

-- Hanya pengguna login yang boleh membuat usaha; anon tidak.
revoke all on function public.create_business(text, text, text) from public;
revoke all on function public.create_business(text, text, text) from anon;
grant execute on function public.create_business(text, text, text) to authenticated;
