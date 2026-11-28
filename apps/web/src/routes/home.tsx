import { Link, Navigate } from "react-router";

import { formatRupiah, pilihBarisBulan } from "@gerailo/shared";

import {
  bulanBerjalan,
  usePersediaan,
  usePiutangUmp,
  usePnlBulan,
} from "@/hooks/use-reports";
import { useBusinesses } from "@/hooks/use-businesses";
import { dashboardLaporan } from "@gerailo/shared";
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
  const business = businesses.data?.[0];
  const bulan = bulanBerjalan();

  const pnl = usePnlBulan(business?.id);
  const piutang = usePiutangUmp(business?.id);
  const persediaan = usePersediaan(business?.id);

  const pnlRow = pilihBarisBulan(pnl.data ?? [], bulan) ?? {
    bulan,
    pendapatan: 0n,
    hpp: 0n,
    laba_kotor: 0n,
    beban: 0n,
  };

  const angka = dashboardLaporan({
    pnl: pnlRow,
    piutangUmp: piutang.data ?? [],
    persediaan: {
      nilai: persediaan.data?.nilai ?? 0n,
      unitTanpaHarga: persediaan.data?.unitTanpaHarga ?? 0,
    },
  });

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

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const kartu = [
    { label: "Penjualan bulan ini", nilai: angka.penjualanBulan, warna: "text-ink" },
    { label: "Laba kotor bulan ini", nilai: angka.labaKotorBulan, warna: "text-success" },
    { label: "Piutang + UMP", nilai: angka.piutangUmp, warna: "text-warning" },
    {
      label: "Nilai persediaan",
      nilai: angka.nilaiPersediaan,
      warna: "text-info",
      catatan:
        (persediaan.data?.unitTanpaHarga ?? 0) > 0
          ? `${persediaan.data?.unitTanpaHarga} produk HPP belum di-set`
          : undefined,
    },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Beranda
          </p>
          <h1 className="text-2xl font-semibold text-ink">{business.nama}</h1>
          <p className="text-sm text-muted">
            {jenisLabel[business.jenis] ?? business.jenis} Â·{" "}
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
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Ringkasan {bulan}
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Dari jurnal double-entry; mengacu SAK EMKM.
            </p>
          </div>
          <Link className="text-xs font-semibold text-primary no-print" to="/reports/daily">
            Laporan â†’
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {kartu.map((satu) => (
            <div className="rounded-control border border-border px-3 py-2" key={satu.label}>
              <p className="text-xs text-muted">{satu.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${satu.warna}`}>
                {formatRupiah(satu.nilai)}
              </p>
              {satu.catatan ? (
                <p className="text-[11px] text-muted">{satu.catatan}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 no-print">
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink"
            to="/reports/pnl"
          >
            Laba rugi
          </Link>
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink"
            to="/reports/cashflow"
          >
            Arus kas
          </Link>
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink"
            to="/reports/receivables"
          >
            Piutang &amp; UMP
          </Link>
          <Link
            className="inline-flex min-h-9 items-center justify-center rounded-control border border-border px-3 text-xs font-semibold text-ink"
            to="/reports/daily"
          >
            Rekap harian
          </Link>
        </div>
      </section>

      <section className="rounded-card border border-border bg-surface p-5">
        <h2 className="text-base font-semibold text-ink">Buku usaha siap</h2>
        <p className="mt-1 text-sm text-muted">
          19 akun COA dan pengaturan usaha sudah dibuat otomatis.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-sm font-semibold text-white"
            to="/products"
          >
            Kelola produk &amp; stok
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-ink"
            to="/stock"
          >
            Catat stok &amp; HPP
          </Link>
        </div>
      </section>

      <section className="rounded-card border border-dashed border-border p-5">
        <h2 className="text-base font-semibold text-ink">Langkah berikutnya</h2>
        <ul className="mt-2 flex flex-col gap-2 text-sm text-muted">
          <li>1. Tambah produk pertama dan harga.</li>
          <li>
            2.{" "}
            <Link className="font-semibold text-primary underline" to="/tes-smart-paste">
              Tes Smart Paste (Baca pesanan + Coba AI)
            </Link>
          </li>
          <li>
            3.{" "}
            <Link className="font-semibold text-primary underline" to="/orders">
              Lihat pesanan &amp; catat pembayaran
            </Link>
            .
          </li>
        </ul>
      </section>
    </main>
  );
}
