-- 0003 — fondasi M3 Smart Paste: draft order atomik, kuota AI, log ekstraksi.
-- Konfirmasi HANYA lewat RPC confirm_draft_order: harga selalu diambil dari
-- products, klien tidak pernah mengirim harga/total. Tanpa service_role: semua
-- akses lewat JWT user + RLS + RPC SECURITY DEFINER yang memeriksa auth.uid().

set search_path = public, extensions;

-- Consent usaha untuk menyimpan teks chat asli (rules/02 §7).
alter table public.businesses
  add column pdpr_consent_at timestamptz;

-- Periode kuota AI; reset dilakukan lazy di claim_ai_quota (tanpa cron).
alter table public.app_settings
  add column kuota_ai_periode date not null
    default date_trunc('month', now())::date;

grant update (pdpr_consent_at) on public.businesses to authenticated;

create type public.order_status as enum (
  'DRAFT', 'DIKONFIRMASI', 'DP_DITERIMA', 'SIAP_DIKIRIM', 'DIKIRIM', 'SELESAI', 'BATAL'
);

create or replace function public.normalize_telepon(p_telepon text)
returns text
language sql
immutable
set search_path = public
as $$
  with d as (
    select regexp_replace(coalesce(p_telepon, ''), '\D', '', 'g') as digits
  )
  select case
    when digits ~ '^0[0-9]{9,13}$' then '62' || substring(digits from 2)
    when digits ~ '^62[0-9]{8,13}$' then digits
    else null
  end
  from d;
$$;

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  telepon text not null check (telepon ~ '^628[0-9]{6,12}$'),
  alamat text check (alamat is null or char_length(alamat) <= 300),
  catatan text check (catatan is null or char_length(catatan) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_id_business_id_key unique (id, business_id),
  unique (business_id, telepon)
);

create index customers_business_idx on public.customers (business_id);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid not null,
  status public.order_status not null default 'DRAFT',
  ongkir bigint not null default 0 check (ongkir >= 0),
  dp bigint not null default 0 check (dp >= 0),
  metode_bayar text not null default 'TRANSFER'
    check (metode_bayar in ('TRANSFER', 'COD', 'QRIS', 'LAINNYA')),
  nomor text not null,
  share_token text not null,
  kurir_nama text,
  nomor_resi text,
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_id_business_id_key unique (id, business_id),
  constraint orders_customer_fkey foreign key (customer_id, business_id)
    references public.customers (id, business_id) on delete restrict,
  constraint orders_nomor_key unique (business_id, nomor),
  constraint orders_share_token_key unique (share_token),
  constraint orders_share_token_format check (share_token ~ '^[0-9a-f]{32}$')
);

create index orders_business_status_created_idx
  on public.orders (business_id, status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  business_id uuid not null,
  product_id uuid not null,
  variant_id uuid,
  qty integer not null check (qty > 0 and qty <= 1000),
  harga_satuan bigint not null check (harga_satuan > 0),
  created_at timestamptz not null default now(),
  constraint order_items_order_fkey foreign key (order_id, business_id)
    references public.orders (id, business_id) on delete cascade,
  constraint order_items_product_fkey foreign key (product_id, business_id)
    references public.products (id, business_id) on delete restrict,
  constraint order_items_variant_fkey foreign key (variant_id)
    references public.product_variants (id) on delete restrict
);

create index order_items_order_idx on public.order_items (order_id);

create table public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  sumber text not null check (sumber in ('PARSER', 'AI')),
  skor numeric not null check (skor >= 0 and skor <= 1),
  token integer not null default 0 check (token >= 0),
  model text,
  simpan_teks boolean not null default false,
  teks_asli text check (
    teks_asli is null or (simpan_teks and char_length(teks_asli) <= 8000)
  ),
  dikoreksi boolean not null default false,
  created_at timestamptz not null default now()
);

create index ai_usage_logs_business_created_idx
  on public.ai_usage_logs (business_id, created_at desc);
create index ai_usage_logs_business_sumber_idx
  on public.ai_usage_logs (business_id, sumber);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Nomor ORD-YYYYMMDD-### unik per usaha per hari + token 128-bit dari database.
create or replace function public.set_order_nomor_token()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_tanggal text := to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD');
  v_urutan integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(new.business_id::text || v_tanggal, 0)
  );

  select count(*) + 1 into v_urutan
  from public.orders
  where business_id = new.business_id
    and nomor like 'ORD-' || v_tanggal || '-%';

  new.nomor := format('ORD-%s-%s', v_tanggal, lpad(v_urutan::text, 3, '0'));
  new.share_token := encode(gen_random_bytes(16), 'hex');
  return new;
end;
$$;

create trigger orders_set_nomor_token
before insert on public.orders
for each row execute function public.set_order_nomor_token();

-- RLS deny-by-default; tulis hanya lewat RPC SECURITY DEFINER.
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ai_usage_logs enable row level security;

create policy customers_select_own
on public.customers
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = customers.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy orders_select_own
on public.orders
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = orders.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy order_items_select_own
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    join public.businesses b on b.id = o.business_id
    where o.id = order_items.order_id
      and o.business_id = order_items.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy ai_usage_logs_select_own
on public.ai_usage_logs
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = ai_usage_logs.business_id
      and b.owner_id = (select auth.uid())
  )
);

revoke all on public.customers, public.orders, public.order_items,
  public.ai_usage_logs from authenticated;
revoke all on public.customers, public.orders, public.order_items,
  public.ai_usage_logs from anon;
grant select on public.customers, public.orders, public.order_items,
  public.ai_usage_logs to authenticated;

