import { z } from "zod";

import { parseRupiah } from "../money.js";

function isPositiveRupiah(value: string): boolean {
  try {
    return parseRupiah(value) > 0n;
  } catch {
    return false;
  }
}

function isOptionalRupiah(value: string): boolean {
  if (value.trim() === "") {
    return true;
  }

  try {
    parseRupiah(value);
    return true;
  } catch {
    return false;
  }
}

/** Pisahkan input alias "daster jmb, DJ motif" menjadi array unik
 * case-insensitive, tanpa spasi pinggir. */
export function parseAliasInput(value: string): string[] {
  const seen = new Set<string>();

  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => {
      if (alias === "") {
        return false;
      }

      const key = alias.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export const productFormSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, "Nama produk wajib diisi")
    .max(120, "Nama produk maksimal 120 karakter"),
  harga_jual: z
    .string()
    .trim()
    .min(1, "Harga jual wajib diisi")
    .refine(isPositiveRupiah, "Harga jual harus lebih dari 0"),
  stok_min: z.coerce
    .number()
    .int("Stok minimum harus bilangan bulat")
    .min(0, "Stok minimum tidak boleh negatif"),
  aliases: z
    .string()
    .trim()
    .max(500, "Alias terlalu panjang")
    .refine(
      (value) => parseAliasInput(value).every((alias) => alias.length <= 80),
      "Setiap alias maksimal 80 karakter",
    ),
  stok_awal: z.coerce
    .number()
    .int("Stok awal harus bilangan bulat")
    .min(0, "Stok awal tidak boleh negatif"),
  harga_beli: z
    .string()
    .trim()
    .refine(isOptionalRupiah, "Harga beli tidak valid"),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        nama: z
          .string()
          .trim()
          .min(1, "Nama varian wajib diisi")
          .max(80, "Nama varian maksimal 80 karakter"),
        selisih_harga: z
          .string()
          .trim()
          .refine(isOptionalRupiah, "Selisih harga tidak valid"),
      }),
    )
    .max(20, "Maksimal 20 varian per produk"),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
