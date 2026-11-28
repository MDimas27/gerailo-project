import { describe, expect, it } from "vitest";

import { pilihBarisBulan } from "./reports.js";

const baris = [
  { bulan: "2026-10-01", pendapatan: 1n },
  { bulan: "2026-11-01", pendapatan: 2n },
  { bulan: "2026-12-01", pendapatan: 3n },
];

describe("pilihBarisBulan (boundary bulan)", () => {
  it("memilih baris tanggal view (YYYY-MM-DD) untuk periode YYYY-MM", () => {
    expect(pilihBarisBulan(baris, "2026-11")?.pendapatan).toBe(2n);
  });

  it("tidak memilih bulan tetangga", () => {
    expect(pilihBarisBulan(baris, "2026-10")?.pendapatan).toBe(1n);
    expect(pilihBarisBulan(baris, "2026-12")?.pendapatan).toBe(3n);
  });

  it("menolak periode tidak lengkap (mis. 2026-1) walau prefix cocok", () => {
    expect(pilihBarisBulan(baris, "2026-1")).toBeNull();
  });

  it("mengembalikan null bila periode tidak ada", () => {
    expect(pilihBarisBulan(baris, "2027-01")).toBeNull();
  });

  it("tidak memilih baris bertanggal jam untuk periode lain", () => {
    const denganWaktu = [{ bulan: "2026-11-30T23:59:59Z", pendapatan: 9n }];
    expect(pilihBarisBulan(denganWaktu, "2026-11")?.pendapatan).toBe(9n);
  });
});
