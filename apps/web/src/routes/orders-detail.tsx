import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import {
  completeOrderSchema,
  formatRupiah,
  moneySubtract,
  parseRupiah,
  recordPaymentSchema,
  setShippingSchema,
  type PaymentKanal,
  type PaymentJenis,
} from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, FieldError } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useOrders,
  usePaymentProofUrl,
  type OrderStatus,
} from "@/hooks/use-orders";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts } from "@/hooks/use-products";
import { fieldErrorsFrom, pesanAksi } from "@/lib/form-error";
import { pembayaranEfektif, ringkasOrder } from "@/lib/order-presentation";
import { rpcAmount } from "@/lib/rpc-amount";
import { supabase } from "@/lib/supabase";

const LANGKAH_UI: Array<{ label: string; status: OrderStatus[] }> = [
  { label: "Dikonfirmasi", status: ["DIKONFIRMASI", "DP_DITERIMA"] },
  { label: "Siap dikirim", status: ["SIAP_DIKIRIM"] },
  { label: "Dalam pengiriman", status: ["DIKIRIM"] },
  { label: "Selesai", status: ["SELESAI"] },
];

const JENIS_OPSI: PaymentJenis[] = ["DP", "PELUNASAN", "COD"];
const KANAL_OPSI: PaymentKanal[] = [
  "MANUAL",
  "COD",
  "QRIS",
  "VA",
  "E_WALLET",
  "MIDTRANS",
  "LAINNYA",
];

type FormBayar = {
  jenis: PaymentJenis;
  kanal: PaymentKanal;
  jumlah: string;
  bukti: File | null;
};

function formBayarAwal(): FormBayar {
  return { jenis: "DP", kanal: "MANUAL", jumlah: "", bukti: null };
}

type GalatField = {
  jenis?: string;
  kanal?: string;
  jumlah?: string;
  kurir_nama?: string;
  nomor_resi?: string;
};

function galatPengiriman(error: unknown): GalatField {
  const galat = fieldErrorsFrom(error);

  return {
    kurir_nama: galat.kurir_nama ?? galat.kurir,
    nomor_resi: galat.nomor_resi ?? galat.resi,
  };
}

function BuktiPembayaran({ path }: { path: string }) {
  const bukti = usePaymentProofUrl(path);

  if (bukti.isPending) {
    return <p className="mt-1 text-xs text-muted">Menyiapkan bukti...</p>;
  }

  if (bukti.isError || !bukti.data) {
    return <p className="mt-1 text-xs text-danger">Bukti tidak bisa dibuka.</p>;
  }

  const gambar = /\.(png|jpe?g|webp|gif)$/i.test(path);

  return (
    <div className="mt-1 flex items-center gap-2">
      <a
        href={bukti.data}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-primary underline"
      >
        Lihat bukti
      </a>
      {gambar ? (
        <a href={bukti.data} target="_blank" rel="noreferrer">
          <img
            src={bukti.data}
            alt="Bukti pembayaran"
            className="h-12 w-12 rounded border border-border object-cover"
          />
        </a>
      ) : null}
    </div>
  );
}

type RpcResult = { error: { message: string } | null };

