create table public.payment_event_verifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.payment_events (id) on delete restrict,
  signature_status text not null
    check (signature_status in ('VERIFIED', 'INVALID')),
  diverifikasi_pada timestamptz not null default now(),
  unique (event_id, signature_status)
);

alter table public.payment_event_verifications enable row level security;

revoke all on public.payment_event_verifications
  from public, anon, authenticated, service_role;

create or replace function public.mark_payment_event_verified(
  p_event_id text,
  p_signature_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id text := btrim(coalesce(p_event_id, ''));
  v_signature_status text := upper(btrim(coalesce(p_signature_status, '')));
  v_event_uuid uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'AKSES_DITOLAK' using errcode = '42501';
  end if;

  if v_signature_status not in ('VERIFIED', 'INVALID') then
    raise exception 'STATUS_TANDA_TANGAN_TIDAK_VALID' using errcode = '22023';
  end if;

  select id into v_event_uuid
  from public.payment_events
  where event_id = v_event_id;

  if not found then
    raise exception 'EVENT_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  insert into public.payment_event_verifications (event_id, signature_status)
  values (v_event_uuid, v_signature_status)
  on conflict (event_id, signature_status) do nothing;
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
  v_verifikasi text;
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

  select ver.signature_status into v_verifikasi
  from public.payment_event_verifications ver
  where ver.event_id = v_event.id
  order by ver.diverifikasi_pada desc, ver.id desc
  limit 1;

  if coalesce(v_verifikasi, v_event.signature_status) <> 'VERIFIED' then
    if coalesce(v_verifikasi, v_event.signature_status) = 'INVALID' then
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

revoke all on function public.mark_payment_event_verified(text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.mark_payment_event_verified(text, text)
  to service_role;

revoke all on function public.apply_payment_event(text, text, bigint, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_payment_event(text, text, bigint, text, text, text)
  to service_role;
