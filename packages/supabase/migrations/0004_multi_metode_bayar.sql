alter table public.orders drop constraint if exists orders_metode_bayar_check;

alter table public.orders alter column metode_bayar drop default;
alter table public.orders
  alter column metode_bayar type text[] using array[metode_bayar]::text[];
alter table public.orders
  alter column metode_bayar set default array['TRANSFER']::text[];

alter table public.orders add constraint orders_metode_bayar_check
  check (
    cardinality(metode_bayar) between 1 and 4
    and metode_bayar <@ array['TRANSFER','COD','QRIS','LAINNYA']::text[]
  );

drop function if exists public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text, timestamptz
);

create or replace function public.confirm_draft_order(
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
  v_total bigint;
  v_items_final jsonb;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
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
  then
    raise exception 'ITEM_KOSONG' using errcode = '22023';
  end if;

  if char_length(v_nama) < 1 or char_length(v_nama) > 120 then
    raise exception 'NAMA_PELANGGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_telepon is null then
    raise exception 'TELEPON_TIDAK_VALID' using errcode = '22023';
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

  select array_agg(distinct pilihan.metode order by pilihan.metode)
  into v_metode
  from (
    select upper(btrim(metode)) as metode
    from unnest(v_metode) as metode
  ) as pilihan;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(v_item) as k
        where k not in ('product_id', 'qty')
      )
    then
      raise exception 'HARGA_DARI_KLIEN_DITOLAK' using errcode = '22023';
    end if;

    begin
      v_product_id := (v_item ->> 'product_id')::uuid;
      v_qty := (v_item ->> 'qty')::integer;
    exception
      when invalid_text_representation then
        raise exception 'ITEM_TIDAK_VALID' using errcode = '22023';
    end;

    if v_qty is null or v_qty <= 0 or v_qty > 1000 then
      raise exception 'QTY_TIDAK_VALID' using errcode = '22023';
    end if;

    if not exists (
      select 1 from public.products p
      where p.id = v_product_id
        and p.business_id = v_business_id
        and p.aktif = true
    ) then
      raise exception 'PRODUK_TIDAK_DITEMUKAN' using errcode = '22023';
    end if;
  end loop;

  select jsonb_agg(
    jsonb_build_object('product_id', product_id, 'qty', total_qty)
  )
  into v_items_final
  from (
    select (value ->> 'product_id')::uuid as product_id,
      sum((value ->> 'qty')::integer) as total_qty
    from jsonb_array_elements(p_items)
    group by 1
  ) a;

  select coalesce(sum(p.harga_jual * i.qty), 0) into v_total
  from jsonb_to_recordset(v_items_final) as i(product_id uuid, qty integer)
  join public.products p
    on p.id = i.product_id and p.business_id = v_business_id;

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
    v_business_id, v_customer_id, p_ongkir, p_dp, v_metode, p_due_date
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, business_id, product_id, qty, harga_satuan)
  select v_order_id, v_business_id, p.id, i.qty, p.harga_jual
  from jsonb_to_recordset(v_items_final) as i(product_id uuid, qty integer)
  join public.products p
    on p.id = i.product_id and p.business_id = v_business_id;

  return v_order_id;
end;
$$;

revoke all on function public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text[], timestamptz
) from public;
revoke all on function public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text[], timestamptz
) from anon;
grant execute on function public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text[], timestamptz
) to authenticated;
