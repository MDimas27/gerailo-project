import { describe, expect, it } from "vitest";

import { parseAliasInput, productFormSchema } from "./product.js";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    nama: "Daster Jumbo",
    harga_jual: "15.000",
    stok_min: 2,
    aliases: "daster jmb, DJ motif",
    stok_awal: 10,
    harga_beli: "8.000",
    variants: [{ nama: "L", selisih_harga: "2.000" }],
    ...overrides,
  };
}

describe("parseAliasInput", () => {
  it("memisahkan koma, trim, dan dedup case-insensitive", () => {
    expect(parseAliasInput(" Kopi Gula, kopi gula, KG ")).toEqual([
      "Kopi Gula",
      "KG",
    ]);
  });

  it("membuang alias kosong", () => {
    expect(parseAliasInput("a,, b,")).toEqual(["a", "b"]);
  });
});

describe("productFormSchema", () => {
  it("menerima input lengkap", () => {
    const result = productFormSchema.safeParse(validInput());

    expect(result.success).toBe(true);
  });

  it("mengisi variants kosong saat tidak dikirim (onboarding)", () => {
    const tanpaVarian: Record<string, unknown> = validInput();
    delete tanpaVarian.variants;
    const result = productFormSchema.safeParse(tanpaVarian);

    expect(result.success).toBe(true);
    expect(result.success && result.data.variants).toEqual([]);
  });

  it("menolak harga jual 0 atau teks", () => {
    expect(productFormSchema.safeParse(validInput({ harga_jual: "0" })).success).toBe(false);
    expect(productFormSchema.safeParse(validInput({ harga_jual: "abc" })).success).toBe(false);
  });

  it("menolak stok awal negatif", () => {
    expect(productFormSchema.safeParse(validInput({ stok_awal: -1 })).success).toBe(false);
  });

  it("mengizinkan selisih harga varian negatif", () => {
    const result = productFormSchema.safeParse(
      validInput({ variants: [{ nama: "Diskon", selisih_harga: "-1.000" }] }),
    );

    expect(result.success).toBe(true);
  });

  it("menolak alias lebih dari 80 karakter", () => {
    const result = productFormSchema.safeParse(
      validInput({ aliases: "a".repeat(81) }),
    );

    expect(result.success).toBe(false);
  });

  it("mengizinkan harga beli kosong", () => {
    const result = productFormSchema.safeParse(validInput({ harga_beli: "" }));

    expect(result.success).toBe(true);
  });
});
