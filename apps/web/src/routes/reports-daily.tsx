import { useState } from "react";
import { Navigate } from "react-router";

import { formatRupiah } from "@gerailo/shared";

import { LaporanShell, TabelLaporan } from "@/components/laporan-shell";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import {
  bulanBerjalan,
  useRekapHarian,
} from "@/hooks/use-reports";

export function ReportsDailyPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const rekap = useRekapHarian(business?.id);
  const [bulan, setBulan] = useState(bulanBerjalan());

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const baris = (rekap.data ?? []).filter((row) =>
    row.tanggal.startsWith(`${bulan}-`),
  );

  return (
    <LaporanShell
      bulan={bulan}
      deskripsi="Penjualan, HPP, kas masuk, piutang, dan UMP per hari."
      jenisExport="rekap-harian"
      judul="Rekap harian"
      padaBulanChange={setBulan}
    >
      {rekap.isPending ? (
        <p className="text-sm text-muted">Memuat laporan...</p>
      ) : rekap.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          Gagal memuat rekap harian.
        </p>
      ) : baris.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada aktivitas jurnal pada bulan ini.
        </p>
      ) : (
        <TabelLaporan
          kolom={[
            "Tanggal",
            "Penjualan",
            "HPP",
            "Laba kotor",
            "Kas masuk",
            "Piutang",
            "UMP",
            "Beban",
          ]}
        >
          {baris.map((row) => (
            <tr className="border-b border-border/60" key={row.tanggal}>
              <td className="px-3 py-2">{row.tanggal}</td>
              <td className="px-3 py-2">{formatRupiah(row.pendapatan)}</td>
              <td className="px-3 py-2">{formatRupiah(row.hpp)}</td>
              <td className="px-3 py-2 font-semibold">
                {formatRupiah(row.laba_kotor)}
              </td>
              <td className="px-3 py-2">{formatRupiah(row.kas_masuk)}</td>
              <td className="px-3 py-2">{formatRupiah(row.piutang)}</td>
              <td className="px-3 py-2">{formatRupiah(row.uang_muka)}</td>
              <td className="px-3 py-2">{formatRupiah(row.beban)}</td>
            </tr>
          ))}
        </TabelLaporan>
      )}
    </LaporanShell>
  );
}
