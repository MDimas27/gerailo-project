import { Navigate } from "react-router";

import { formatRupiah, moneyAdd } from "@gerailo/shared";

import { LaporanShell, TabelLaporan } from "@/components/laporan-shell";
import { usePrimaryBusiness } from "@/hooks/use-primary-business";
import { usePiutangUmp } from "@/hooks/use-reports";

function labelStatus(status: string): string {
  switch (status) {
    case "DRAFT":
      return "Menunggu konfirmasi";
    case "DIKONFIRMASI":
      return "Pesanan dikonfirmasi";
    case "DP_DITERIMA":
      return "DP diterima";
    case "SIAP_DIKIRIM":
      return "Siap dikirim";
    case "DIKIRIM":
      return "Dalam pengiriman";
    case "SELESAI":
      return "Selesai";
    case "BATAL":
      return "Dibatalkan";
    default:
      return status;
  }
}

export function ReportsReceivablesPage() {
  const { business, isPending: businessPending } = usePrimaryBusiness();
  const piutang = usePiutangUmp(business?.id);

  if (businessPending) {
    return <p className="p-6 text-sm text-muted">Memuat usaha...</p>;
  }

  if (!business) {
    return <Navigate to="/onboarding" replace />;
  }

  const semua = piutang.data ?? [];
  const aktif = semua.filter((row) => row.piutang > 0n || row.uang_muka > 0n);
  const totalPiutang = moneyAdd(0n, ...aktif.map((row) => row.piutang));
  const totalUmp = moneyAdd(0n, ...aktif.map((row) => row.uang_muka));

  return (
    <LaporanShell
      bulan=""
      deskripsi="Piutang (1-1030) dan uang muka pelanggan (2-2010) tampil terpisah."
      jenisExport="piutang-ump"
      judul="Piutang & UMP"
      tampilkanFilter={false}
    >
      {piutang.isPending ? (
        <p className="text-sm text-muted">Memuat laporan...</p>
      ) : piutang.error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          Gagal memuat piutang & UMP.
        </p>
      ) : aktif.length === 0 ? (
        <p className="text-sm text-muted">
          Tidak ada piutang atau uang muka yang menggantung.
        </p>
      ) : (
        <>
          <TabelLaporan
            kolom={["Pesanan", "Status", "Pelanggan", "Telepon", "Piutang", "UMP"]}
          >
            {aktif.map((row) => (
              <tr className="border-b border-border/60" key={row.order_id}>
                <td className="px-3 py-2 font-semibold">{row.nomor}</td>
                <td className="px-3 py-2">{labelStatus(row.status)}</td>
                <td className="px-3 py-2">{row.customer_nama ?? "-"}</td>
                <td className="px-3 py-2">{row.customer_telepon ?? "-"}</td>
                <td className="px-3 py-2">{formatRupiah(row.piutang)}</td>
                <td className="px-3 py-2">{formatRupiah(row.uang_muka)}</td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td className="px-3 py-2" colSpan={4}>
                Total
              </td>
              <td className="px-3 py-2">{formatRupiah(totalPiutang)}</td>
              <td className="px-3 py-2">{formatRupiah(totalUmp)}</td>
            </tr>
          </TabelLaporan>
          {totalUmp > 0n ? (
            <p className="rounded-control bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              UMP tertahan {formatRupiah(totalUmp)} — dikembalikan ke pembeli dan
              dicatat refund bila order tidak jadi.
            </p>
          ) : null}
        </>
      )}
    </LaporanShell>
  );
}
