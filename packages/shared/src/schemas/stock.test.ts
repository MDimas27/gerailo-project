import { describe, expect, it } from "vitest";

import {
  deriveT8Prefill,
  getStockLevelStatus,
  stockMoveFormSchema,
} from "./stock.js";

const productId = "11111111-1111-4111-8111-111111111111";

describe("stockMoveFormSchema", () => {
  it("menerima MASUK dengan harga beli", () => {
    const hasil = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "MASUK",
      qty: "10",
      harga_beli: "12.000",
      alasan: "restock pembelian",
    });

    expect(hasil.success).toBe(true);
  });

  it("menerima MASUK tanpa harga beli (HPP belum di-set)", () => {
    const hasil = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "MASUK",
      qty: "5",
      harga_beli: "",
      alasan: "stok titipan",
    });

    expect(hasil.success).toBe(true);
  });

  it("menolak MASUK dengan qty nol atau negatif", () => {
    const nol = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "MASUK",
      qty: "0",
      harga_beli: "",
      alasan: "salah input",
    });
    const negatif = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "MASUK",
      qty: "-3",
      harga_beli: "",
      alasan: "salah input",
    });

    expect(nol.success).toBe(false);
    expect(negatif.success).toBe(false);
  });

  it("menerima PENYESUAIAN negatif dengan alasan", () => {
    const hasil = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "PENYESUAIAN",
      qty: "-2",
      harga_beli: "",
      alasan: "barang rusak opname",
    });

    expect(hasil.success).toBe(true);
  });

  it("menolak PENYESUAIAN tanpa alasan", () => {
    const hasil = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "PENYESUAIAN",
      qty: "-2",
      harga_beli: "",
      alasan: "   ",
    });

    expect(hasil.success).toBe(false);
    if (hasil.success) {
      return;
    }

    expect(hasil.error.issues[0]?.message).toContain("Alasan");
  });

  it("menolak KELUAR dari formulir klien", () => {
    const hasil = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "KELUAR",
      qty: "-1",
      harga_beli: "",
      alasan: "kirim manual",
    });

    expect(hasil.success).toBe(false);
  });

  it("menolak qty nol pada PENYESUAIAN", () => {
    const hasil = stockMoveFormSchema.safeParse({
      product_id: productId,
      jenis: "PENYESUAIAN",
      qty: "0",
      harga_beli: "",
      alasan: "opname",
    });

    expect(hasil.success).toBe(false);
  });
});

describe("getStockLevelStatus", () => {
  it("menandai Habis saat saldo nol atau negatif", () => {
    expect(getStockLevelStatus({ saldo: 0n, stok_min: 5 })).toBe("HABIS");
    expect(getStockLevelStatus({ saldo: -2n, stok_min: 5 })).toBe("HABIS");
  });

  it("menandai Menipis saat saldo di batas minimum", () => {
    expect(getStockLevelStatus({ saldo: 5n, stok_min: 5 })).toBe("MENIPIS");
    expect(getStockLevelStatus({ saldo: 1n, stok_min: 5 })).toBe("MENIPIS");
  });

  it("menandai Tersedia saat saldo di atas minimum", () => {
    expect(getStockLevelStatus({ saldo: 6n, stok_min: 5 })).toBe("TERSEDIA");
  });
});

describe("deriveT8Prefill", () => {
  it("memilih movement MASUK berharga terbaru", () => {
    const hasil = deriveT8Prefill([
      {
        id: "a",
        jenis: "MASUK",
        qty: 10,
        harga_beli: "10000",
        created_at: "2026-11-01T10:00:00Z",
      },
      {
        id: "b",
        jenis: "MASUK",
        qty: 10,
        harga_beli: "12000",
        created_at: "2026-11-02T10:00:00Z",
      },
      {
        id: "c",
        jenis: "PENYESUAIAN",
        qty: -2,
        harga_beli: null,
        created_at: "2026-11-03T10:00:00Z",
      },
      {
        id: "d",
        jenis: "KELUAR",
        qty: -5,
        harga_beli: "11000",
        created_at: "2026-11-04T10:00:00Z",
      },
    ]);

    expect(hasil).toEqual({
      movementId: "b",
      qty: 10n,
      hargaBeli: 12_000n,
      total: 120_000n,
    });
  });

  it("mengabaikan MASUK tanpa harga dan mengembalikan null bila tidak ada", () => {
    expect(
      deriveT8Prefill([
        {
          id: "a",
          jenis: "MASUK",
          qty: 5,
          harga_beli: null,
          created_at: "2026-11-01T10:00:00Z",
        },
      ]),
    ).toBeNull();
  });
});
