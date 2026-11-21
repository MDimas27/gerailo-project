-- 0002 — M2 produk, varian, alias, stok awal + kuota paket.
-- Stok tidak pernah diedit langsung: semua mutasi lewat RPC record_stock_move.
-- create_product atomik membuat produk + alias + stok awal dalam satu transaksi.

set search_path = public, extensions;

create extension if not exists pg_trgm with schema extensions;

-- Paket kuota + status onboarding. Baris lama dianggap sudah onboarding.
alter table public.businesses
  add column plan text not null default 'FREE'
    check (plan in ('FREE', 'STARTER')),
  add column onboarding_selesai boolean not null default false;

update public.businesses set onboarding_selesai = true;

-- Pemilik hanya boleh mengubah profil; plan hanya lewat service_role/billing.
revoke update on public.businesses from authenticated;
grant update (nama, jenis, metode_bayar, onboarding_selesai)
  on public.businesses to authenticated;

create type public.stock_movement_type as enum ('MASUK', 'KELUAR', 'PENYESUAIAN');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  harga_jual bigint not null check (harga_jual > 0),
  harga_promo bigint
    check (harga_promo is null or (harga_promo > 0 and harga_promo <= harga_jual)),
  foto_paths text[] not null default '{}'::text[]
    check (cardinality(foto_paths) <= 3),
  deskripsi_singkat text
    check (deskripsi_singkat is null or char_length(deskripsi_singkat) <= 280),
  kategori text
    check (kategori is null or char_length(btrim(kategori)) between 1 and 60),
  tampil_katalog boolean not null default false,
  stok_min integer not null default 0 check (stok_min >= 0),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_id_business_id_key unique (id, business_id)
);

create index products_business_aktif_idx
  on public.products (business_id, aktif);
create index products_business_nama_idx
  on public.products (business_id, lower(nama));
create index products_nama_trgm_idx
  on public.products using gin (nama extensions.gin_trgm_ops);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  nama text not null check (char_length(btrim(nama)) between 1 and 80),
  selisih_harga bigint not null default 0,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_product_fkey
    foreign key (product_id, business_id)
    references public.products (id, business_id) on delete cascade
);

create unique index product_variants_product_nama_key
  on public.product_variants (product_id, lower(nama));
create index product_variants_business_idx
  on public.product_variants (business_id);

create table public.product_aliases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  alias text not null
    check (char_length(btrim(alias)) between 1 and 80 and alias = btrim(alias)),
  created_at timestamptz not null default now(),
  constraint product_aliases_product_fkey
    foreign key (product_id, business_id)
    references public.products (id, business_id) on delete cascade
);

-- Unik case-insensitive per usaha: "Kopi Gula" vs "kopi gula" ditolak.
create unique index product_aliases_business_alias_key
  on public.product_aliases (business_id, lower(alias));
create index product_aliases_alias_trgm_idx
  on public.product_aliases using gin (lower(alias) extensions.gin_trgm_ops);
create index product_aliases_product_idx
  on public.product_aliases (product_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  jenis public.stock_movement_type not null,
  qty integer not null,
  harga_beli bigint check (harga_beli is null or harga_beli >= 0),
  alasan text not null check (char_length(btrim(alasan)) between 1 and 200),
  order_id uuid,
  created_at timestamptz not null default now(),
  constraint stock_movements_product_fkey
    foreign key (product_id, business_id)
    references public.products (id, business_id) on delete cascade,
  constraint stock_movements_qty_check check (
    (jenis = 'MASUK' and qty > 0)
    or (jenis = 'KELUAR' and qty < 0)
    or (jenis = 'PENYESUAIAN' and qty <> 0)
  )
);

create index stock_movements_business_product_idx
  on public.stock_movements (business_id, product_id, created_at);
create index stock_movements_order_idx
  on public.stock_movements (order_id);

-- Saldo = SUM(qty); security_invoker agar RLS tabel dasar tetap berlaku.
create view public.v_stock_balance
with (security_invoker = true)
as
select
  p.business_id,
  p.id as product_id,
  coalesce(sum(m.qty), 0)::bigint as saldo
from public.products p
left join public.stock_movements m on m.product_id = p.id
group by p.business_id, p.id;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

-- RLS deny-by-default.
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_aliases enable row level security;
alter table public.stock_movements enable row level security;

create policy products_select_own
on public.products
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy products_insert_own
on public.products
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy products_update_own
on public.products
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = products.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_variants_select_own
on public.product_variants
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = product_variants.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_variants_insert_own
on public.product_variants
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = product_variants.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_variants_update_own
on public.product_variants
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = product_variants.business_id
      and b.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = product_variants.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_aliases_select_own
on public.product_aliases
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = product_aliases.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_aliases_insert_own
on public.product_aliases
for insert
to authenticated
with check (
  exists (
    select 1 from public.businesses b
    where b.id = product_aliases.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_aliases_update_own
on public.product_aliases
for update
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = product_aliases.business_id
      and b.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.businesses b
    where b.id = product_aliases.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy product_aliases_delete_own
on public.product_aliases
for delete
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = product_aliases.business_id
      and b.owner_id = (select auth.uid())
  )
);

