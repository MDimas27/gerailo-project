import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import { Plus, Search } from "lucide-react";

import { formatRupiah } from "@gerailo/shared";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { useProducts, type ProductListItem } from "@/hooks/use-products";

function stockStatus(product: ProductListItem) {
  if (product.saldo <= 0n) {
    return { label: "Habis", variant: "danger" as const };
  }

  if (product.saldo <= BigInt(product.stok_min)) {
    return { label: "Menipis", variant: "warning" as const };
  }

  return { label: "Tersedia", variant: "success" as const };
}

function ProductCard({ product }: { product: ProductListItem }) {
  const status = stockStatus(product);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-sm font-semibold leading-tight text-ink">
          {product.nama}
        </h2>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <p className="text-base font-semibold tabular-nums text-ink">
        {formatRupiah(product.harga_jual)}
      </p>

      <p className="text-xs tabular-nums text-muted">
        Stok: {product.saldo.toString()}
        {product.aktif ? "" : " · Diarsipkan"}
      </p>

      {product.aliases.length > 0 ? (
        <p className="line-clamp-1 text-xs text-muted">
          Alias: {product.aliases.join(", ")}
        </p>
      ) : null}

      <Link
        className="mt-auto inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink hover:bg-background"
        to={`/products/${product.id}/edit`}
      >
        Edit produk
      </Link>
    </Card>
  );
}

export function ProductsPage() {
  const { business, isPending, error } = usePrimaryBusiness();
  const products = useProducts(business?.id);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return (products.data ?? []).filter((product) => {
      if (!showArchived && !product.aktif) {
        return false;
      }

      if (needle === "") {
        return true;
      }

      return (
        product.nama.toLowerCase().includes(needle) ||
        product.aliases.some((alias) => alias.toLowerCase().includes(needle))
      );
    });
  }, [products.data, search, showArchived]);

  if (isPending) {
    return <p className="p-6 text-sm text-muted">Memuat produk...</p>;
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

  const activeProducts = (products.data ?? []).filter((product) => product.aktif);
  const safeCount = activeProducts.filter((product) => product.saldo > 0n && product.saldo > BigInt(product.stok_min)).length;
  const lowCount = activeProducts.filter((product) => product.saldo > 0n && product.saldo <= BigInt(product.stok_min)).length;
  const emptyCount = activeProducts.filter((product) => product.saldo <= 0n).length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-5 py-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link className="text-xs font-semibold text-primary" to="/">
            ← Beranda
          </Link>
          <h1 className="text-2xl font-semibold text-ink">
            Katalog &amp; Stok Produk
          </h1>
          <p className="text-sm text-muted">Pantau persediaan &amp; update stok jualan</p>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-primary px-4 text-sm font-semibold text-white"
          to="/products/new"
        >
          <Plus aria-hidden="true" className="size-4" />
          Tambah
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card className="p-3">
          <p className="text-xs text-muted">Produk aktif</p>
          <p className="text-xl font-semibold tabular-nums text-ink">{activeProducts.length}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Stok aman</p>
          <p className="text-xl font-semibold tabular-nums text-success">{safeCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Menipis</p>
          <p className="text-xl font-semibold tabular-nums text-warning">{lowCount}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted">Habis</p>
          <p className="text-xl font-semibold tabular-nums text-danger">{emptyCount}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <label className="relative">
          <span className="sr-only">Cari produk</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <Input
            className="pl-9"
            placeholder="Cari nama atau alias produk..."
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            checked={showArchived}
            className="size-4 rounded border-border text-primary"
            type="checkbox"
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Tampilkan produk yang diarsipkan
        </label>
      </div>

      {products.isPending ? (
        <p className="text-sm text-muted">Memuat produk...</p>
      ) : products.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          Gagal memuat produk. Coba muat ulang halaman.
        </p>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed p-6 text-center">
          <h2 className="text-base font-semibold text-ink">
            {search ? "Produk tidak ditemukan" : "Belum ada produk"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {search
              ? "Coba kata kunci lain atau cek alias produk."
              : "Tambah produk pertama supaya bisa dipakai di Smart Paste dan pesanan."}
          </p>
          {!search ? (
            <Link
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white"
              to="/products/new"
            >
              Tambah produk pertama
            </Link>
          ) : null}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
