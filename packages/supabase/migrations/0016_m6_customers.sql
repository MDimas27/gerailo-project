-- 0016 — M6 pelanggan: kolom arsip + RPC tulis (satu pintu dengan jalur order).
-- Additive: kolom default + fungsi baru; tidak mengubah tabel lain/view M7.
-- Keputusan gate: jalur tulis = RPC (grant+policy tulis DITOLAK).

alter table public.customers
  add column aktif boolean not null default true;

create index customers_business_aktif_idx
  on public.customers (business_id, aktif);

-- Ambil usaha milik pemanggil (MVP satu usaha per owner; konsisten usePrimaryBusiness).
create or replace function public._pelanggan_business_owner()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.businesses
  where owner_id = auth.uid()
  order by created_at
  limit 1;
$$;

revoke all on function public._pelanggan_business_owner() from public, anon, authenticated, service_role;

create or replace function public.upsert_customer(
  p_nama text,
  p_telepon text,
  p_alamat text default null,
  p_catatan text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_nama text := btrim(coalesce(p_nama, ''));
  v_telepon text := public.normalize_telepon(p_telepon);
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  v_business := public._pelanggan_business_owner();

  if v_business is null then
    raise exception 'USAHA_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if char_length(v_nama) < 1 or char_length(v_nama) > 120 then
    raise exception 'NAMA_PELANGGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_telepon is null then
    raise exception 'TELEPON_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_alamat is not null and char_length(p_alamat) > 300 then
    raise exception 'ALAMAT_TERLALU_PANJANG' using errcode = '22023';
  end if;

  if p_catatan is not null and char_length(p_catatan) > 500 then
    raise exception 'CATATAN_TERLALU_PANJANG' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.customers
    where business_id = v_business and telepon = v_telepon
  ) then
    raise exception 'TELEPON_TERDAFTAR' using errcode = '22023';
  end if;

  insert into public.customers (business_id, nama, telepon, alamat, catatan)
  values (v_business, v_nama, v_telepon, p_alamat, p_catatan)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_customer(
  p_customer_id uuid,
  p_nama text,
  p_telepon text,
  p_alamat text default null,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business uuid;
  v_nama text := btrim(coalesce(p_nama, ''));
  v_telepon text := public.normalize_telepon(p_telepon);
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select c.business_id into v_business
  from public.customers c
  join public.businesses b on b.id = c.business_id
  where c.id = p_customer_id and b.owner_id = v_uid;

  if v_business is null then
    raise exception 'PELANGGAN_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if char_length(v_nama) < 1 or char_length(v_nama) > 120 then
    raise exception 'NAMA_PELANGGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_telepon is null then
    raise exception 'TELEPON_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_alamat is not null and char_length(p_alamat) > 300 then
    raise exception 'ALAMAT_TERLALU_PANJANG' using errcode = '22023';
  end if;

  if p_catatan is not null and char_length(p_catatan) > 500 then
    raise exception 'CATATAN_TERLALU_PANJANG' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.customers
    where business_id = v_business
      and telepon = v_telepon
      and id <> p_customer_id
  ) then
    raise exception 'TELEPON_TERDAFTAR' using errcode = '22023';
  end if;

  update public.customers
  set nama = v_nama,
    telepon = v_telepon,
    alamat = p_alamat,
    catatan = p_catatan
  where id = p_customer_id;
end;
$$;

create or replace function public.set_customer_aktif(
  p_customer_id uuid,
  p_aktif boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_aktif is null then
    raise exception 'STATUS_PELANGGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = p_customer_id and b.owner_id = v_uid
  ) then
    raise exception 'PELANGGAN_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  update public.customers set aktif = p_aktif where id = p_customer_id;
end;
$$;

create or replace function public.hapus_customer(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = p_customer_id and b.owner_id = v_uid
  ) then
    raise exception 'PELANGGAN_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  delete from public.customers where id = p_customer_id;
end;
$$;

revoke all on function public.upsert_customer(text, text, text, text)
  from public, anon, service_role;
grant execute on function public.upsert_customer(text, text, text, text)
  to authenticated;

revoke all on function public.update_customer(uuid, text, text, text, text)
  from public, anon, service_role;
grant execute on function public.update_customer(uuid, text, text, text, text)
  to authenticated;

revoke all on function public.set_customer_aktif(uuid, boolean)
  from public, anon, service_role;
grant execute on function public.set_customer_aktif(uuid, boolean)
  to authenticated;

revoke all on function public.hapus_customer(uuid)
  from public, anon, service_role;
grant execute on function public.hapus_customer(uuid)
  to authenticated;
