import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { katalogSiti } from "./fixtures.js";

describe("golden #6 — teks acak tanpa produk", () => {
  it("memberi keyakinan rendah dan nol tebakan", () => {
    const hasil = parseSmartPaste(
      "Halo kak apa kabar, nanti saya kabari ya",
      katalogSiti,
    );

    expect(hasil.confidence).toBe("RENDAH");
    expect(hasil.items).toEqual([]);
    expect(hasil.total).toBe(0n);
    expect(hasil.pelanggan.nama.value).toBeNull();
    expect(hasil.pelanggan.telepon.value).toBeNull();
    expect(hasil.ongkir.value).toBe(0n);
  });
});
