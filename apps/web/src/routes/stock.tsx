import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Search } from "lucide-react";

import {
  deriveT8Prefill,
  formatHppLabel,
  formatRupiah,
  getStockLevelStatus,
  type StockLevel,
} from "@gerailo/shared";

import { StockHistoryDrawer } from "@/components/stock-history-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import {
  useStockOverview,
  type StockMovement,
  type StockProduct,
} from "@/hooks/use-stock";

const statusLabel: Record<StockLevel, string> = {
  HABIS: "Habis",
  MENIPIS: "Menipis",
  TERSEDIA: "Tersedia",
};

const statusVariant: Record<
  StockLevel,
  "success" | "warning" | "danger"
> = {
  HABIS: "danger",
  MENIPIS: "warning",
  TERSEDIA: "success",
};

function StockCard({
  product,
  movements,
  onOpenHistory,
}: {
  product: StockProduct;
  movements: StockMovement[];
  onOpenHistory: (product: StockProduct) => void;
}) {
  const level = getStockLevelStatus({
    saldo: product.saldo,
    stok_min: product.stok_min,
  });
  const prefill = deriveT8Prefill(movements);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-ink">
            {product.nama}
          </h2>
          <p className="text-xs tabular-nums text-muted">
            HPP: {formatHppLabel(product.hpp_rata_rata)} · Jual:{" "}
            {formatRupiah(product.harga_jual)}
          </p>
        </div>
        <Badge variant={statusVariant[level]}>{statusLabel[level]}</Badge>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted">Saldo stok</p>
          <p className="text-xl font-semibold tabular-nums text-ink">
            {product.saldo.toString()}
            <span className="ml-1 text-xs font-normal text-muted">pcs</span>
          </p>
        </div>
        <p className="text-xs tabular-nums text-muted">
          Minimum: {product.stok_min} pcs
        </p>
      </div>

      {level !== "TERSEDIA" ? (
        <p
          className={
            level === "HABIS"
              ? "rounded-control bg-danger/10 px-3 py-2 text-xs font-medium text-danger"
              : "rounded-control bg-warning/10 px-3 py-2 text-xs font-medium text-warning"
          }
        >
          {level === "HABIS"
            ? "Stok habis. Catat pasokan masuk sebelum mengirim pesanan."
            : "Stok menipis. Segera catat pasokan masuk."}
        </p>
      ) : null}

      {prefill ? (
        <div className="rounded-control bg-background px-3 py-2 text-xs text-muted">
          <p className="font-semibold text-ink">Data jurnal pembelian (T8)</p>
          <p className="mt-0.5 tabular-nums">
            Masuk terakhir: {prefill.qty.toString()} pcs @{" "}
            {formatRupiah(prefill.hargaBeli)} = {formatRupiah(prefill.total)}
          </p>
          <p className="mt-1">
            Jurnal pembelian tidak dibuat otomatis. Catat T8 dari data ini; bila
            tidak dicatat, nilai persediaan di jurnal bisa berbeda dari stok fisik.
          </p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Link
          className="inline-flex min-h-9 flex-1 items-center justify-center rounded-control bg-primary px-3 text-xs font-semibold text-white"
          to={`/stock/adjust?product=${product.id}`}
        >
          Sesuaikan stok
        </Link>
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => onOpenHistory(product)}
        >
          Riwayat
        </Button>
      </div>
    </Card>
  );
}

export function StockPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const overview = useStockOverview(business?.id);
  const [search, setSearch] = useState("");
  const [historyProduct, setHistoryProduct] = useState<StockProduct | null>(
    null,
  );

  const products = useMemo(
    () => overview.data?.products ?? [],
    [overview.data?.products],
  );
  const movements = useMemo(
    () => overview.data?.movements ?? [],
    [overview.data?.movements],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return products.filter((product) => {
      if (!product.aktif) {
        return false;
      }

      return needle === "" || product.nama.toLowerCase().includes(needle);
    });
  }, [products, search]);

  const counts = useMemo(() => {
    const aktif = products.filter((product) => product.aktif);

    return {
      total: aktif.length,
      tersedia: aktif.filter(
        (product) =>
          getStockLevelStatus({
            saldo: product.saldo,
            stok_min: product.stok_min,
          }) === "TERSEDIA",
      ).length,
      menipis: aktif.filter(
        (product) =>
          getStockLevelStatus({
            saldo: product.saldo,
            stok_min: product.stok_min,
          }) === "MENIPIS",
      ).length,
      habis: aktif.filter(
        (product) =>
          getStockLevelStatus({
            saldo: product.saldo,
            stok_min: product.stok_min,
          }) === "HABIS",
      ).length,
    };
  }, [products]);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
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
          <h1 className="text-2xl font-semibold text-ink">Stok produk</h1>
          <p className="text-sm text-muted">
            Pantau saldo, HPP rata-rata, dan catat pergerakan stok.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white"
          to="/stock/adjust"
        >
          Catat stok
        </Link>
      </div>

      <Card className="flex flex-col gap-1 border-warning/40 bg-warning/5">
        <h2 className="text-sm font-semibold text-ink">
          Stok minus diblokir
        </h2>
        <p className="text-xs text-muted">
          Penyesuaian yang membuat saldo di bawah nol akan ditolak. Kirim pesanan
          juga ditolak bila stok kurang — catat pasokan masuk dulu.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted">Produk aktif</p>
          <p className="text-xl font-semibold tabular-nums text-ink">
            {counts.total}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Tersedia</p>
          <p className="text-xl font-semibold tabular-nums text-success">
            {counts.tersedia}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Menipis</p>
          <p className="text-xl font-semibold tabular-nums text-warning">
            {counts.menipis}
          </p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Habis</p>
          <p className="text-xl font-semibold tabular-nums text-danger">
            {counts.habis}
          </p>
        </Card>
      </div>

      <label className="relative">
        <span className="sr-only">Cari produk</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
        />
        <Input
          className="pl-9"
          placeholder="Cari nama produk..."
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {overview.isPending ? (
        <p className="text-sm text-muted">Memuat stok...</p>
      ) : overview.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          Gagal memuat stok. Coba muat ulang halaman.
        </p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed p-6 text-center">
          <h2 className="text-base font-semibold text-ink">
            {search ? "Produk tidak ditemukan" : "Belum ada produk aktif"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {search
              ? "Coba kata kunci lain."
              : "Tambah produk dulu supaya stok bisa dicatat."}
          </p>
          {!search ? (
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white"
              to="/products/new"
            >
              Tambah produk
            </Link>
          ) : null}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((product) => (
            <StockCard
              key={product.id}
              movements={movements.filter(
                (movement) => movement.product_id === product.id,
              )}
              product={product}
              onOpenHistory={setHistoryProduct}
            />
          ))}
        </div>
      )}

      <StockHistoryDrawer
        open={historyProduct !== null}
        product={
          historyProduct
            ? { id: historyProduct.id, nama: historyProduct.nama }
            : null
        }
        onClose={() => setHistoryProduct(null)}
      />
    </main>
  );
}
