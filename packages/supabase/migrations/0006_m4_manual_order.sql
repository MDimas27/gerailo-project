create or replace function public.create_manual_order(
  p_items jsonb,
  p_ongkir bigint,
  p_dp bigint,
  p_nama text,
  p_telepon text,
  p_alamat text default null,
  p_catatan text default null,
  p_metode_bayar text[] default array['TRANSFER']::text[],
  p_due_date timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_nama text := btrim(coalesce(p_nama, ''));
  v_telepon text := public.normalize_telepon(p_telepon);
  v_metode text[] := coalesce(p_metode_bayar, array['TRANSFER']::text[]);
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_harga bigint;
  v_total bigint := 0;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select id into v_business_id
  from public.businesses
  where owner_id = v_uid;

  if v_business_id is null then
    raise exception 'USAHA_TIDAK_DITEMUKAN' using errcode = '42501';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0
    or jsonb_array_length(p_items) > 50
  then
    raise exception 'ITEM_KOSONG' using errcode = '22023';
  end if;

  if char_length(v_nama) < 1 or char_length(v_nama) > 120 then
    raise exception 'NAMA_PELANGGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_telepon is null or char_length(v_telepon) < 8 then
    raise exception 'TELEPON_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_ongkir is null or p_ongkir < 0 then
    raise exception 'ONGKIR_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_dp is null or p_dp < 0 then
    raise exception 'DP_TIDAK_VALID' using errcode = '22023';
  end if;

  if cardinality(v_metode) = 0 or cardinality(v_metode) > 4 then
    raise exception 'METODE_BAYAR_TIDAK_VALID' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(v_metode) as metode
    where upper(btrim(metode)) not in ('TRANSFER', 'COD', 'QRIS', 'LAINNYA')
  ) then
    raise exception 'METODE_BAYAR_TIDAK_VALID' using errcode = '22023';
  end if;

  if (
    select count(distinct upper(btrim(metode)))
    from unnest(v_metode) as metode
  ) <> cardinality(v_metode) then
    raise exception 'METODE_BAYAR_TIDAK_VALID' using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(v_item) as k
        where k not in ('product_id', 'qty', 'harga_satuan')
      )
    then
      raise exception 'ITEM_TIDAK_VALID' using errcode = '22023';
    end if;

    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_qty := (v_item ->> 'qty')::integer;
      v_harga := (v_item ->> 'harga_satuan')::bigint;
    exception
      when invalid_text_representation then
        raise exception 'ITEM_TIDAK_VALID' using errcode = '22023';
    end;

    if v_product_id is null or v_qty is null or v_qty <= 0 or v_qty > 1000
      or v_harga is null or v_harga <= 0
    then
      raise exception 'ITEM_TIDAK_VALID' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.products p
      where p.id = v_product_id
        and p.business_id = v_business_id
        and p.aktif = true
    ) then
      raise exception 'PRODUK_TIDAK_DITEMUKAN' using errcode = '22023';
    end if;

    v_total := v_total + v_qty::bigint * v_harga;
  end loop;

  if p_dp > v_total + p_ongkir then
    raise exception 'DP_MELEBIHI_TOTAL' using errcode = '22023';
  end if;

  insert into public.customers (business_id, nama, telepon, alamat, catatan)
  values (v_business_id, v_nama, v_telepon, p_alamat, p_catatan)
  on conflict (business_id, telepon) do nothing;

  select id into v_customer_id
  from public.customers
  where business_id = v_business_id and telepon = v_telepon;

  insert into public.orders (
    business_id, customer_id, ongkir, dp, metode_bayar, due_date
  )
  values (
    v_business_id,
    v_customer_id,
    p_ongkir,
    p_dp,
    (select array_agg(upper(btrim(metode))) from unnest(v_metode) as metode),
    p_due_date
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, business_id, product_id, qty, harga_satuan)
  select
    v_order_id,
    v_business_id,
    (value ->> 'product_id')::uuid,
    (value ->> 'qty')::integer,
    (value ->> 'harga_satuan')::bigint
  from jsonb_array_elements(p_items);

  return v_order_id;
end;
$$;

revoke all on function public.create_manual_order(
  jsonb, bigint, bigint, text, text, text, text, text[], timestamptz
) from public, anon, service_role;
grant execute on function public.create_manual_order(
  jsonb, bigint, bigint, text, text, text, text, text[], timestamptz
) to authenticated;
