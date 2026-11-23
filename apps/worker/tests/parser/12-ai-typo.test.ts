import { describe, expect, it } from "vitest";

import { extractWithAi } from "../../src/services/parser/llm.js";
import { field, katalogSiti, PRODUK_SOSIS } from "./fixtures.js";

const jsonAi = JSON.stringify({
  items: [{ product_id: PRODUK_SOSIS, qty: 2 }],
  ongkir: 15_000,
  dp: 50_000,
  metode_bayar: "TRANSFER",
});

const teks = `Halo kak, pesan:
2 sosisss
Ongkir: Rp15.000
DP: Rp50.000
Nama: Budi
Telepon: 0812-9999-8888`;

describe("golden #12 — AI menyelesaikan typo yang gagal di parser pola", () => {
  it("menghapus flag produk tak ditemukan dan menaikkan keyakinan menjadi SEDANG", async () => {
    const hasil = await extractWithAi(teks, katalogSiti, {
      complete: async () => jsonAi,
      claimQuota: async () => "log-12",
    });

    expect(hasil.extraction.sumber).toBe("AI");
    expect(hasil.extraction.items[0]?.product_id).toBe(PRODUK_SOSIS);
    expect(hasil.extraction.items[0]?.harga_satuan).toEqual(
      field(75_000n, "katalog"),
    );
    expect(hasil.extraction.flags).not.toContain("PRODUK_TIDAK_DITEMUKAN");
    expect(hasil.extraction.confidence).toBe("SEDANG");
    expect(hasil.extraction.total).toBe(165_000n);
  });
});
