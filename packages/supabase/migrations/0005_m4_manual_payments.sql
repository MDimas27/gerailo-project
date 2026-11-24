create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null,
  jenis text not null check (jenis in ('DP', 'PELUNASAN', 'COD')),
  jumlah bigint not null check (jumlah > 0),
  kanal text not null check (kanal in ('MANUAL', 'COD', 'QRIS', 'VA', 'E_WALLET', 'MIDTRANS', 'LAINNYA')),
  bukti_path text,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  constraint payments_order_fkey foreign key (order_id, business_id)
    references public.orders (id, business_id) on delete cascade
);

create index payments_business_created_idx
  on public.payments (business_id, created_at desc);
create index payments_order_idx on public.payments (order_id);

create trigger payments_set_updated_at
before update on public.payments
for each row execute function public.set_updated_at();

alter table public.orders add constraint orders_ongkir_valid_check
  check (ongkir is not null and ongkir >= 0);
alter table public.orders add constraint orders_dp_valid_check
  check (dp is not null and dp >= 0);

alter table public.payments enable row level security;

create policy payments_select_own
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = payments.business_id
      and b.owner_id = (select auth.uid())
  )
);

revoke all on public.payments from public, anon, authenticated, service_role;
grant select on public.payments to authenticated;

insert into storage.buckets (id, name, public)
values ('bukti-pembayaran', 'bukti-pembayaran', false)
on conflict (id) do nothing;

drop policy if exists bukti_pembayaran_insert_own on storage.objects;
create policy bukti_pembayaran_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bukti-pembayaran'
  and exists (
    select 1
    from public.businesses b
    where b.id::text = split_part(name, '/', 1)
      and b.owner_id = (select auth.uid())
  )
);

drop policy if exists bukti_pembayaran_select_own on storage.objects;
create policy bukti_pembayaran_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bukti-pembayaran'
  and exists (
    select 1
    from public.businesses b
    where b.id::text = split_part(name, '/', 1)
      and b.owner_id = (select auth.uid())
  )
);

create or replace function public._assert_order_owner(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select o.business_id
  into v_business_id
  from public.orders o
  join public.businesses b on b.id = o.business_id
  where o.id = p_order_id
    and b.owner_id = v_uid;

  if v_business_id is null then
    raise exception 'AKSES_DITOLAK' using errcode = '42501';
  end if;

  return v_business_id;
end;
$$;

create or replace function public._order_total(p_order_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  select o.ongkir + coalesce(sum(oi.qty::bigint * oi.harga_satuan), 0)
  into v_total
  from public.orders o
  left join public.order_items oi on oi.order_id = o.id
  where o.id = p_order_id
  group by o.ongkir;

  return coalesce(v_total, 0);
end;
$$;

create or replace function public._post_payment(
  p_order_id uuid,
  p_jenis text,
  p_jumlah bigint,
  p_kanal text,
  p_bukti_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jenis text := upper(btrim(coalesce(p_jenis, '')));
  v_kanal text := upper(btrim(coalesce(p_kanal, '')));
  v_status public.order_status;
  v_total bigint;
  v_sudah bigint;
  v_payment_id uuid;
begin
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'PEMBAYARAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis not in ('DP', 'PELUNASAN', 'COD') then
    raise exception 'JENIS_PEMBAYARAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_kanal not in ('MANUAL', 'COD', 'QRIS', 'VA', 'E_WALLET', 'MIDTRANS', 'LAINNYA') then
    raise exception 'KANAL_PEMBAYARAN_TIDAK_VALID' using errcode = '22023';
  end if;

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status is null then
    raise exception 'ORDER_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if v_status in ('SELESAI', 'BATAL') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis = 'DP' and v_status in ('SIAP_DIKIRIM', 'DIKIRIM') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis = 'COD' and v_status <> 'DIKIRIM' then
    raise exception 'COD_HANYA_SAAT_KIRIM' using errcode = '22023';
  end if;

  v_total := public._order_total(p_order_id);

  select coalesce(sum(jumlah), 0)::bigint
  into v_sudah
  from public.payments
  where order_id = p_order_id;

  if p_jumlah > v_total - v_sudah then
    raise exception 'PEMBAYARAN_MELEBIHI_TOTAL' using errcode = '22023';
  end if;

  insert into public.payments (business_id, order_id, jenis, jumlah, kanal, bukti_path)
  select o.business_id, o.id, v_jenis, p_jumlah, v_kanal, p_bukti_path
  from public.orders o
  where o.id = p_order_id
  returning id into v_payment_id;

  if v_sudah + p_jumlah >= v_total then
    if v_status = 'DIKIRIM' or v_jenis = 'COD' then
      update public.orders set status = 'SELESAI' where id = p_order_id;
    elsif v_status <> 'SIAP_DIKIRIM' then
      update public.orders set status = 'DP_DITERIMA' where id = p_order_id;
    end if;
  elsif v_status = 'DIKONFIRMASI' then
    update public.orders set status = 'DP_DITERIMA' where id = p_order_id;
  end if;

  return v_payment_id;
end;
$$;

create or replace function public.confirm_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status <> 'DRAFT' then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  update public.orders set status = 'DIKONFIRMASI' where id = p_order_id;
  return p_order_id;
end;
$$;

create or replace function public.record_payment(
  p_order_id uuid,
  p_jenis text,
  p_jumlah bigint,
  p_kanal text,
  p_bukti_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._assert_order_owner(p_order_id);
  return public._post_payment(p_order_id, p_jenis, p_jumlah, p_kanal, p_bukti_path);
end;
$$;

create or replace function public.mark_ready(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status not in ('DIKONFIRMASI', 'DP_DITERIMA') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  update public.orders set status = 'SIAP_DIKIRIM' where id = p_order_id;
end;
$$;

create or replace function public.complete_order(
  p_order_id uuid,
  p_kurir_nama text default null,
  p_nomor_resi text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status not in ('DIKONFIRMASI', 'DP_DITERIMA', 'SIAP_DIKIRIM') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  update public.orders
  set status = 'DIKIRIM',
    kurir_nama = coalesce(p_kurir_nama, kurir_nama),
    nomor_resi = coalesce(p_nomor_resi, nomor_resi)
  where id = p_order_id;
end;
$$;

create or replace function public.set_shipping(
  p_order_id uuid,
  p_kurir text,
  p_resi text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status not in ('DIKIRIM', 'SELESAI') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  update public.orders
  set kurir_nama = p_kurir,
    nomor_resi = p_resi
  where id = p_order_id;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status in ('SELESAI', 'BATAL') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  update public.orders set status = 'BATAL' where id = p_order_id;
end;
$$;

revoke all on function public._assert_order_owner(uuid) from public, anon, authenticated, service_role;
revoke all on function public._order_total(uuid) from public, anon, authenticated, service_role;
revoke all on function public._post_payment(uuid, text, bigint, text, text) from public, anon, authenticated, service_role;

revoke all on function public.confirm_order(uuid) from public, anon;
grant execute on function public.confirm_order(uuid) to authenticated;

revoke all on function public.record_payment(uuid, text, bigint, text, text) from public, anon;
grant execute on function public.record_payment(uuid, text, bigint, text, text) to authenticated;

revoke all on function public.mark_ready(uuid) from public, anon;
grant execute on function public.mark_ready(uuid) to authenticated;

revoke all on function public.complete_order(uuid, text, text) from public, anon;
grant execute on function public.complete_order(uuid, text, text) to authenticated;

revoke all on function public.set_shipping(uuid, text, text) from public, anon;
grant execute on function public.set_shipping(uuid, text, text) to authenticated;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;