export function OrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { business, isPending, error: businessError } = usePrimaryBusiness();
  const orders = useOrders(business?.id, { orderId: id });
  const products = useProducts(business?.id);
  const [formBayar, setFormBayar] = useState<FormBayar>(formBayarAwal);
  const [kirim, setKirim] = useState({ kurir_nama: "", nomor_resi: "" });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [galat, setGalat] = useState("");
  const [galatField, setGalatField] = useState<GalatField>({});

  if (isPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (businessError) {
    return (
      <p role="alert" className="p-6 text-sm font-medium text-danger">
        Gagal memuat data usaha. Coba muat ulang halaman.
      </p>
    );
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  if (orders.isPending) {
    return <p className="p-6 text-sm text-muted">Memuat pesanan...</p>;
  }

  if (orders.error) {
    return (
      <p role="alert" className="p-6 text-sm font-medium text-danger">
        Gagal memuat pesanan. Coba muat ulang halaman.
      </p>
    );
  }

  const selectedOrder = orders.data?.[0];

  if (!selectedOrder) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-5 py-8">
        <Link className="text-xs font-semibold text-primary" to="/orders">
          ← Daftar pesanan
        </Link>
        <Card className="p-5 text-sm text-muted">Pesanan tidak ditemukan.</Card>
      </main>
    );
  }

  const order: typeof selectedOrder = selectedOrder;
  const currentBusiness: NonNullable<typeof business> = business;
  const sisa = moneySubtract(order.total, order.sudah_dibayar);
  const ringkasan = ringkasOrder({
    status: order.status,
    sisa,
    sudah_dibayar: order.sudah_dibayar,
    metode_bayar: order.metode_bayar,
  });
  const aksi = ringkasan.aksi;
  const statusIndex =
    order.status === "DRAFT" || order.status === "BATAL"
      ? -1
      : LANGKAH_UI.findIndex((langkah) => langkah.status.includes(order.status));
  const bisaBayar = aksi.kind === "BAYAR";
  const bisaKirim = ["DIKONFIRMASI", "DP_DITERIMA", "SIAP_DIKIRIM"].includes(order.status);
  const bisaSiap = ["DIKONFIRMASI", "DP_DITERIMA"].includes(order.status);
  const bisaBatal = ["DRAFT", "DIKONFIRMASI", "DP_DITERIMA", "SIAP_DIKIRIM"].includes(order.status);
  const bisaTerima = order.status === "DIKIRIM" && sisa === 0n;
  const bisaGagalKirim = order.status === "DIKIRIM";
  const pembayaran = pembayaranEfektif(
    {
      status: order.status,
      sisa,
      sudah_dibayar: order.sudah_dibayar,
      metode_bayar: order.metode_bayar,
    },
    { jenis: formBayar.jenis, kanal: formBayar.kanal },
  );
  const modeCod = bisaBayar && pembayaran.jenis === "COD";
  const modePelunasan = bisaBayar && pembayaran.jenis === "PELUNASAN";
  const jenisEfektif: PaymentJenis = pembayaran.jenis;
  const kanalEfektif: PaymentKanal = pembayaran.kanal;
  const jenisOpsi: PaymentJenis[] =
    modeCod || modePelunasan ? [] : JENIS_OPSI.filter((jenis) => jenis !== "COD");
  const kanalOpsi: PaymentKanal[] = modeCod
    ? []
    : KANAL_OPSI.filter((kanal) => kanal !== "COD");

  async function jalankan(aksi: () => PromiseLike<RpcResult>, pesan: string) {
    setBusy(true);
    setInfo("");
    setGalat("");

    try {
      const hasil = await aksi();
      if (hasil.error) {
        setGalat(pesanAksi(hasil.error, "Aksi gagal. Coba lagi."));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setInfo(pesan);
    } catch (error) {
      setGalat(pesanAksi(error, "Aksi gagal. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  async function catatBayar() {
    setBusy(true);
    setInfo("");
    setGalat("");
    setGalatField({});

    try {
      const hasilValidasi = recordPaymentSchema.safeParse({
        order_id: order.id,
        jenis: jenisEfektif,
        kanal: kanalEfektif,
        jumlah: formBayar.jumlah,
      });

      if (!hasilValidasi.success) {
        const galat = fieldErrorsFrom(hasilValidasi.error);
        setGalatField({
          jenis: galat.jenis,
          kanal: galat.kanal,
          jumlah: galat.jumlah,
        });
        setGalat("Periksa kembali data pembayaran.");
        return;
      }

      const data = hasilValidasi.data;
      let buktiPath: string | undefined;

      if (formBayar.bukti) {
        const namaAman = formBayar.bukti.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        buktiPath = `${currentBusiness.id}/${order.id}/${formBayar.bukti.lastModified}-${namaAman}`;
        const { error: uploadError } = await supabase.storage
          .from("bukti-pembayaran")
          .upload(buktiPath, formBayar.bukti, { upsert: false });

        if (uploadError) {
          throw uploadError;
        }
      }

      const args = {
        p_order_id: order.id,
        p_jenis: data.jenis,
        p_jumlah: rpcAmount(parseRupiah(data.jumlah)),
        p_kanal: data.kanal,
        ...(buktiPath ? { p_bukti_path: buktiPath } : {}),
      } as unknown as {
        p_order_id: string;
        p_jenis: string;
        p_jumlah: number;
        p_kanal: string;
        p_bukti_path?: string;
      };

      const hasil = await supabase.rpc("record_payment", args);

      if (hasil.error) {
        const pesan = pesanAksi(hasil.error, "Pembayaran gagal dicatat. Coba lagi.");
        if (hasil.error.message.includes("PEMBAYARAN_MELEBIHI_TOTAL")) {
          setGalatField({ jumlah: pesan });
        }
        setGalat(pesan);
        return;
      }

      setFormBayar(formBayarAwal());
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setInfo("Pembayaran dicatat.");
    } catch (error) {
      setGalat(pesanAksi(error, "Pembayaran gagal dicatat. Coba lagi."));
    } finally {
      setBusy(false);
    }
  }

  function kirimOrder() {
    setInfo("");
    setGalat("");
    setGalatField({});

    const hasilValidasi = completeOrderSchema.safeParse({
      order_id: order.id,
      kurir_nama: kirim.kurir_nama || undefined,
      nomor_resi: kirim.nomor_resi || undefined,
    });

    if (!hasilValidasi.success) {
      setGalatField(galatPengiriman(hasilValidasi.error));
      setGalat("Periksa kembali data pengiriman.");
      return;
    }

    const data = hasilValidasi.data;

    void jalankan(
      () =>
        supabase.rpc("ship_order", {
          p_order_id: data.order_id,
          ...(data.kurir_nama ? { p_kurir_nama: data.kurir_nama } : {}),
          ...(data.nomor_resi ? { p_nomor_resi: data.nomor_resi } : {}),
        }),
      "Order ditandai dikirim.",
    );
  }

  function terimaOrder() {
    void jalankan(
      () => supabase.rpc("receive_order", { p_order_id: order.id }),
      "Order ditandai diterima dan selesai.",
    );
  }

  function perbaruiResi() {
    setInfo("");
    setGalat("");
    setGalatField({});

    const hasilValidasi = setShippingSchema.safeParse({
      order_id: order.id,
      kurir: kirim.kurir_nama,
      resi: kirim.nomor_resi,
    });

    if (!hasilValidasi.success) {
      setGalatField(galatPengiriman(hasilValidasi.error));
      setGalat("Periksa kembali data pengiriman.");
      return;
    }

    const data = hasilValidasi.data;

    void jalankan(
      () =>
        supabase.rpc("set_shipping", {
          p_order_id: data.order_id,
          p_kurir: data.kurir,
          p_resi: data.resi,
        }),
      "Kurir dan resi diperbarui.",
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/orders">
          ← Daftar pesanan
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tabular-nums text-ink">{order.nomor}</h1>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={
                order.status === "SELESAI"
                  ? "success"
                  : order.status === "BATAL"
                    ? "danger"
                    : "warning"
              }
            >
              {ringkasan.label}
            </Badge>
            <Badge variant={ringkasan.pembayaran === "Lunas" ? "success" : "neutral"}>
              {ringkasan.pembayaran}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted">
          {order.nama_pelanggan} · {order.telepon_pelanggan}
        </p>
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-xs font-semibold text-muted">Alur pesanan</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGKAH_UI.map((langkah, index) => (
            <Badge key={langkah.label} variant={index <= statusIndex ? "success" : "neutral"}>
              {langkah.label}
            </Badge>
          ))}
        </div>
        {order.status === "DIKIRIM" ? (
          <p className="text-xs text-muted">
            Kurir: {order.kurir_nama ?? "-"} · Resi: {order.nomor_resi ?? "-"}
          </p>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-sm font-semibold text-ink">Item pesanan</p>
        {order.items.map((item) => {
          const produk = products.data?.find((product) => product.id === item.product_id);
          return (
            <div key={item.id} className="flex justify-between gap-3 text-sm">
              <span className="min-w-0 flex-1 truncate text-ink">
                {produk?.nama ?? "Produk"} × {item.qty}
              </span>
              <span className="shrink-0 tabular-nums text-ink">
                {formatRupiah(item.subtotal)}
              </span>
            </div>
          );
        })}
        <div className="mt-1 border-t border-border pt-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>Ongkir</span>
            <span className="tabular-nums">{formatRupiah(order.ongkir)}</span>
          </div>
          <div className="flex justify-between font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">{formatRupiah(order.total)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Sudah dibayar</span>
            <span className="tabular-nums">{formatRupiah(order.sudah_dibayar)}</span>
          </div>
          <div className="flex justify-between font-semibold text-primary">
            <span>Sisa</span>
            <span className="tabular-nums">{formatRupiah(sisa)}</span>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-sm font-semibold text-ink">Riwayat pembayaran</p>
        {order.payments.length === 0 ? (
          <p className="text-xs text-muted">Belum ada pembayaran dicatat.</p>
        ) : null}
        {order.payments.map((payment) => (
          <div key={payment.id} className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0">
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-semibold text-ink">{payment.jenis}</span>
              <span className="tabular-nums text-ink">{formatRupiah(payment.jumlah)}</span>
            </div>
            <p className="text-xs text-muted">
              {payment.kanal} · {new Date(payment.created_at).toLocaleString("id-ID")}
            </p>
            {payment.bukti_path ? (
              <BuktiPembayaran path={payment.bukti_path} />
            ) : null}
          </div>
        ))}
      </Card>

      <Card className="flex flex-col gap-2 border-primary p-4">
        <p className="text-xs font-semibold text-primary">Langkah berikutnya</p>
        <p className="text-sm font-semibold text-ink">{aksi.label}</p>
        <p className="text-xs text-muted">{aksi.bantuan}</p>
        {order.status === "DIKIRIM" && sisa > 0n ? (
          <p className="text-xs font-semibold text-danger">
            Masih ada sisa {formatRupiah(sisa)} — catat pelunasan dulu.
          </p>
        ) : null}
      </Card>

      {aksi.kind === "KONFIRMASI" ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">Periksa pesanan</p>
          <p className="text-xs text-muted">
            Pastikan produk, harga, alamat, dan estimasi pengerjaan sudah sesuai
            sebelum menyetujui pesanan ini.
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void jalankan(
                () =>
                  supabase.rpc("confirm_order", {
                    p_order_id: order.id,
                  }),
                "Order dikonfirmasi.",
              )
            }
          >
            Periksa & konfirmasi
          </Button>
        </Card>
      ) : null}

      {bisaBayar ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">{aksi.label}</p>
          <p className="text-xs text-muted">
            Total {formatRupiah(order.total)} · sudah dibayar{" "}
            {formatRupiah(order.sudah_dibayar)} · sisa {formatRupiah(sisa)}.
          </p>
          {order.status === "DIKIRIM" && sisa > 0n ? (
            <p className="text-xs text-danger">
              Masih ada sisa {formatRupiah(sisa)} — catat pelunasan dulu.
            </p>
          ) : null}
          {modeCod || modePelunasan ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-xs text-muted">
                Jenis: <span className="font-semibold text-ink">{jenisEfektif}</span>
              </p>
              <p className="text-xs text-muted">
                Kanal: <span className="font-semibold text-ink">{kanalEfektif}</span>
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Jenis</span>
                <Select
                  value={formBayar.jenis}
                  onChange={(event) =>
                    setFormBayar((value) => ({
                      ...value,
                      jenis: event.target.value as PaymentJenis,
                    }))
                  }
                >
                  {jenisOpsi.map((jenis) => (
                    <option key={jenis} value={jenis}>
                      {jenis}
                    </option>
                  ))}
                </Select>
                <FieldError>{galatField.jenis}</FieldError>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Kanal</span>
                <Select
                  value={formBayar.kanal}
                  onChange={(event) =>
                    setFormBayar((value) => ({
                      ...value,
                      kanal: event.target.value as PaymentKanal,
                    }))
                  }
                >
                  {kanalOpsi.map((kanal) => (
                    <option key={kanal} value={kanal}>
                      {kanal}
                    </option>
                  ))}
                </Select>
                <FieldError>{galatField.kanal}</FieldError>
              </label>
            </div>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Nominal</span>
            <Input
              inputMode="numeric"
              placeholder="0"
              value={formBayar.jumlah}
              onChange={(event) =>
                setFormBayar((value) => ({ ...value, jumlah: event.target.value }))
              }
            />
            <FieldError>{galatField.jumlah}</FieldError>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">
              Bukti pembayaran (opsional, privat)
            </span>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) =>
                setFormBayar((value) => ({
                  ...value,
                  bukti: event.target.files?.[0] ?? null,
                }))
              }
            />
          </label>
          <Button type="button" disabled={busy} onClick={() => void catatBayar()}>
            {aksi.label}
          </Button>
          <div className="flex flex-wrap gap-2">
            {bisaSiap ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void jalankan(
                    () =>
                      supabase.rpc("mark_ready", {
                        p_order_id: order.id,
                        }),
                    "Order siap dikirim.",
                  )
                }
              >
                Tandai siap dikirim
              </Button>
            ) : null}
            {bisaKirim ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={kirimOrder}
              >
                Tandai dikirim
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {aksi.kind === "SIAP_DIKIRIM" ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">{aksi.label}</p>
          <p className="text-xs text-muted">{aksi.bantuan}</p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void jalankan(
                () =>
                  supabase.rpc("mark_ready", {
                    p_order_id: order.id,
                  }),
                "Order siap dikirim.",
              )
            }
          >
            Tandai siap dikirim
          </Button>
          {bisaKirim ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={kirimOrder}
            >
              Tandai dikirim
            </Button>
          ) : null}
        </Card>
      ) : null}

      {aksi.kind === "KIRIM" || order.status === "DIKIRIM" ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">
            {order.status === "DIKIRIM" ? "Pengiriman" : aksi.label}
          </p>
          <p className="text-xs text-muted">
            {order.status === "DIKIRIM"
              ? "Perbarui kurir/resi bila perlu."
              : aksi.bantuan}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Kurir</span>
              <Input
                value={kirim.kurir_nama}
                onChange={(event) =>
                  setKirim((value) => ({ ...value, kurir_nama: event.target.value }))
                }
              />
              <FieldError>{galatField.kurir_nama}</FieldError>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Nomor resi</span>
              <Input
                value={kirim.nomor_resi}
                onChange={(event) =>
                  setKirim((value) => ({ ...value, nomor_resi: event.target.value }))
                }
              />
              <FieldError>{galatField.nomor_resi}</FieldError>
            </label>
          </div>
          {order.status === "DIKIRIM" && sisa > 0n ? (
            <p className="text-xs text-danger">
              Masih ada sisa {formatRupiah(sisa)} — catat pelunasan dulu.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {order.status === "DIKIRIM" ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={perbaruiResi}
              >
                Simpan resi
              </Button>
            ) : (
              <Button type="button" disabled={busy} onClick={kirimOrder}>
                Tandai dikirim
              </Button>
            )}
            {bisaTerima ? (
              <Button type="button" disabled={busy} onClick={terimaOrder}>
                Tandai diterima/selesai
              </Button>
            ) : null}
            {bisaGagalKirim ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void jalankan(
                    () =>
                      supabase.rpc("gagal_kirim", {
                        p_order_id: order.id,
                      }),
                    "Kiriman gagal; jurnal dan stok dibalik.",
                  )
                }
              >
                Lapor gagal kirim
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {bisaBatal ? (
        <div>
          <Button
            type="button"
            variant="danger"
            size="sm"
            disabled={busy}
            onClick={() =>
              void jalankan(
                () =>
                  supabase.rpc("cancel_order", {
                    p_order_id: order.id,
                  }),
                "Order dibatalkan.",
              )
            }
          >
            Batalkan order
          </Button>
        </div>
      ) : null}

      {info ? <p className="text-sm font-medium text-success">{info}</p> : null}
      {galat ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {galat}
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Jurnal otomatis aktif; kiriman gagal dibatalkan lewat reversi.
      </p>
    </main>
  );
}
