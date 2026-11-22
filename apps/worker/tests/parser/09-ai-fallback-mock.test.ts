import { describe, expect, it } from "vitest";

import { parseAiResponse } from "@gerailo/shared";

import { extractWithAi } from "../../src/services/parser/llm.js";
import { field, katalogSiti, PRODUK_CUMI, PRODUK_SOSIS } from "./fixtures.js";

const jsonAi = JSON.stringify({
  items: [{ product_id: PRODUK_SOSIS, qty: 2 }],
  ongkir: 15_000,
  dp: 0,
  metode_bayar: "TRANSFER",
});

describe("golden #9 — fallback AI dengan mock", () => {
  it("memakai kandidat katalog, harga dari katalog, dan mencatat kuota", async () => {
    const hasil = await extractWithAi("pesan agak aneh 2 sosis", katalogSiti, {
      complete: async () => jsonAi,
      claimQuota: async () => "log-1",
    });

    expect(hasil.logId).toBe("log-1");
    expect(hasil.tokens).toBeGreaterThan(0);
    expect(hasil.extraction.sumber).toBe("AI");
    expect(hasil.extraction.items[0]?.product_id).toBe(PRODUK_SOSIS);
    expect(hasil.extraction.items[0]?.harga_satuan).toEqual(
      field(75_000n, "katalog"),
    );
    expect(hasil.extraction.total).toBe(165_000n);
    expect(hasil.extraction.pelanggan.nama.value).toBeNull();
  });

  it("zod menolak product_id di luar kandidat, harga dari AI, dan pelanggan dari AI", () => {
    expect(() =>
      parseAiResponse(
        { items: [{ product_id: PRODUK_CUMI, qty: 1 }] },
        [PRODUK_SOSIS],
      ),
    ).toThrow();

    expect(() =>
      parseAiResponse(
        { items: [{ product_id: PRODUK_SOSIS, qty: 1, harga_satuan: 1000 }] },
        [PRODUK_SOSIS],
      ),
    ).toThrow();

    expect(() =>
      parseAiResponse({ pelanggan: { nama: "Siti" }, items: [] }, [
        PRODUK_SOSIS,
      ]),
    ).toThrow();
  });
});
