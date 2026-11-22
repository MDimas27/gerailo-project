import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { extractWithAi } from "../../src/services/parser/llm.js";
import { katalogSiti, PRODUK_SOSIS } from "./fixtures.js";

describe("golden #10 — kuota AI habis", () => {
  it("mengembalikan pesan jelas dan parser pola tetap jalan", async () => {
    await expect(
      extractWithAi("pesan agak aneh 2 sosis", katalogSiti, {
        complete: async () =>
          JSON.stringify({ items: [{ product_id: PRODUK_SOSIS, qty: 2 }] }),
        claimQuota: async () => {
          throw new Error("AI_QUOTA_EXCEEDED");
        },
      }),
    ).rejects.toThrow("AI_QUOTA_EXCEEDED");

    const hasilPola = parseSmartPaste("Pesan 1 sosis", katalogSiti);
    expect(hasilPola.total).toBe(75_000n);
    expect(hasilPola.sumber).toBe("POLA");
  });
});
