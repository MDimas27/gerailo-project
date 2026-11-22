import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { field, katalogCod, PRODUK_SOSIS } from "./fixtures.js";

describe("golden #2 — chat COD singkat", () => {
  it("mendeteksi COD, qty, dan harga dari katalog", () => {
    const hasil = parseSmartPaste("COD 2 sosis 25rb", katalogCod);

    expect(hasil.items[0]?.product_id).toBe(PRODUK_SOSIS);
    expect(hasil.items[0]?.qty).toEqual(field(2, "teks"));
    expect(hasil.items[0]?.harga_satuan).toEqual(field(25_000n, "katalog"));
    expect(hasil.metode_bayar).toEqual(field("COD", "teks"));
    expect(hasil.total).toBe(50_000n);
  });
});
