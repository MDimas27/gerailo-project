import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { field, katalogSiti, PRODUK_SOSIS } from "./fixtures.js";

const teks = `Halo kak, saya mau pesan 3 Sosis @Rp75.000 ya.
Ongkir Rp15.000.
Sudah transfer DP Rp100.000.
Nama: Siti
Telepon: 0812-8899-7766
Alamat: Jl. Melati No. 45`;

describe("golden #1 — chat Siti lengkap", () => {
  it("mengisi semua kolom dari teks + katalog tanpa AI", () => {
    expect(parseSmartPaste(teks, katalogSiti)).toEqual({
      sumber: "POLA",
      confidence: "TINGGI",
      pelanggan: {
        nama: field("Siti", "teks"),
        telepon: field("6281288997766", "teks"),
        alamat: field("Jl. Melati No. 45", "teks"),
      },
      items: [
        {
          product_id: PRODUK_SOSIS,
          nama_produk: field("Sosis", "katalog"),
          qty: field(3, "teks"),
          harga_satuan: field(75_000n, "katalog"),
          candidates: [],
        },
      ],
      ongkir: field(15_000n, "teks"),
      dp: field(100_000n, "teks"),
      metode_bayar: field("TRANSFER", "teks"),
      total: 240_000n,
      flags: [],
    });
  });
});
