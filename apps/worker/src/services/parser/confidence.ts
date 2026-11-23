import type { Confidence, Extraction, ParsedItem } from "./types.js";

export function hitungConfidence(
  items: ParsedItem[],
  pelanggan: Extraction["pelanggan"],
  flags: string[],
  sumber: Extraction["sumber"] = "POLA",
): Confidence {
  if (items.length === 0 || flags.includes("PRODUK_TIDAK_DITEMUKAN")) {
    return "RENDAH";
  }

  const semuaProdukDikenal = items.every((item) => item.product_id !== null);
  const pelangganLengkap =
    pelanggan.nama.value !== null && pelanggan.telepon.value !== null;

  if (!semuaProdukDikenal || !pelangganLengkap || sumber === "AI") {
    return "SEDANG";
  }

  return "TINGGI";
}
