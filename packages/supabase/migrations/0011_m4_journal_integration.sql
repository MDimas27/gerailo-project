alter table public.products
  add column hpp_rata_rata bigint not null default 0 check (hpp_rata_rata >= 0);

alter table public.stock_movements
  add constraint stock_movements_order_fkey
  foreign key (order_id) references public.orders (id) on delete restrict
  not valid;

create unique index stock_movements_keluar_order_produk_key
on public.stock_movements (order_id, product_id)
where jenis = 'KELUAR' and order_id is not null;

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
  v_qty_lama integer;
  v_hpp_lama bigint;
  v_hpp_baru bigint;
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

  select coalesce(sum(qty), 0)::integer into v_qty_lama
  from public.stock_movements
  where product_id = p_product_id;

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

create or replace function public._journal_event(
  p_business_id uuid,
  p_kejadian text,
  p_tanggal timestamptz,
  p_order_id uuid,
  p_total bigint,
  p_ongkir bigint,
  p_dp bigint,
  p_hpp bigint,
  p_biaya bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lines jsonb := '[]'::jsonb;
  v_pendapatan bigint;
  v_piutang bigint;
  v_sisa bigint;
begin
  if p_business_id is null or p_tanggal is null or p_total is null or p_total < 0 then
    raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
  end if;

  if coalesce(p_ongkir, 0) < 0 or coalesce(p_dp, 0) < 0
    or coalesce(p_hpp, 0) < 0 or coalesce(p_biaya, 0) < 0
  then
    raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_kejadian = 'T2' and (p_ongkir > p_total or p_dp > p_total) then
    raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
  end if;

  case p_kejadian
    when 'T1' then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '1-1010', 'debit', p_total, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '2-2010', 'debit', 0::bigint, 'kredit', p_total)
      );
    when 'T2' then
      v_pendapatan := p_total - p_ongkir;
      v_piutang := p_total - p_dp;

      if p_dp > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '2-2010', 'debit', p_dp, 'kredit', 0::bigint)
        );
      end if;

      if v_piutang > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '1-1030', 'debit', v_piutang, 'kredit', 0::bigint)
        );
      end if;

      if v_pendapatan > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '4-4010', 'debit', 0::bigint, 'kredit', v_pendapatan)
        );
      end if;

      if p_ongkir > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '4-4020', 'debit', 0::bigint, 'kredit', p_ongkir)
        );
      end if;
    when 'T3' then
      if p_hpp <= 0 then
        raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
      end if;

      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '5-5010', 'debit', p_hpp, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '1-1040', 'debit', 0::bigint, 'kredit', p_hpp)
      );
    when 'T4' then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '1-1010', 'debit', p_total, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '1-1030', 'debit', 0::bigint, 'kredit', p_total)
      );
    when 'T5' then
      if p_ongkir > p_total then
        raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
      end if;

      v_pendapatan := p_total - p_ongkir;

      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_kode', '1-1010', 'debit', p_total, 'kredit', 0::bigint)
      );

      if v_pendapatan > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '4-4010', 'debit', 0::bigint, 'kredit', v_pendapatan)
        );
      end if;

      if p_ongkir > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '4-4020', 'debit', 0::bigint, 'kredit', p_ongkir)
        );
      end if;
    when 'T6' then
      if p_dp > p_total or p_ongkir > p_total then
        raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
      end if;

      v_sisa := p_total - p_dp;
      v_pendapatan := p_total - p_ongkir;

      if v_sisa > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '1-1010', 'debit', v_sisa, 'kredit', 0::bigint)
        );
      end if;

      if p_dp > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '2-2010', 'debit', p_dp, 'kredit', 0::bigint)
        );
      end if;

      if v_pendapatan > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '4-4010', 'debit', 0::bigint, 'kredit', v_pendapatan)
        );
      end if;

      if p_ongkir > 0 then
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object('account_kode', '4-4020', 'debit', 0::bigint, 'kredit', p_ongkir)
        );
      end if;
    when 'T7' then
      if p_biaya <= 0 then
        raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
      end if;

      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '6-6010', 'debit', p_biaya, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '2-2030', 'debit', 0::bigint, 'kredit', p_biaya)
      );
    when 'T8' then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '1-1040', 'debit', p_total, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '1-1010', 'debit', 0::bigint, 'kredit', p_total)
      );
    when 'T9' then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '6-6040', 'debit', p_total, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '1-1010', 'debit', 0::bigint, 'kredit', p_total)
      );
    when 'T10' then
      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '3-3020', 'debit', p_total, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '1-1010', 'debit', 0::bigint, 'kredit', p_total)
      );
    when 'T12' then
      if p_biaya <= 0 then
        raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
      end if;

      v_lines := jsonb_build_array(
        jsonb_build_object('account_kode', '6-6050', 'debit', p_biaya, 'kredit', 0::bigint),
        jsonb_build_object('account_kode', '1-1020', 'debit', 0::bigint, 'kredit', p_biaya)
      );
    else
      raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
  end case;

  if jsonb_array_length(v_lines) < 2 then
    raise exception 'JURNAL_TEMPLATE_TIDAK_VALID' using errcode = '22023';
  end if;

  return public.post_journal(
    p_business_id,
    p_kejadian,
    p_tanggal,
    p_order_id,
    null,
    v_lines
  );
