import { describe, expect, it } from "vitest";

import { dashboardLaporan, nilaiPersediaan } from "./reports.js";

const pnlSiti = {
  pendapatan: 240_000n,
  hpp: 165_000n,
  laba_kotor: 75_000n,
  beban: 0n,
};

const persediaanM7 = nilaiPersediaan([
  { saldo: 13n, hpp_rata_rata: 11_000n },
  { saldo: 5n, hpp_rata_rata: 0n },
]);

describe("nilaiPersediaan", () => {
  it("menghitung saldo x HPP dan menghitung unit tanpa harga", () => {
    expect(persediaanM7).toEqual({ nilai: 143_000n, unitTanpaHarga: 1 });
  });

  it("mengabaikan saldo nol/negatif dan produk HPP nol dari nilai", () => {
    expect(
      nilaiPersediaan([
        { saldo: 0n, hpp_rata_rata: 10_000n },
        { saldo: -2n, hpp_rata_rata: 10_000n },
        { saldo: 4n, hpp_rata_rata: 10_000n },
      ]),
    ).toEqual({ nilai: 40_000n, unitTanpaHarga: 0 });
  });
});

describe("dashboardLaporan (komposisi G1/G3/G4)", () => {
  it("4 angka dashboard = komposisi komponen yang sama", () => {
    const piutangUmp = [
      { piutang: 0n, uang_muka: 0n },
      { piutang: 0n, uang_muka: 50_000n },
    ];

    const dashboard = dashboardLaporan({
      pnl: pnlSiti,
      piutangUmp,
      persediaan: persediaanM7,
    });

    expect(dashboard).toEqual({
      penjualanBulan: pnlSiti.pendapatan,
      labaKotorBulan: pnlSiti.laba_kotor,
      piutangUmp: 50_000n,
      nilaiPersediaan: persediaanM7.nilai,
    });
  });

  it("menjumlahkan piutang dan UMP dari baris v_piutang_ump", () => {
    const dashboard = dashboardLaporan({
      pnl: pnlSiti,
      piutangUmp: [
        { piutang: 140_000n, uang_muka: 100_000n },
        { piutang: 30_000n, uang_muka: 20_000n },
      ],
      persediaan: persediaanM7,
    });

    expect(dashboard.piutangUmp).toBe(290_000n);
  });
});
