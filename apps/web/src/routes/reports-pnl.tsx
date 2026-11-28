import { Navigate } from "react-router";

import { formatRupiah } from "@gerailo/shared";

import { LaporanShell, TabelLaporan } from "@/components/laporan-shell";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { usePnlBulan } from "@/hooks/use-reports";

export function ReportsPnlPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const pnl = usePnlBulan(business?.id);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const baris = pnl.data ?? [];

  return (
    <LaporanShell
      bulan=""
      deskripsi="Akrual sederhana: pendapatan saat barang dikirim, beban saat dibuat."
      jenisExport="pnl"
      judul="Laba rugi bulanan"
      tampilkanFilter={false}
    >
      {pnl.isPending ? (
        <p className="text-sm text-muted">Memuat laporan...</p>
      ) : pnl.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          Gagal memuat laba rugi.
        </p>
      ) : baris.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada pengakuan pendapatan (barang belum dikirim).
        </p>
      ) : (
        <TabelLaporan
          kolom={["Bulan", "Penjualan", "HPP", "Beban", "Laba kotor"]}
        >
          {baris.map((row) => (
            <tr className="border-b border-border/60" key={row.bulan}>
              <td className="px-3 py-2">{row.bulan}</td>
              <td className="px-3 py-2">{formatRupiah(row.pendapatan)}</td>
              <td className="px-3 py-2">{formatRupiah(row.hpp)}</td>
              <td className="px-3 py-2">{formatRupiah(row.beban)}</td>
              <td className="px-3 py-2 font-semibold">
                {formatRupiah(row.laba_kotor)}
              </td>
            </tr>
          ))}
        </TabelLaporan>
      )}
    </LaporanShell>
  );
}
