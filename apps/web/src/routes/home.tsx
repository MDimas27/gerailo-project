import { Link, Navigate } from "react-router";

import { useBusinesses } from "@/hooks/use-businesses";
import { useAuth } from "@/lib/auth";

const jenisLabel: Record<string, string> = {
  makanan: "Makanan / minuman",
  fashion: "Fashion",
  kerajinan: "Kerajinan",
  lainnya: "Lainnya",
};

const metodeLabel: Record<string, string> = {
  TRANSFER: "Transfer bank",
  COD: "COD",
  QRIS: "QRIS",
  LAINNYA: "Lainnya",
};

export function HomePage() {
  const { signOut } = useAuth();
  const businesses = useBusinesses();

  if (businesses.isPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (businesses.error) {
    return (
      <p role="alert" className="p-6 text-sm font-medium text-danger">
        Gagal memuat data usaha. Coba muat ulang halaman.
      </p>
    );
  }

  const business = businesses.data?.[0];

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Beranda
          </p>
          <h1 className="text-2xl font-semibold text-ink">{business.nama}</h1>
          <p className="text-sm text-muted">
            {jenisLabel[business.jenis] ?? business.jenis} ·{" "}
            {metodeLabel[business.metode_bayar] ?? business.metode_bayar}
          </p>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-control border border-border bg-surface px-3 text-sm font-semibold text-ink"
          onClick={() => {
            void signOut();
          }}
        >
          Keluar
        </button>
      </header>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Buku usaha siap</h2>
        <p className="mt-1 text-sm text-muted">
          19 akun COA dan pengaturan usaha sudah dibuat otomatis.
        </p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white"
          to="/products"
        >
          Kelola produk &amp; stok
        </Link>
      </section>

      <section className="rounded-card border border-dashed border-border p-5">
        <h2 className="text-base font-semibold text-ink">Langkah berikutnya</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm text-muted">
          <li>1. Tambah produk pertama dan harga.</li>
          <li>2. Coba Smart Paste dengan contoh chat WhatsApp.</li>
          <li>3. Catat order pertama sampai laporan.</li>
        </ul>
      </section>
    </main>
  );
}
