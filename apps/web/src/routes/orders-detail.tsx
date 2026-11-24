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
  type IntentJenis,
  type PaymentKanal,
  type PaymentJenis,
} from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  useOrders,
  usePaymentProofUrl,
  type OrderStatus,
} from "@/hooks/use-orders";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts } from "@/hooks/use-products";
import { ambilSnapToken } from "@/lib/api";
import { rpcAmount } from "@/lib/rpc-amount";
import { supabase } from "@/lib/supabase";

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "DRAFT",
  DIKONFIRMASI: "Dikonfirmasi",
  DP_DITERIMA: "DP diterima",
  SIAP_DIKIRIM: "Siap dikirim",
  DIKIRIM: "Dikirim",
  SELESAI: "Selesai",
  BATAL: "Batal",
};

const LANGKAH: OrderStatus[] = [
  "DIKONFIRMASI",
  "DP_DITERIMA",
  "SIAP_DIKIRIM",
  "DIKIRIM",
  "SELESAI",
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

type SnapPembayaran = {
  pay: (
    token: string,
    opsi: {
      onSuccess: (hasil: unknown) => void;
      onPending: (hasil: unknown) => void;
      onError: (hasil: unknown) => void;
    },
  ) => void;
};

function jendelaSnap(): { snap?: SnapPembayaran } {
  return window as unknown as { snap?: SnapPembayaran };
}

function muatSnap(clientKey: string, environment: "sandbox" | "production"): Promise<SnapPembayaran> {
  const existing = jendelaSnap().snap;
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const skrip = document.createElement("script");
    skrip.src = environment === "production"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    skrip.async = true;
    skrip.setAttribute("data-client-key", clientKey);
    skrip.onload = () => {
      const snap = jendelaSnap().snap;
      if (snap) {
        resolve(snap);
      } else {
        reject(new Error("Snap Midtrans gagal dimuat."));
      }
    };
    skrip.onerror = () => reject(new Error("Snap Midtrans gagal dimuat."));
    document.head.appendChild(skrip);
  });
}