end;
$$;

drop function if exists public._post_payment(uuid, text, bigint, text, text);

create or replace function public._post_payment(
  p_order_id uuid,
  p_jenis text,
  p_jumlah bigint,
  p_kanal text,
  p_bukti_path text default null,
  p_biaya_gateway bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jenis text := upper(btrim(coalesce(p_jenis, '')));
  v_kanal text := upper(btrim(coalesce(p_kanal, '')));
  v_status public.order_status;
  v_total bigint;
  v_sudah bigint;
  v_payment_id uuid;
  v_business_id uuid;
  v_tanggal timestamptz := now();
begin
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'PEMBAYARAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis not in ('DP', 'PELUNASAN', 'COD') then
    raise exception 'JENIS_PEMBAYARAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_kanal not in ('MANUAL', 'COD', 'QRIS', 'VA', 'E_WALLET', 'MIDTRANS', 'LAINNYA') then
    raise exception 'KANAL_PEMBAYARAN_TIDAK_VALID' using errcode = '22023';
  end if;

  if p_biaya_gateway is null or p_biaya_gateway < 0 then
    raise exception 'BIAYA_GATEWAY_TIDAK_VALID' using errcode = '22023';
  end if;

  select o.status, o.business_id into v_status, v_business_id
  from public.orders o
  where o.id = p_order_id;

  if v_status is null then
    raise exception 'ORDER_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  if v_status in ('SELESAI', 'BATAL') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis = 'DP' and v_status in ('SIAP_DIKIRIM', 'DIKIRIM') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  if v_jenis = 'COD' and v_status <> 'DIKIRIM' then
    raise exception 'COD_HANYA_SAAT_KIRIM' using errcode = '22023';
  end if;

  v_total := public._order_total(p_order_id);

  select coalesce(sum(jumlah), 0)::bigint
  into v_sudah
  from public.payments
  where order_id = p_order_id;

  if p_jumlah > v_total - v_sudah then
    raise exception 'PEMBAYARAN_MELEBIHI_TOTAL' using errcode = '22023';
  end if;

  insert into public.payments (business_id, order_id, jenis, jumlah, kanal, bukti_path)
  select o.business_id, o.id, v_jenis, p_jumlah, v_kanal, p_bukti_path
  from public.orders o
  where o.id = p_order_id
  returning id into v_payment_id;

  if v_jenis = 'DP' then
    perform public._journal_event(
      v_business_id, 'T1', v_tanggal, p_order_id, p_jumlah,
      0::bigint, 0::bigint, 0::bigint, 0::bigint
    );
  elsif v_jenis = 'PELUNASAN' then
    if v_status in ('DIKIRIM', 'SELESAI') then
      perform public._journal_event(
        v_business_id, 'T4', v_tanggal, p_order_id, p_jumlah,
        0::bigint, 0::bigint, 0::bigint, 0::bigint
      );
    else
      perform public._journal_event(
        v_business_id, 'T1', v_tanggal, p_order_id, p_jumlah,
        0::bigint, 0::bigint, 0::bigint, 0::bigint
      );
    end if;
  end if;

  if p_biaya_gateway > 0 then
    perform public._journal_event(
      v_business_id, 'T12', v_tanggal, p_order_id, p_biaya_gateway,
      0::bigint, 0::bigint, 0::bigint, p_biaya_gateway
    );
  end if;

  if v_sudah + p_jumlah >= v_total then
    if v_status = 'DIKIRIM' or v_jenis = 'COD' then
      update public.orders set status = 'SELESAI' where id = p_order_id;
    elsif v_status <> 'SIAP_DIKIRIM' then
      update public.orders set status = 'DP_DITERIMA' where id = p_order_id;
    end if;
  elsif v_status = 'DIKONFIRMASI' then
    update public.orders set status = 'DP_DITERIMA' where id = p_order_id;
  end if;

  return v_payment_id;
end;
$$;

drop function if exists public.record_payment(uuid, text, bigint, text, text);

create or replace function public.record_payment(
  p_order_id uuid,
  p_jenis text,
  p_jumlah bigint,
  p_kanal text,
  p_bukti_path text default null,
  p_biaya_gateway bigint default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._assert_order_owner(p_order_id);
  return public._post_payment(
    p_order_id, p_jenis, p_jumlah, p_kanal, p_bukti_path, p_biaya_gateway
  );
end;
$$;

drop function if exists public.ship_order(uuid, text, text);

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

create or replace function public._reverse_journal(p_entry_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_order_id uuid;
  v_lines jsonb := '[]'::jsonb;
  v_line record;
begin
  select business_id, order_id into v_business_id, v_order_id
  from public.journal_entries
  where id = p_entry_id;

  if v_business_id is null then
    raise exception 'JURNAL_ASAL_TIDAK_DITEMUKAN' using errcode = '22023';
  end if;

  for v_line in
    select a.kode, jl.debit, jl.kredit
    from public.journal_lines jl
    join public.accounts a on a.id = jl.account_id
    where jl.entry_id = p_entry_id
  loop
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'account_kode', v_line.kode,
        'debit', v_line.kredit,
        'kredit', v_line.debit
      )
    );
  end loop;

  if jsonb_array_length(v_lines) < 2 then
    raise exception 'REVERSI_JURNAL_TIDAK_VALID' using errcode = '22023';
  end if;

  return public.post_journal(
    v_business_id, 'T11', now(), v_order_id, p_entry_id, v_lines
  );
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
  v_entry record;
begin
  perform public._assert_order_owner(p_order_id);

  select status into v_status
  from public.orders
  where id = p_order_id;

  if v_status not in ('DRAFT', 'DIKONFIRMASI', 'DP_DITERIMA', 'SIAP_DIKIRIM') then
    raise exception 'TRANSISI_TIDAK_VALID' using errcode = '22023';
  end if;

  for v_entry in
    select id
    from public.journal_entries
    where order_id = p_order_id
      and reversi_dari_id is null
      and kejadian in ('T1', 'T4', 'T7', 'T12')
  loop
    perform public._reverse_journal(v_entry.id);
  end loop;

  update public.orders set status = 'BATAL' where id = p_order_id;
end;
$$;

create or replace view public.v_rekap_harian
with (security_invoker = true)
as
select
  jl.business_id,
  jl.tanggal::date as tanggal,
  coalesce(sum(
    case when a.kode in ('4-4010', '4-4020') then jl.kredit - jl.debit else 0 end
  ), 0)::bigint as pendapatan,
  coalesce(sum(
    case when a.kode = '5-5010' then jl.debit - jl.kredit else 0 end
  ), 0)::bigint as hpp,
  (coalesce(sum(
    case when a.kode in ('4-4010', '4-4020') then jl.kredit - jl.debit else 0 end
  ), 0) - coalesce(sum(
    case when a.kode = '5-5010' then jl.debit - jl.kredit else 0 end
  ), 0))::bigint as laba_kotor,
  coalesce(sum(
    case when a.kode in ('1-1010', '1-1020') then jl.debit - jl.kredit else 0 end
  ), 0)::bigint as kas_masuk,
  coalesce(sum(
    case when a.kode = '1-1030' then jl.debit - jl.kredit else 0 end
  ), 0)::bigint as piutang,
  coalesce(sum(
    case when a.kode = '2-2010' then jl.kredit - jl.debit else 0 end
  ), 0)::bigint as uang_muka,
  coalesce(sum(
    case when a.kode in ('6-6010', '6-6020', '6-6030', '6-6040', '6-6050')
      then jl.debit - jl.kredit else 0 end
  ), 0)::bigint as beban
from public.journal_lines jl
join public.accounts a on a.id = jl.account_id
group by jl.business_id, jl.tanggal::date;

revoke all on public.v_rekap_harian from public, anon;
grant select on public.v_rekap_harian to authenticated, service_role;

revoke all on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  from public, anon, service_role;
grant execute on function public.record_stock_move(uuid, text, integer, bigint, text, uuid)
  to authenticated;

revoke all on function public._journal_event(uuid, text, timestamptz, uuid, bigint, bigint, bigint, bigint, bigint)
  from public, anon, authenticated, service_role;
revoke all on function public._reverse_journal(uuid)
  from public, anon, authenticated, service_role;

revoke all on function public._post_payment(uuid, text, bigint, text, text, bigint)
  from public, anon, authenticated, service_role;

revoke all on function public.record_payment(uuid, text, bigint, text, text, bigint)
  from public, anon;
grant execute on function public.record_payment(uuid, text, bigint, text, text, bigint)
  to authenticated;

revoke all on function public.ship_order(uuid, text, text, bigint)
  from public, anon;
grant execute on function public.ship_order(uuid, text, text, bigint)
  to authenticated;
