create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null,
  provider text not null check (provider = 'MIDTRANS'),
  provider_order_id text not null unique,
  amount bigint not null check (amount > 0),
  jenis text not null check (jenis in ('DP', 'PELUNASAN')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
  expiry timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  constraint payment_intents_order_fkey foreign key (order_id, business_id)
    references public.orders (id, business_id) on delete cascade
);

create unique index payment_intents_order_pending_uidx
  on public.payment_intents (order_id)
  where status = 'PENDING';

create index payment_intents_business_created_idx
  on public.payment_intents (business_id, created_at desc);

create trigger payment_intents_set_updated_at
before update on public.payment_intents
for each row execute function public.set_updated_at();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'MIDTRANS'),
  event_id text not null,
  payload jsonb not null,
  signature_status text not null
    check (signature_status in ('UNVERIFIED', 'VERIFIED', 'INVALID')),
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.payment_event_outcomes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  order_id uuid not null,
  provider text not null check (provider = 'MIDTRANS'),
  event_id text not null,
  outcome text not null check (outcome in ('POSTED', 'IGNORED', 'REJECTED')),
  payment_id uuid,
  detail text,
  created_at timestamptz not null default now(),
  unique (order_id, event_id),
  unique (provider, event_id),
  constraint payment_event_outcomes_order_fkey foreign key (order_id, business_id)
    references public.orders (id, business_id) on delete cascade,
  constraint payment_event_outcomes_payment_fkey foreign key (payment_id, business_id)
    references public.payments (id, business_id) on delete set null
);

create index payment_event_outcomes_order_created_idx
  on public.payment_event_outcomes (order_id, created_at desc);

alter table public.payment_intents enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_event_outcomes enable row level security;

create policy payment_intents_select_own
on public.payment_intents
for select
to authenticated
using (
  exists (
    select 1
    from public.businesses b
    where b.id = payment_intents.business_id
      and b.owner_id = (select auth.uid())
  )
);

revoke all on public.payment_intents from public, anon, authenticated, service_role;
revoke all on public.payment_events from public, anon, authenticated, service_role;
revoke all on public.payment_event_outcomes from public, anon, authenticated, service_role;
grant select on public.payment_intents to authenticated;

