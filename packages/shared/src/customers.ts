import { moneyAdd } from "./money.js";

/**
 * Statistik pelanggan M6 dari data order (tanpa tabel/angka paralel).
 * Aturan status (GATE PLAN pin): DRAFT & BATAL DIABAIKAN; SELESAI, DIKIRIM,
 * DP_DITERIMA, SIAP_DIKIRIM dihitung (konsisten T2: pendapatan diakui saat kirim).
 */
export const STATUS_ORDER_DIHITUNG = [
  "SELESAI",
  "DIKIRIM",
  "DP_DITERIMA",
  "SIAP_DIKIRIM",
] as const;

export type OrderPelanggan = {
  status: string;
  total: bigint;
  created_at: string;
};

export type StatistikPelanggan = {
  totalBelanja: bigint;
  frekuensi: number;
  tanggalTerakhir: string | null;
};

export function statistikPelanggan(
  orders: readonly OrderPelanggan[],
): StatistikPelanggan {
  let totalBelanja = 0n;
  let frekuensi = 0;
  let tanggalTerakhir: string | null = null;

  for (const order of orders) {
    if (
      !STATUS_ORDER_DIHITUNG.includes(
        order.status as (typeof STATUS_ORDER_DIHITUNG)[number],
      )
    ) {
      continue;
    }

    totalBelanja = moneyAdd(totalBelanja, order.total);
    frekuensi += 1;

    if (
      tanggalTerakhir === null ||
      Date.parse(order.created_at) > Date.parse(tanggalTerakhir)
    ) {
      tanggalTerakhir = order.created_at;
    }
  }

  return { totalBelanja, frekuensi, tanggalTerakhir };
}

export type PelangganArsip = {
  aktif: boolean;
};

/** Default menyembunyikan arsip; toggle menampilkan semua. */
export function saringPelangganArsip<T extends PelangganArsip>(
  rows: readonly T[],
  tampilkanArsip: boolean,
): T[] {
  return tampilkanArsip ? [...rows] : rows.filter((row) => row.aktif);
}

export function labelPelangganArsip(aktif: boolean): string {
  return aktif ? "Aktif" : "Diarsipkan";
}
