import { describe, expect, it } from "vitest";

import {
  labelPelangganArsip,
  saringPelangganArsip,
  statistikPelanggan,
} from "./customers.js";

const fixtureOrder = [
  { status: "SELESAI", total: 240_000n, created_at: "2026-11-23T10:00:00Z" },
  { status: "DP_DITERIMA", total: 50_000n, created_at: "2026-11-24T10:00:00Z" },
  { status: "BATAL", total: 100_000n, created_at: "2026-11-25T10:00:00Z" },
  { status: "SIAP_DIKIRIM", total: 90_000n, created_at: "2026-11-26T10:00:00Z" },
  { status: "DIKIRIM", total: 375_000n, created_at: "2026-11-27T10:00:00Z" },
];

describe("statistikPelanggan", () => {
  it("menghitung total/frekuensi/terakhir; DRAFT & BATAL diabaikan", () => {
    expect(statistikPelanggan(fixtureOrder)).toEqual({
      totalBelanja: 755_000n,
      frekuensi: 4,
      tanggalTerakhir: "2026-11-27T10:00:00Z",
    });
  });

  it("mengabaikan DRAFT & BATAL saja", () => {
    expect(
      statistikPelanggan([
        { status: "DRAFT", total: 10_000n, created_at: "2026-11-20T10:00:00Z" },
        { status: "BATAL", total: 20_000n, created_at: "2026-11-21T10:00:00Z" },
      ]),
    ).toEqual({ totalBelanja: 0n, frekuensi: 0, tanggalTerakhir: null });
  });

  it("mengembalikan nol rapi untuk pelanggan tanpa order", () => {
    expect(statistikPelanggan([])).toEqual({
      totalBelanja: 0n,
      frekuensi: 0,
      tanggalTerakhir: null,
    });
  });
});

describe("saringPelangganArsip", () => {
  const rows = [
    { id: "a", nama: "Siti", aktif: true },
    { id: "b", nama: "Budi", aktif: false },
  ];

  it("default menyembunyikan pelanggan arsip", () => {
    expect(saringPelangganArsip(rows, false).map((row) => row.id)).toEqual(["a"]);
  });

  it("toggle menampilkan pelanggan arsip", () => {
    expect(saringPelangganArsip(rows, true).map((row) => row.id)).toEqual(["a", "b"]);
  });

  it("label badge jujur untuk arsip/aktif", () => {
    expect(labelPelangganArsip(false)).toBe("Diarsipkan");
    expect(labelPelangganArsip(true)).toBe("Aktif");
  });
});
