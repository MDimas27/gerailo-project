import { useState } from "react";
import { Link, Navigate } from "react-router";
import { Plus } from "lucide-react";

import { formatRupiah, moneySubtract } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useOrders, type OrderRecord, type OrderStatus } from "@/hooks/use-orders";

const STATUS_OPSI: Array<{ label: string; value: OrderStatus | "SEMUA" }> = [
  { label: "Semua status", value: "SEMUA" },
  { label: "DRAFT", value: "DRAFT" },
  { label: "Dikonfirmasi", value: "DIKONFIRMASI" },
  { label: "DP diterima", value: "DP_DITERIMA" },
  { label: "Siap dikirim", value: "SIAP_DIKIRIM" },
  { label: "Dikirim", value: "DIKIRIM" },
  { label: "Selesai", value: "SELESAI" },
  { label: "Batal", value: "BATAL" },
];

const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "DRAFT",
  DIKONFIRMASI: "Dikonfirmasi",
  DP_DITERIMA: "DP diterima",
  SIAP_DIKIRIM: "Siap dikirim",
  DIKIRIM: "Dikirim",
  SELESAI: "Selesai",
  BATAL: "Batal",
};

function statusVariant(status: OrderStatus) {
  if (status === "SELESAI") {
    return "success" as const;
  }
  if (status === "BATAL") {
    return "danger" as const;
  }
  if (status === "DRAFT") {
    return "neutral" as const;
  }
  return "warning" as const;
}

function OrderCard({ order }: { order: OrderRecord }) {
  const sisa = moneySubtract(order.total, order.sudah_dibayar);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold tabular-nums text-ink">
            {order.nomor}
          </p>
          <p className="truncate text-xs text-muted">{order.nama_pelanggan}</p>
        </div>
        <Badge variant={statusVariant(order.status)}>{STATUS_LABEL[order.status]}</Badge>
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

      <Link
        className="inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink hover:bg-background"
        to={`/orders/${order.id}`}
      >
        Lihat order
      </Link>
    </Card>
  );
}

export function OrdersPage() {
  const { business, isPending, error } = usePrimaryBusiness();
  const [status, setStatus] = useState<OrderStatus | "SEMUA">("SEMUA");
  const orders = useOrders(business?.id, { status });

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

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link className="text-xs font-semibold text-primary" to="/">
            ← Beranda
          </Link>
          <h1 className="text-2xl font-semibold text-ink">Pesanan</h1>
          <p className="text-sm text-muted">
            Konfirmasi order, catat bayar, lalu kirim
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

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">Filter status</span>
        <Select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "SEMUA")}>
          {STATUS_OPSI.map((opsi) => (
            <option key={opsi.value} value={opsi.value}>
              {opsi.label}
            </option>
          ))}
        </Select>
      </label>

      {orders.isPending ? (
        <p className="text-sm text-muted">Memuat pesanan...</p>
      ) : null}

      {orders.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          Gagal memuat pesanan: {orders.error.message}
        </p>
      ) : null}

      {orders.data?.length === 0 ? (
        <Card className="p-5 text-sm text-muted">
          Belum ada pesanan dengan status ini.
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(orders.data ?? []).map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </main>
  );
}
