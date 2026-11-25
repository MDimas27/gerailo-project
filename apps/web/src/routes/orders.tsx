import { useState } from "react";
import { Link, Navigate } from "react-router";
import { Plus } from "lucide-react";

import { formatRupiah, moneySubtract } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useOrders, type OrderRecord } from "@/hooks/use-orders";
import {
  labelWorkLane,
  ringkasOrder,
  workLane,
  type WorkLane,
} from "@/lib/order-presentation";

const LANE: WorkLane[] = ["BARU", "DIPROSES", "SIAP_DIKIRIM", "SELESAI"];

function statusVariant(status: OrderRecord["status"]) {
  if (status === "SELESAI") {
    return "success" as const;
  }
  if (status === "BATAL") {
    return "danger" as const;
  }
  return "warning" as const;
}

function OrderCard({ order }: { order: OrderRecord }) {
  const sisa = moneySubtract(order.total, order.sudah_dibayar);
  const ringkasan = ringkasOrder({
    status: order.status,
    sisa,
    sudah_dibayar: order.sudah_dibayar,
    metode_bayar: order.metode_bayar,
  });

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold tabular-nums text-ink">
            {order.nomor}
          </p>
          <p className="truncate text-xs text-muted">{order.nama_pelanggan}</p>
        </div>
        <Badge variant={statusVariant(order.status)}>{ringkasan.label}</Badge>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-base font-semibold tabular-nums text-ink">
            {formatRupiah(order.total)}
          </p>
          <p className="text-xs tabular-nums text-muted">
            Dibayar {formatRupiah(order.sudah_dibayar)} · Sisa {formatRupiah(sisa)}
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted">
          {new Date(order.created_at).toLocaleDateString("id-ID")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={ringkasan.pembayaran === "Lunas" ? "success" : "neutral"}>
          {ringkasan.pembayaran}
        </Badge>
        {ringkasan.aksi.kind !== "TIDAK_ADA" ? (
          <span className="text-xs text-muted">Langkah: {ringkasan.aksi.label}</span>
        ) : null}
      </div>

      <Link
        className="inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink hover:bg-background"
        to={`/orders/${order.id}`}
      >
        Lihat pesanan
      </Link>
    </Card>
  );
}

export function OrdersPage() {
  const { business, isPending, error } = usePrimaryBusiness();
  const [lane, setLane] = useState<WorkLane>("BARU");
  const orders = useOrders(business?.id, { status: "SEMUA" });

  if (isPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (error) {
    return (
      <p role="alert" className="p-6 text-sm font-medium text-danger">
        Gagal memuat data usaha. Coba muat ulang halaman.
      </p>
    );
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const semuaOrder = orders.data ?? [];
  const daftar = semuaOrder.filter((order) => workLane(order.status) === lane);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link className="text-xs font-semibold text-primary" to="/">
            ← Beranda
          </Link>
          <h1 className="text-2xl font-semibold text-ink">Pesanan</h1>
          <p className="text-sm text-muted">
            Kerjakan pesanan satu per satu, dari baru sampai selesai
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-primary px-4 text-sm font-semibold text-white"
          to="/orders/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          Order baru
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Kelompok pekerjaan">
        {LANE.map((opsi) => {
          const aktif = opsi === lane;
          const jumlah = semuaOrder.filter((order) => workLane(order.status) === opsi).length;

          return (
            <button
              aria-selected={aktif}
              className={`inline-flex min-h-10 items-center gap-2 rounded-control border px-3 text-xs font-semibold ${
                aktif
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-ink hover:bg-background"
              }`}
              key={opsi}
              onClick={() => setLane(opsi)}
              role="tab"
              type="button"
            >
              {labelWorkLane(opsi)}
              <span className="tabular-nums">{jumlah}</span>
            </button>
          );
        })}
      </div>

      {orders.isPending ? (
        <p className="text-sm text-muted">Memuat pesanan...</p>
      ) : null}

      {orders.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          Gagal memuat pesanan. Coba muat ulang halaman.
        </p>
      ) : null}

      {!orders.isPending && !orders.error && daftar.length === 0 ? (
        <Card className="p-5 text-sm text-muted">
          Belum ada pesanan di kelompok {labelWorkLane(lane).toLowerCase()}.
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {daftar.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </main>
  );
}