function pesanError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Aksi gagal. Coba lagi.";
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
  const [jenisOnline, setJenisOnline] = useState<IntentJenis>("PELUNASAN");
  const [kirim, setKirim] = useState({ kurir_nama: "", nomor_resi: "" });
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState("");
  const [galat, setGalat] = useState("");

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
        Gagal memuat pesanan: {orders.error.message}
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
  const statusIndex = order.status === "DRAFT" || order.status === "BATAL" ? -1 : LANGKAH.indexOf(order.status);
  const bisaBayar = !["SELESAI", "BATAL"].includes(order.status);
  const bisaKirim = ["DIKONFIRMASI", "DP_DITERIMA", "SIAP_DIKIRIM"].includes(order.status);
  const bisaSiap = ["DIKONFIRMASI", "DP_DITERIMA"].includes(order.status);
  const bisaBatal = !["SELESAI", "BATAL"].includes(order.status);
  const bisaBayarOnline = ["DIKONFIRMASI", "DP_DITERIMA"].includes(order.status);

  async function jalankan(aksi: () => PromiseLike<RpcResult>, pesan: string) {
    setBusy(true);
    setInfo("");
    setGalat("");

    try {
      const hasil = await aksi();
      if (hasil.error) {
        throw new Error(hasil.error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setInfo(pesan);
    } catch (error) {
      setGalat(pesanError(error));
    } finally {
      setBusy(false);
    }
  }

  async function bayarOnline() {
    setBusy(true);
    setInfo("");
    setGalat("");

    try {
      const hasil = await ambilSnapToken({
        orderId: order.id,
        jenis: jenisOnline,
      });

      try {
        const snap = await muatSnap(hasil.client_key, hasil.environment);
        snap.pay(hasil.token, {
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["orders"] });
            setInfo("Pembayaran dikirim. Menunggu konfirmasi Midtrans.");
          },
          onPending: () => {
            setInfo("Pembayaran masih diproses Midtrans.");
          },
          onError: (hasilBayar) => {
            setGalat(pesanError(hasilBayar));
          },
        });
      } catch {
        window.location.assign(hasil.redirect_url);
      }
    } catch (error) {
      setGalat(pesanError(error));
    } finally {
      setBusy(false);
    }
  }

  async function catatBayar() {
    setBusy(true);
    setInfo("");
    setGalat("");

    try {
      const data = recordPaymentSchema.parse({
        order_id: order.id,
        jenis: formBayar.jenis,
        kanal: formBayar.kanal,
        jumlah: formBayar.jumlah,
      });

      let buktiPath: string | undefined;

      if (formBayar.bukti) {
        const namaAman = formBayar.bukti.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        buktiPath = `${currentBusiness.id}/${order.id}/${Date.now()}-${namaAman}`;
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
        throw hasil.error;
      }

      setFormBayar(formBayarAwal());
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      setInfo("Pembayaran dicatat.");
    } catch (error) {
      setGalat(pesanError(error));
    } finally {
      setBusy(false);
    }
  }

  function kirimOrder() {
    try {
      const data = completeOrderSchema.parse({
        order_id: order.id,
        kurir_nama: kirim.kurir_nama || undefined,
        nomor_resi: kirim.nomor_resi || undefined,
      });

      void jalankan(
        () =>
          supabase.rpc("complete_order", {
            p_order_id: data.order_id,
            ...(data.kurir_nama ? { p_kurir_nama: data.kurir_nama } : {}),
            ...(data.nomor_resi ? { p_nomor_resi: data.nomor_resi } : {}),
          }) ,
        "Order ditandai dikirim.",
      );
    } catch (error) {
      setGalat(pesanError(error));
    }
  }

  function perbaruiResi() {
    try {
      const data = setShippingSchema.parse({
        order_id: order.id,
        kurir: kirim.kurir_nama,
        resi: kirim.nomor_resi,
      });

      void jalankan(
        () =>
          supabase.rpc("set_shipping", {
            p_order_id: data.order_id,
            p_kurir: data.kurir,
            p_resi: data.resi,
          }) ,
        "Kurir dan resi diperbarui.",
      );
    } catch (error) {
      setGalat(pesanError(error));
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex flex-col gap-1">
        <Link className="text-xs font-semibold text-primary" to="/orders">
          ← Daftar pesanan
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tabular-nums text-ink">{order.nomor}</h1>
          <Badge variant={order.status === "SELESAI" ? "success" : order.status === "BATAL" ? "danger" : "warning"}>
            {STATUS_LABEL[order.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted">
          {order.nama_pelanggan} · {order.telepon_pelanggan}
        </p>
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <p className="text-xs font-semibold text-muted">Alur order</p>
        <div className="flex flex-wrap gap-1.5">
          {LANGKAH.map((langkah, index) => (
            <Badge
              key={langkah}
              variant={index <= statusIndex ? "success" : "neutral"}
            >
              {STATUS_LABEL[langkah]}
            </Badge>
          ))}
        </div>
        {order.kurir_nama || order.nomor_resi ? (
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

      {bisaBayarOnline ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">Bayar online</p>
          <p className="text-xs text-muted">
            Nominal dihitung otomatis dari pesanan. Sisa saat ini: {formatRupiah(sisa)}.
          </p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Jenis pembayaran</span>
            <Select
              value={jenisOnline}
              onChange={(event) => setJenisOnline(event.target.value as IntentJenis)}
            >
              <option value="PELUNASAN">Pelunasan</option>
              <option value="DP">DP</option>
            </Select>
          </label>
          <Button type="button" disabled={busy} onClick={() => void bayarOnline()}>
            Buat pembayaran QRIS/VA
          </Button>
        </Card>
      ) : null}

      {bisaBayar ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">Catat pembayaran</p>
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
                {JENIS_OPSI.map((jenis) => (
                  <option key={jenis} value={jenis}>
                    {jenis}
                  </option>
                ))}
              </Select>
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
                {KANAL_OPSI.map((kanal) => (
                  <option key={kanal} value={kanal}>
                    {kanal}
                  </option>
                ))}
              </Select>
            </label>
          </div>
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
            Simpan pembayaran
          </Button>
        </Card>
      ) : null}

      {(bisaKirim || order.status === "DIKIRIM") ? (
        <Card className="flex flex-col gap-3 p-4">
          <p className="text-sm font-semibold text-ink">Pengiriman</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Kurir</span>
              <Input
                value={kirim.kurir_nama}
                onChange={(event) =>
                  setKirim((value) => ({ ...value, kurir_nama: event.target.value }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted">Nomor resi</span>
              <Input
                value={kirim.nomor_resi}
                onChange={(event) =>
                  setKirim((value) => ({ ...value, nomor_resi: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {bisaSiap ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  void jalankan(
                    () =>
                      supabase.rpc("mark_ready", {
                        p_order_id: order.id,
                      }) ,
                    "Order siap dikirim.",
                  )
                }
              >
                Tandai siap dikirim
              </Button>
            ) : null}
            {bisaKirim ? (
              <Button type="button" disabled={busy} onClick={kirimOrder}>
                Tandai dikirim
              </Button>
            ) : null}
            {order.status === "DIKIRIM" ? (
              <Button type="button" disabled={busy} onClick={perbaruiResi}>
                Simpan resi
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {order.status === "DRAFT" ? (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void jalankan(
                () =>
                  supabase.rpc("confirm_order", {
                    p_order_id: order.id,
                  }) ,
                "Order dikonfirmasi.",
              )
            }
          >
            Konfirmasi order
          </Button>
        ) : null}
        {bisaBatal ? (
          <Button
            type="button"
            variant="danger"
            disabled={busy}
            onClick={() =>
              void jalankan(
                () =>
                  supabase.rpc("cancel_order", {
                    p_order_id: order.id,
                  }) ,
                "Order dibatalkan.",
              )
            }
          >
            Batalkan order
          </Button>
        ) : null}
      </div>

      {info ? <p className="text-sm font-medium text-success">{info}</p> : null}
      {galat ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {galat}
        </p>
      ) : null}
      <p className="text-xs text-muted">
        Status belum memposting jurnal sampai sub-slice 3 selesai.
      </p>
    </main>
  );
}