create or replace function public.create_payment_intent(
  p_order_id uuid,
  p_jenis text default 'PELUNASAN',
  p_expiry_minutes integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_status public.order_status;
  v_jenis text := upper(btrim(coalesce(p_jenis, 'PELUNASAN')));
  v_total bigint;
  v_sudah bigint;
  v_amount bigint;
  v_dp bigint;
  v_provider_order_id text;
  v_menit integer := least(greatest(coalesce(p_expiry_minutes, 30), 5), 1440);
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if v_jenis not in ('DP', 'PELUNASAN') then
    raise exception 'JENIS_INTENT_TIDAK_VALID' using errcode = '22023';
  end if;

  v_business_id := public._assert_order_owner(p_order_id);

  select status, dp
  into v_status, v_dp
  from public.orders
  where id = p_order_id;

  if v_status not in ('DIKONFIRMASI', 'DP_DITERIMA') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  v_total := public._order_total(p_order_id);

  select coalesce(sum(jumlah), 0)::bigint
  into v_sudah
  from public.payments
  where order_id = p_order_id;

  if v_sudah >= v_total then
    raise exception 'ORDER_SUDAH_LUNAS' using errcode = '22023';
  end if;

  v_amount := v_total - v_sudah;

  if v_jenis = 'DP' and coalesce(v_dp, 0) > 0 and v_dp < v_amount then
    v_amount := v_dp;
  end if;

  v_provider_order_id := 'GR-' || replace(gen_random_uuid()::text, '-', '');

  insert into public.payment_intents (
    business_id, order_id, provider, provider_order_id, amount, jenis, expiry
  )
  values (
    v_business_id,
    p_order_id,
    'MIDTRANS',
    v_provider_order_id,
    v_amount,
    v_jenis,
    now() + (v_menit || ' minutes')::interval
  );

  return jsonb_build_object(
    'provider_order_id', v_provider_order_id,
    'amount', v_amount::text,
    'order_id', p_order_id::text,
    'jenis', v_jenis
  );
end;
$$;

create or replace function public.log_payment_event(
  p_provider text,
  p_event_id text,
  p_payload jsonb,
  p_signature_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := upper(btrim(coalesce(p_provider, '')));
  v_event_id text := btrim(coalesce(p_event_id, ''));
  v_signature_status text := upper(btrim(coalesce(p_signature_status, '')));
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'AKSES_DITOLAK' using errcode = '42501';
  end if;

  if v_provider <> 'MIDTRANS' then
    raise exception 'PROVIDER_TIDAK_VALID' using errcode = '22023';
  end if;

  if char_length(v_event_id) < 4 or char_length(v_event_id) > 200 then
    raise exception 'EVENT_ID_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'PAYLOAD_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_signature_status not in ('UNVERIFIED', 'VERIFIED', 'INVALID') then
    raise exception 'STATUS_TANDA_TANGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  insert into public.payment_events (provider, event_id, payload, signature_status)
  values (v_provider, v_event_id, p_payload, v_signature_status)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.apply_payment_event(
  p_event_id text,
  p_provider_order_id text,
  p_gross_amount bigint,
  p_transaction_status text,
  p_status_code text,
  p_fraud_status text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.payment_events%rowtype;
  v_intent public.payment_intents%rowtype;
  v_status text := lower(btrim(coalesce(p_transaction_status, '')));
  v_fraud text := upper(btrim(coalesce(p_fraud_status, '')));
  v_existing text;
  v_success boolean;
  v_outcome text;
  v_payment_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'AKSES_DITOLAK' using errcode = '42501';
  end if;

  select * into v_event
  from public.payment_events
  where provider = 'MIDTRANS' and event_id = p_event_id;

  if not found then
    raise exception 'EVENT_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if v_event.signature_status <> 'VERIFIED' then
    if v_event.signature_status = 'INVALID' then
      raise exception 'TANDA_TANGAN_TIDAK_VALID' using errcode = '22023';
    end if;

    raise exception 'EVENT_BELUM_VERIFIED' using errcode = '22023';
  end if;

  select * into v_intent
  from public.payment_intents
  where provider = 'MIDTRANS' and provider_order_id = p_provider_order_id;

  if not found then
    raise exception 'INTENT_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  select outcome into v_existing
  from public.payment_event_outcomes
  where order_id = v_intent.order_id and event_id = p_event_id;

  if found then
    return v_existing;
  end if;

  if p_gross_amount is null or p_gross_amount <> v_intent.amount then
    raise exception 'NOMINAL_TIDAK_COCOK' using errcode = '22023';
  end if;

  if v_intent.status <> 'PENDING' then
    raise exception 'INTENT_TIDAK_AKTIF' using errcode = '22023';
  end if;

  if now() > v_intent.expiry then
    update public.payment_intents set status = 'EXPIRED' where id = v_intent.id;
    insert into public.payment_event_outcomes (
      business_id, order_id, provider, event_id, outcome, detail
    )
    values (
      v_intent.business_id, v_intent.order_id, 'MIDTRANS', p_event_id,
      'IGNORED', 'INTENT_EXPIRED'
    );
    return 'IGNORED';
  end if;

  v_success := btrim(coalesce(p_status_code, '')) = '200'
    and (v_fraud = '' or v_fraud = 'ACCEPT')
    and v_status in ('settlement', 'capture');

  if not v_success then
    v_outcome := 'IGNORED';

    update public.payment_intents
    set status = case
      when v_status in ('expire') then 'EXPIRED'
      when v_status in ('cancel', 'deny') then 'CANCELLED'
      else status
    end
    where id = v_intent.id;

    insert into public.payment_event_outcomes (
      business_id, order_id, provider, event_id, outcome, detail
    )
    values (
      v_intent.business_id, v_intent.order_id, 'MIDTRANS', p_event_id,
      v_outcome,
      format('STATUS=%s;KODE=%s;FRAUD=%s', v_status, p_status_code, v_fraud)
    );

    return v_outcome;
  end if;

  v_payment_id := public._post_payment(
    v_intent.order_id,
    v_intent.jenis,
    v_intent.amount,
    'MIDTRANS',
    null
  );

  update public.payment_intents set status = 'PAID' where id = v_intent.id;

  insert into public.payment_event_outcomes (
    business_id, order_id, provider, event_id, outcome, payment_id, detail
  )
  values (
    v_intent.business_id, v_intent.order_id, 'MIDTRANS', p_event_id,
    'POSTED', v_payment_id, format('TRANSAKSI=%s', v_status)
  );

  return 'POSTED';
end;
$$;

revoke all on function public.create_payment_intent(uuid, text, integer)
  from public, anon, service_role;
grant execute on function public.create_payment_intent(uuid, text, integer)
  to authenticated;

revoke all on function public.log_payment_event(text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.log_payment_event(text, text, jsonb, text)
  to service_role;

revoke all on function public.apply_payment_event(text, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_payment_event(text, text, bigint, text, text, text)
  to service_role;
