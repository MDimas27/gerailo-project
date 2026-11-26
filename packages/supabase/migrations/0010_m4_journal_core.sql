create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete restrict,
  kejadian text not null check (kejadian in ('T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12')),
  tanggal timestamptz not null default now(),
  order_id uuid references public.orders(id) on delete restrict,
  reversi_dari_id uuid references public.journal_entries(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  account_id uuid not null references public.accounts(id) on delete restrict,
  tanggal timestamptz not null default now(),
  debit bigint not null default 0 check (debit >= 0),
  kredit bigint not null default 0 check (kredit >= 0),
  check (debit > 0 or kredit > 0)
);

create index journal_entries_business_tanggal_idx
on public.journal_entries (business_id, tanggal desc);

create index journal_lines_entry_idx
on public.journal_lines (entry_id);

create index journal_lines_business_account_tanggal_idx
on public.journal_lines (business_id, account_id, tanggal);

create or replace function public._assert_journal_balanced()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_entry_business uuid;
  v_line_business uuid;
  v_debit bigint;
  v_kredit bigint;
  v_count integer;
begin
  v_line_business := coalesce(new.business_id, old.business_id);

  select business_id into v_entry_business
  from public.journal_entries
  where id = coalesce(new.entry_id, old.entry_id);

  if v_entry_business is null or v_entry_business <> v_line_business then
    raise exception 'JURNAL_BUSINESS_ID_TIDAK_KONSISTEN' using errcode = '22023';
  end if;

  select coalesce(sum(debit), 0)::bigint,
    coalesce(sum(kredit), 0)::bigint,
    count(*)::int
  into v_debit, v_kredit, v_count
  from public.journal_lines
  where entry_id = coalesce(new.entry_id, old.entry_id);

  if v_count = 0 or v_debit <> v_kredit then
    raise exception 'JURNAL_TIDAK_SEIMBANG' using errcode = '22023';
  end if;

  return null;
end;
$$;

create constraint trigger journal_lines_balance
after insert or update or delete on public.journal_lines
deferrable initially deferred
for each row execute function public._assert_journal_balanced();

create or replace function public.post_journal(
  p_business_id uuid,
  p_kejadian text,
  p_tanggal timestamptz,
  p_order_id uuid,
  p_reversi_dari_id uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_line jsonb;
  v_akun_id uuid;
  v_debit bigint;
  v_kredit bigint;
  v_total_debit bigint := 0;
  v_total_kredit bigint := 0;
  v_reversi_business uuid;
  v_reversi_count integer;
begin
  if p_business_id is null or p_tanggal is null then
    raise exception 'JURNAL_PARAMETER_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_kejadian = 'T0' or p_kejadian not in ('T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12') then
    raise exception 'KEJADIAN_JURNAL_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'JURNAL_BARIS_TIDAK_VALID' using errcode = '22023';
  end if;

  if not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'BISNIS_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if p_reversi_dari_id is not null then
    select business_id into v_reversi_business
    from public.journal_entries
    where id = p_reversi_dari_id;

    if v_reversi_business is null or v_reversi_business <> p_business_id then
      raise exception 'REVERSI_JURNAL_TIDAK_VALID' using errcode = '22023';
    end if;

    select count(*)::int into v_reversi_count
    from public.journal_lines
    where entry_id = p_reversi_dari_id;

    if v_reversi_count <> jsonb_array_length(p_lines) then
      raise exception 'REVERSI_JURNAL_TIDAK_VALID' using errcode = '22023';
    end if;
  end if;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    select id into v_akun_id
    from public.accounts
    where business_id = p_business_id
      and kode = v_line->>'account_kode';

    if v_akun_id is null then
      raise exception 'AKUN_JURNAL_TIDAK_DITEMUKAN' using errcode = '22023';
    end if;

    v_debit := (v_line->>'debit')::bigint;
    v_kredit := (v_line->>'kredit')::bigint;

    if v_debit < 0 or v_kredit < 0 or (v_debit = 0 and v_kredit = 0) then
      raise exception 'JURNAL_BARIS_TIDAK_VALID' using errcode = '22023';
    end if;

    if p_reversi_dari_id is not null and not exists (
      select 1
      from public.journal_lines
      where entry_id = p_reversi_dari_id
        and account_id = v_akun_id
        and debit = v_kredit
        and kredit = v_debit
    ) then
      raise exception 'REVERSI_JURNAL_TIDAK_VALID' using errcode = '22023';
    end if;

    v_total_debit := v_total_debit + v_debit;
    v_total_kredit := v_total_kredit + v_kredit;
  end loop;

  if v_total_debit <> v_total_kredit then
    raise exception 'JURNAL_TIDAK_SEIMBANG' using errcode = '22023';
  end if;

  insert into public.journal_entries (business_id, kejadian, tanggal, order_id, reversi_dari_id)
  values (p_business_id, p_kejadian, p_tanggal, p_order_id, p_reversi_dari_id)
  returning id into v_entry_id;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    select id into v_akun_id
    from public.accounts
    where business_id = p_business_id
      and kode = v_line->>'account_kode';

    insert into public.journal_lines (entry_id, business_id, account_id, tanggal, debit, kredit)
    values (
      v_entry_id,
      p_business_id,
      v_akun_id,
      p_tanggal,
      (v_line->>'debit')::bigint,
      (v_line->>'kredit')::bigint
    );
  end loop;

  return v_entry_id;
end;
$$;

alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;

drop policy if exists journal_entries_select_own on public.journal_entries;
create policy journal_entries_select_own
on public.journal_entries for select to authenticated
using (business_id in (select id from public.businesses where owner_id = auth.uid()));

drop policy if exists journal_lines_select_own on public.journal_lines;
create policy journal_lines_select_own
on public.journal_lines for select to authenticated
using (business_id in (select id from public.businesses where owner_id = auth.uid()));

revoke all on public.journal_entries, public.journal_lines from public, anon, authenticated;
grant select on public.journal_entries, public.journal_lines to authenticated, service_role;

revoke all on function public._assert_journal_balanced() from public, anon, authenticated;
revoke all on function public.post_journal(uuid, text, timestamptz, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.post_journal(uuid, text, timestamptz, uuid, uuid, jsonb) to service_role;
