create or replace function public.ship_order(
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

drop function if exists public.complete_order(uuid, text, text);

create or replace function public.receive_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_total bigint;
  v_sudah bigint;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status <> 'DIKIRIM' then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  v_total := public._order_total(p_order_id);

  select coalesce(sum(jumlah), 0)::bigint
  into v_sudah
  from public.payments
  where order_id = p_order_id;

  if v_sudah < v_total then
    raise exception 'MASIH ADA SISA — catat pelunasan dulu' using errcode = '22023';
  end if;

  update public.orders set status = 'SELESAI' where id = p_order_id;
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

  if v_status not in ('DRAFT', 'DIKONFIRMASI', 'DP_DITERIMA', 'SIAP_DIKIRIM') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  update public.orders set status = 'BATAL' where id = p_order_id;
end;
$$;

revoke all on function public.ship_order(uuid, text, text) from public, anon;
grant execute on function public.ship_order(uuid, text, text) to authenticated;

revoke all on function public.receive_order(uuid) from public, anon;
grant execute on function public.receive_order(uuid) to authenticated;

revoke all on function public.cancel_order(uuid) from public, anon;
grant execute on function public.cancel_order(uuid) to authenticated;