create policy stock_movements_select_own
on public.stock_movements
for select
to authenticated
using (
  exists (
    select 1 from public.businesses b
    where b.id = stock_movements.business_id
      and b.owner_id = (select auth.uid())
  )
);

-- Kuota paket: lapis kedua setelah validasi UI/RPC.
create or replace function public.enforce_product_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit integer;
  v_active integer;
begin
  if not new.aktif then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.aktif then
    return new;
  end if;

  select coalesce(plan, 'FREE') into v_plan
  from public.businesses
  where id = new.business_id;

  if v_plan is null then
    raise exception 'USAHA_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  v_limit := case v_plan when 'STARTER' then 500 else 100 end;

  select count(*) into v_active
  from public.products
  where business_id = new.business_id
    and aktif = true;

  if v_active >= v_limit then
    raise exception 'PRODUK_QUOTA_TERLAMPAUI'
      using errcode = 'P0001',
        detail = format('Paket %s maksimal %s produk aktif', v_plan, v_limit);
  end if;

  return new;
end;
$$;

create trigger products_enforce_quota
before insert or update of aktif on public.products
for each row execute function public.enforce_product_quota();

-- Mutasi stok: hanya MASUK/PENYESUAIAN. KELUAR menunggu RPC order M4.
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
  v_jenis public.stock_movement_type;
  v_alasan text := btrim(coalesce(p_reason, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select p.business_id into v_business_id
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

  insert into public.stock_movements (
    business_id, product_id, jenis, qty, harga_beli, alasan, order_id
  )
  values (
    v_business_id, p_product_id, v_jenis, p_qty, p_unit_price, v_alasan, p_order_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Produk + alias + stok awal dalam satu transaksi; quota trigger tetap aktif.
create or replace function public.create_product(
  p_business_id uuid,
  p_nama text,
  p_harga_jual bigint,
  p_stok_min integer default 0,
  p_aliases text[] default '{}'::text[],
  p_stok_awal integer default 0,
  p_harga_beli bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nama text := btrim(coalesce(p_nama, ''));
  v_aliases text[];
  v_product_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.businesses
    where id = p_business_id and owner_id = v_uid
  ) then
    raise exception 'USAHA_TIDAK_DITEMUKAN' using errcode = '42501';
  end if;

  if char_length(v_nama) < 1 or char_length(v_nama) > 120 then
    raise exception 'NAMA_PRODUK_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_harga_jual is null or p_harga_jual <= 0 then
    raise exception 'HARGA_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_stok_min is null or p_stok_min < 0 then
    raise exception 'STOK_MIN_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_stok_awal is null or p_stok_awal < 0 then
    raise exception 'STOK_AWAL_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_harga_beli is not null and p_harga_beli < 0 then
    raise exception 'HARGA_BELI_TIDAK_VALID' using errcode = '22023';
  end if;

  -- Rapikan alias: trim, buang kosong, dedup case-insensitive.
  select coalesce(array_agg(alias), '{}'::text[]) into v_aliases
  from (
    select (array_agg(btrim(a)))[1] as alias
    from unnest(coalesce(p_aliases, '{}'::text[])) as a
    where btrim(a) <> ''
    group by lower(btrim(a))
  ) s;

  if exists (
    select 1 from unnest(v_aliases) a where char_length(a) > 80
  ) then
    raise exception 'ALIAS_TIDAK_VALID' using errcode = '22023';
  end if;

  insert into public.products (business_id, nama, harga_jual, stok_min)
  values (p_business_id, v_nama, p_harga_jual, p_stok_min)
  returning id into v_product_id;

  if cardinality(v_aliases) > 0 then
    begin
      insert into public.product_aliases (business_id, product_id, alias)
      select p_business_id, v_product_id, a
      from unnest(v_aliases) as a;
    exception
      when unique_violation then
        raise exception 'ALIAS_DUPLIKAT' using errcode = '23505';
    end;
  end if;

  if p_stok_awal > 0 then
    perform public.record_stock_move(
      p_product_id => v_product_id,
      p_type => 'MASUK',
      p_qty => p_stok_awal,
      p_unit_price => p_harga_beli,
      p_reason => 'stok awal'
    );
  end if;

  return v_product_id;
end;
$$;

-- Hak akses tabel: RLS tetap penentu; stok tidak boleh ditulis langsung.
grant select on public.products, public.product_variants,
  public.product_aliases, public.stock_movements, public.v_stock_balance
  to authenticated;
grant insert, update on public.products to authenticated;
grant insert, update on public.product_variants to authenticated;
grant insert, update, delete on public.product_aliases to authenticated;

revoke insert, update, delete on public.stock_movements from authenticated;
revoke delete on public.products, public.product_variants from authenticated;
revoke all on public.products, public.product_variants, public.product_aliases,
  public.stock_movements, public.v_stock_balance from anon;

revoke all on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  from public;
revoke all on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  from anon;
grant execute on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  to authenticated;

revoke all on function public.create_product(uuid, text, bigint, integer, text[], integer, bigint)
  from public;
revoke all on function public.create_product(uuid, text, bigint, integer, text[], integer, bigint)
  from anon;
grant execute on function public.create_product(uuid, text, bigint, integer, text[], integer, bigint)
  to authenticated;
