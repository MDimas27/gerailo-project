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
    if v_jenis = 'COD' then
      update public.orders set status = 'SELESAI' where id = p_order_id;
    elsif v_status not in ('DIKIRIM', 'SIAP_DIKIRIM') then
      update public.orders set status = 'DP_DITERIMA' where id = p_order_id;
    end if;
  elsif v_status = 'DIKONFIRMASI' then
    update public.orders set status = 'DP_DITERIMA' where id = p_order_id;
  end if;

  return v_payment_id;
end;
$$;
