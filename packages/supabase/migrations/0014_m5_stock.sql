-- 0014 — M5 penguatan stok: PENYESUAIAN tidak boleh membuat saldo negatif.
-- Signature record_stock_move TETAP lean (tanpa parameter kas/utang) — Gate PREP Q4.
-- Stok minus diblokir dengan pesan yang sama seperti ship_order (Gate #3/#52).

create or replace function public.record_stock_move(
  p_product_id uuid,
  p_type text,
  p_qty integer,
  p_unit_price bigint default null,
  p_reason text default null,
  p_order_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_nama text;
  v_jenis public.stock_movement_type;
  v_alasan text := btrim(coalesce(p_reason, ''));
  v_id uuid;
  v_qty_lama integer;
  v_hpp_lama bigint;
  v_hpp_baru bigint;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select p.business_id, p.nama into v_business_id, v_nama
  from public.products p
  join public.businesses b on b.id = p.business_id
  where p.id = p_product_id
    and b.owner_id = v_uid;

  if v_business_id is null then
    raise exception 'PRODUK_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  begin
    v_jenis := upper(btrim(coalesce(p_type, '')))::public.stock_movement_type;
  exception
    when invalid_text_representation then
      raise exception 'TIPE_MUTASI_TIDAK_VALID' using errcode = '22023';
  end;

  if v_jenis = 'KELUAR' then
    raise exception 'KELUAR_HANYA_VIA_ORDER' using errcode = '42501';
  end if;

  if p_qty is null or p_qty = 0 then
    raise exception 'QTY_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis = 'MASUK' and p_qty < 0 then
    raise exception 'QTY_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_alasan = '' then
    raise exception 'ALASAN_WAJIB' using errcode = '22023';
  end if;

  if p_unit_price is not null and p_unit_price < 0 then
    raise exception 'HARGA_BELI_TIDAK_VALID' using errcode = '22023';
  end if;

  select coalesce(sum(qty), 0)::integer into v_qty_lama
  from public.stock_movements
  where product_id = p_product_id;

  -- M5: penyesuaian tidak boleh membuat saldo negatif. Stok minus DIBLOKIR.
  if v_jenis = 'PENYESUAIAN' and (v_qty_lama + p_qty) < 0 then
    raise exception 'STOK_TIDAK_CUKUP: % — tersedia %, butuh %',
      v_nama, v_qty_lama, abs(p_qty)
      using errcode = '22023';
  end if;

  insert into public.stock_movements (
    business_id, product_id, jenis, qty, harga_beli, alasan, order_id
  )
  values (
    v_business_id, p_product_id, v_jenis, p_qty, p_unit_price, v_alasan, p_order_id
  )
  returning id into v_id;

  if v_jenis = 'MASUK' and p_unit_price is not null then
    if v_qty_lama <= 0 then
      v_hpp_baru := p_unit_price;
    else
      select hpp_rata_rata into v_hpp_lama
      from public.products
      where id = p_product_id;

      v_hpp_baru := round(
        ((v_qty_lama::numeric * v_hpp_lama::numeric)
          + (p_qty::numeric * p_unit_price::numeric))
        / (v_qty_lama + p_qty)::numeric
      )::bigint;
    end if;

    update public.products
    set hpp_rata_rata = v_hpp_baru
    where id = p_product_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  from public, anon, service_role;
grant execute on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  to authenticated;
