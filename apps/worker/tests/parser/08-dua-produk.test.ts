import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { katalogSiti, PRODUK_CUMI, PRODUK_SOSIS } from "./fixtures.js";

describe("golden #8 — dua produk dalam satu pesan", () => {
  it("menghasilkan dua order item dan total BIGINT", () => {
    const hasil = parseSmartPaste("2 Sosis, 1 Sambal Cumi", katalogSiti);

    expect(hasil.items).toHaveLength(2);
    expect(hasil.items.map((item) => item.product_id)).toEqual([
      PRODUK_SOSIS,
      PRODUK_CUMI,
    ]);
    expect(hasil.total).toBe(200_000n);
  });
});
