import { parseRupiah } from "@gerailo/shared";

export function parseAngka(input: string): bigint | null {
  const bersih = input
    .trim()
    .replace(/^rp\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/,/g, ".");

  const cocok = /^(\d[\d.]*)(rb|k|ribu)?$/i.exec(bersih);
  if (!cocok?.[1]) {
    return null;
  }

  const angka = cocok[1].replace(/\./g, "");
  if (!/^\d+$/.test(angka)) {
    return null;
  }

  const faktor = cocok[2] ? 1000n : 1n;

  try {
    return parseRupiah(BigInt(angka) * faktor);
  } catch {
    return null;
  }
}

export function parseQty(input: string): number | null {
  const cocok = /^(?:x\s*)?(\d+)\s*(?:x|pcs|pc|toples|botol|porsi|pak|unit)?$/i.exec(
    input.trim(),
  );

  if (!cocok?.[1]) {
    return null;
  }

  const qty = Number(cocok[1]);
  return Number.isSafeInteger(qty) && qty >= 1 && qty <= 1000 ? qty : null;
}

export function normalizeTelepon(input: string): string | null {
  const digit = input.replace(/\D/g, "");

  if (/^0\d{9,12}$/.test(digit)) {
    return `62${digit.slice(1)}`;
  }

  if (/^628\d{8,12}$/.test(digit)) {
    return digit;
  }

  return null;
}
