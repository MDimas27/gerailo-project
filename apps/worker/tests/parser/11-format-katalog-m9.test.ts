import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { field, katalogSiti, PRODUK_SOSIS } from "./fixtures.js";

const teks = `Pesanan dari katalog Toko Rena
Produk: Sosis
Varian: Pedas
Qty: 2
Catatan: kirim sore`;

describe("golden #11 — format pesan katalog M9", () => {
  it("terurai tanpa AI dari format terstruktur katalog", () => {
    const hasil = parseSmartPaste(teks, katalogSiti);

    expect(hasil.sumber).toBe("POLA");
    expect(hasil.items[0]?.product_id).toBe(PRODUK_SOSIS);
    expect(hasil.items[0]?.qty).toEqual(field(2, "teks"));
    expect(hasil.total).toBe(150_000n);
    expect(hasil.flags).not.toContain("PRODUK_TIDAK_DITEMUKAN");
  });
});
