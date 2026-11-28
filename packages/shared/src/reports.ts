/**
 * Agregator laporan M7 di sisi klien/Worker.
 * Sumber angka tetap SQL views; file ini HANYA komposisi (tanpa agregat paralel
 * terhadap jurnal) — nilai persediaan = saldo stok × HPP rata-rata (M5).
 */

export type PersediaanBaris = {
  saldo: bigint;
  hpp_rata_rata: bigint;
};

export type NilaiPersediaan = {
  nilai: bigint;
  unitTanpaHarga: number;
};

export function nilaiPersediaan(
  rows: readonly PersediaanBaris[],
): NilaiPersediaan {
  let nilai = 0n;
  let unitTanpaHarga = 0;

  for (const row of rows) {
    if (row.saldo <= 0n) {
      continue;
    }

    if (row.hpp_rata_rata > 0n) {
      nilai += row.saldo * row.hpp_rata_rata;
    } else {
      unitTanpaHarga += 1;
    }
  }

  return { nilai, unitTanpaHarga };
}

export type PnlBulan = {
  pendapatan: bigint;
  hpp: bigint;
  laba_kotor: bigint;
  beban: bigint;
};

export type PiutangUmpBaris = {
  piutang: bigint;
  uang_muka: bigint;
};

export type DashboardAngka = {
  penjualanBulan: bigint;
  labaKotorBulan: bigint;
  piutangUmp: bigint;
  nilaiPersediaan: bigint;
};

/** Komposisi dashboard dari G1 (P&L) + G3 (piutang/UMP) + G4 (persediaan). */
export function dashboardLaporan(input: {
  pnl: PnlBulan;
  piutangUmp: readonly PiutangUmpBaris[];
  persediaan: NilaiPersediaan;
}): DashboardAngka {
  let piutangUmp = 0n;

  for (const row of input.piutangUmp) {
    piutangUmp += row.piutang + row.uang_muka;
  }

  return {
    penjualanBulan: input.pnl.pendapatan,
    labaKotorBulan: input.pnl.laba_kotor,
    piutangUmp,
    nilaiPersediaan: input.persediaan.nilai,
  };
}
