import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { field, katalogSiti } from "./fixtures.js";

describe("golden #7 — produk luar katalog", () => {
  it("mengosongkan harga dan memberi penanda", () => {
    const hasil = parseSmartPaste("Pesan 2 Es Teh Manis 10rb", katalogSiti);

    expect(hasil.items).toHaveLength(1);
    expect(hasil.items[0]).toMatchObject({
      product_id: null,
      nama_produk: field("Es Teh Manis", "teks"),
      qty: field(2, "teks"),
      harga_satuan: field(null, "kosong"),
    });
    expect(hasil.flags).toContain("PRODUK_TIDAK_DITEMUKAN");
    expect(hasil.total).toBe(0n);
  });
});
