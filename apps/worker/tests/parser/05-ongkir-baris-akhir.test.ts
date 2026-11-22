import { describe, expect, it } from "vitest";

import { parseSmartPaste } from "../../src/services/parser/index.js";
import { field, katalogSiti } from "./fixtures.js";

describe("golden #5 — ongkir di baris terakhir", () => {
  it("membaca ongkir walaupun di baris terakhir", () => {
    const hasil = parseSmartPaste("Pesan 1 sosis.\nOngkir Rp15.000", katalogSiti);

    expect(hasil.ongkir).toEqual(field(15_000n, "teks"));
    expect(hasil.total).toBe(90_000n);
  });
});
