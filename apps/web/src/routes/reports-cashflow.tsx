import { useState } from "react";
import { Navigate } from "react-router";

import { formatRupiah, moneyAdd } from "@gerailo/shared";

import { LaporanShell, TabelLaporan } from "@/components/laporan-shell";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import {
  bulanBerjalan,
  useArusKas,
} from "@/hooks/use-reports";

export function ReportsCashflowPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const arus = useArusKas(business?.id);
  const [bulan, setBulan] = useState(bulanBerjalan());

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const baris = (arus.data ?? []).filter((row) =>
    row.tanggal.startsWith(`${bulan}-`),
  );
  const totalMasuk = moneyAdd(0n, ...baris.map((row) => row.masuk));
  const totalKeluar = moneyAdd(0n, ...baris.map((row) => row.keluar));

  return (
    <LaporanShell
      bulan={bulan}
      deskripsi="Metode langsung dari akun kas (1-1010) dan bank/e-wallet (1-1020)."
      jenisExport="arus-kas"
      judul="Arus kas"
      padaBulanChange={setBulan}
    >
      {arus.isPending ? (
        <p className="text-sm text-muted">Memuat laporan...</p>
      ) : arus.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          Gagal memuat arus kas.
        </p>
      ) : baris.length === 0 ? (
        <p className="text-sm text-muted">
          Belum ada pergerakan kas pada bulan ini.
        </p>
      ) : (
        <>
          <TabelLaporan kolom={["Tanggal", "Akun", "Masuk", "Keluar"]}>
            {baris.map((row) => (
              <tr className="border-b border-border/60" key={`${row.tanggal}-${row.akun_kode}`}>
                <td className="px-3 py-2">{row.tanggal}</td>
                <td className="px-3 py-2">
                  {row.akun_nama} ({row.akun_kode})
                </td>
                <td className="px-3 py-2 text-success">
                  {formatRupiah(row.masuk)}
                </td>
                <td className="px-3 py-2 text-danger">
                  {formatRupiah(row.keluar)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="px-3 py-2" colSpan={2}>
                Total {bulan}
              </td>
              <td className="px-3 py-2">{formatRupiah(totalMasuk)}</td>
              <td className="px-3 py-2">{formatRupiah(totalKeluar)}</td>
            </tr>
          </TabelLaporan>
        </>
      )}
    </LaporanShell>
  );
}