-- Satu transaksi: customer (dedup) + order DRAFT + items. Harga dari products.
create or replace function public.confirm_draft_order(
  p_items jsonb,
  p_ongkir bigint,
  p_dp bigint,
  p_nama text,
  p_telepon text,
  p_alamat text default null,
  p_catatan text default null,
  p_metode_bayar text default 'TRANSFER',
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
  v_metode text := upper(btrim(coalesce(p_metode_bayar, 'TRANSFER')));
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

  if v_metode not in ('TRANSFER', 'COD', 'QRIS', 'LAINNYA') then
    raise exception 'METODE_BAYAR_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_ongkir is null or p_ongkir < 0 then
    raise exception 'ONGKIR_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_dp is null or p_dp < 0 then
    raise exception 'DP_TIDAK_VALID' using errcode = '22023';
  end if;

  -- Klien hanya boleh mengirim product_id + qty.
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

-- Klaim kuota AI + log, atomik: kunci baris, reset lazy bila periode berganti.
create or replace function public.claim_ai_quota(
  p_model text,
  p_tokens integer,
  p_skor numeric,
  p_teks_asli text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_plan text;
  v_consent boolean;
  v_limit integer;
  v_used integer;
  v_periode date;
  v_bulan_ini date := date_trunc('month', now())::date;
  v_simpan boolean;
  v_log_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select b.id, b.plan, b.pdpr_consent_at is not null
  into v_business_id, v_plan, v_consent
  from public.businesses b
  where b.owner_id = v_uid;

  if v_business_id is null then
    raise exception 'USAHA_TIDAK_DITEMUKAN' using errcode = '42501';
  end if;

  if p_tokens is null or p_tokens < 0 then
    raise exception 'TOKEN_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_skor is null or p_skor < 0 or p_skor > 1 then
    raise exception 'SKOR_TIDAK_VALID' using errcode = '22023';
  end if;

  select kuota_ai_terpakai, kuota_ai_periode
  into v_used, v_periode
  from public.app_settings
  where business_id = v_business_id
  for update;

  if v_periode <> v_bulan_ini then
    v_used := 0;
    update public.app_settings
    set kuota_ai_terpakai = 0, kuota_ai_periode = v_bulan_ini
    where business_id = v_business_id;
  end if;

  v_limit := case coalesce(v_plan, 'FREE') when 'STARTER' then 300 else 0 end;

  if v_used >= v_limit then
    raise exception 'AI_QUOTA_EXCEEDED'
      using errcode = 'P0001',
        detail = format('Paket %s tidak memiliki kuota AI bulan ini', v_plan);
  end if;

  v_simpan := v_consent
    and p_teks_asli is not null
    and char_length(p_teks_asli) <= 8000;

  insert into public.ai_usage_logs (
    business_id, sumber, skor, token, model, simpan_teks, teks_asli
  )
  values (
    v_business_id, 'AI', p_skor, p_tokens, p_model, v_simpan,
    case when v_simpan then p_teks_asli else null end
  )
  returning id into v_log_id;

  update public.app_settings
  set kuota_ai_terpakai = kuota_ai_terpakai + 1
  where business_id = v_business_id;

  return v_log_id;
end;
$$;

-- Log ekstraksi parser pola: tidak memakai kuota AI.
create or replace function public.log_parser_extraction(
  p_skor numeric,
  p_teks_asli text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_consent boolean;
  v_simpan boolean;
  v_log_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select b.id, b.pdpr_consent_at is not null
  into v_business_id, v_consent
  from public.businesses b
  where b.owner_id = v_uid;

  if v_business_id is null then
    raise exception 'USAHA_TIDAK_DITEMUKAN' using errcode = '42501';
  end if;

  if p_skor is null or p_skor < 0 or p_skor > 1 then
    raise exception 'SKOR_TIDAK_VALID' using errcode = '22023';
  end if;

  v_simpan := v_consent
    and p_teks_asli is not null
    and char_length(p_teks_asli) <= 8000;

  insert into public.ai_usage_logs (
    business_id, sumber, skor, token, model, simpan_teks, teks_asli
  )
  values (
    v_business_id, 'PARSER', p_skor, 0, null, v_simpan,
    case when v_simpan then p_teks_asli else null end
  )
  returning id into v_log_id;

  return v_log_id;
end;
$$;

create or replace function public.mark_extraction_corrected(p_log_id uuid)
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

  update public.ai_usage_logs l
  set dikoreksi = true
  from public.businesses b
  where l.id = p_log_id
    and l.business_id = b.id
    and b.owner_id = v_uid;

  if not found then
    raise exception 'LOG_TIDAK_DITEMUKAN' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text, timestamptz
) from public;
revoke all on function public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text, timestamptz
) from anon;
grant execute on function public.confirm_draft_order(
  jsonb, bigint, bigint, text, text, text, text, text, timestamptz
) to authenticated;

revoke all on function public.claim_ai_quota(text, integer, numeric, text) from public;
revoke all on function public.claim_ai_quota(text, integer, numeric, text) from anon;
grant execute on function public.claim_ai_quota(text, integer, numeric, text) to authenticated;

revoke all on function public.log_parser_extraction(numeric, text) from public;
revoke all on function public.log_parser_extraction(numeric, text) from anon;
grant execute on function public.log_parser_extraction(numeric, text) to authenticated;

revoke all on function public.mark_extraction_corrected(uuid) from public;
revoke all on function public.mark_extraction_corrected(uuid) from anon;
grant execute on function public.mark_extraction_corrected(uuid) to authenticated;
