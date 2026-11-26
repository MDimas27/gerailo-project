create or replace function public.ship_order(
  p_order_id uuid,
  p_kurir_nama text default null,
  p_nomor_resi text default null,
  p_biaya_kurir bigint default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_business_id uuid;
  v_total bigint;
  v_ongkir bigint;
  v_sudah bigint;
  v_metode text[];
  v_cod boolean;
  v_hpp_total bigint := 0;
  v_tanggal timestamptz := now();
  v_item record;
  v_tersedia integer;
begin
  perform public._assert_order_owner(p_order_id);

  select o.status, o.business_id, o.ongkir, o.metode_bayar
  into v_status, v_business_id, v_ongkir, v_metode
  from public.orders o
  where o.id = p_order_id;

  if v_status not in ('DIKONFIRMASI', 'DP_DITERIMA', 'SIAP_DIKIRIM') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_biaya_kurir is null or p_biaya_kurir < 0 then
    raise exception 'BIAYA_KURIR_TIDAK_VALID' using errcode = '22023';
  end if;

  v_total := public._order_total(p_order_id);

  select coalesce(sum(jumlah), 0)::bigint
  into v_sudah
  from public.payments
  where order_id = p_order_id;

  v_cod := exists (
    select 1
    from unnest(v_metode) as metode
    where upper(btrim(metode)) = 'COD'
  );

  for v_item in
    select oi.product_id, oi.qty, p.nama, p.hpp_rata_rata
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
  loop
    select coalesce(sum(qty), 0)::integer
    into v_tersedia
    from public.stock_movements
    where product_id = v_item.product_id;

    if v_tersedia < v_item.qty then
      raise exception 'STOK_TIDAK_CUKUP: % — tersedia %, butuh %',
        v_item.nama, v_tersedia, v_item.qty
        using errcode = '22023';
    end if;
  end loop;

  for v_item in
    select oi.product_id, oi.qty, p.hpp_rata_rata
    from public.order_items oi
    join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
  loop
    v_hpp_total := v_hpp_total + v_item.qty::bigint * v_item.hpp_rata_rata::bigint;

    if v_item.hpp_rata_rata > 0 then
      insert into public.stock_movements (
        business_id, product_id, jenis, qty, harga_beli, alasan, order_id
      )
      values (
        v_business_id,
        v_item.product_id,
        'KELUAR',
        -v_item.qty,
        v_item.hpp_rata_rata,
        'pengiriman order',
        p_order_id
      );
    end if;
  end loop;

  if v_cod then
    if v_sudah = 0 then
      perform public._journal_event(
        v_business_id, 'T5', v_tanggal, p_order_id, v_total,
        v_ongkir, 0::bigint, 0::bigint, 0::bigint
      );
    else
      perform public._journal_event(
        v_business_id, 'T6', v_tanggal, p_order_id, v_total,
        v_ongkir, least(v_sudah, v_total), 0::bigint, 0::bigint
      );
    end if;
  else
    perform public._journal_event(
      v_business_id, 'T2', v_tanggal, p_order_id, v_total,
      v_ongkir, least(v_sudah, v_total), 0::bigint, 0::bigint
    );
  end if;

  if v_hpp_total > 0 then
    perform public._journal_event(
      v_business_id, 'T3', v_tanggal, p_order_id, v_hpp_total,
      0::bigint, 0::bigint, v_hpp_total, 0::bigint
    );
  end if;

  if p_biaya_kurir > 0 then
    perform public._journal_event(
      v_business_id, 'T7', v_tanggal, p_order_id, p_biaya_kurir,
      0::bigint, 0::bigint, 0::bigint, p_biaya_kurir
    );
  end if;

  update public.orders
  set status = 'DIKIRIM',
    kurir_nama = coalesce(p_kurir_nama, kurir_nama),
    nomor_resi = coalesce(p_nomor_resi, nomor_resi)
  where id = p_order_id;
end;
$$;

create or replace function public.gagal_kirim(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
  v_business_id uuid;
  v_entry record;
  v_item record;
  v_hpp bigint;
begin
  v_business_id := public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status <> 'DIKIRIM' then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  for v_entry in
    select id
    from public.journal_entries
    where order_id = p_order_id
      and reversi_dari_id is null
      and kejadian in ('T2', 'T3', 'T4', 'T5', 'T6', 'T7')
    order by case kejadian
      when 'T7' then 1
      when 'T4' then 2
      when 'T3' then 3
      when 'T2' then 4
      when 'T5' then 4
      when 'T6' then 4
      else 5
    end
  loop
    perform public._reverse_journal(v_entry.id);
  end loop;

  for v_item in
    select oi.product_id, oi.qty, keluar.harga_beli as hpp_snapshot
    from public.order_items oi
    join public.stock_movements keluar on keluar.order_id = oi.order_id
      and keluar.product_id = oi.product_id
      and keluar.jenis = 'KELUAR'::stock_movement_type
    where oi.order_id = p_order_id
  loop
    v_hpp := coalesce(v_item.hpp_snapshot, 0::bigint);

    perform public.record_stock_move(
      v_item.product_id,
      'MASUK',
      v_item.qty,
      v_hpp,
      'pengembalian kiriman gagal',
      p_order_id
    );
  end loop;

  update public.orders set status = 'BATAL' where id = p_order_id;
end;
$$;

revoke all on function public.gagal_kirim(uuid) from public, anon, service_role;
grant execute on function public.gagal_kirim(uuid) to authenticated;
