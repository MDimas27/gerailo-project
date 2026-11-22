export const POLA = {
  nama: /^Nama\s*:\s*(.+)$/i,
  telepon: /^Telepon\s*:\s*(.+)$/i,
  alamat: /^Alamat\s*:\s*(.+)$/i,
  ongkir: /\bOngkir\b\s*:?\s*(?:Rp\s*)?([\d.]+(?:rb|k|ribu)?)/i,
  dp: /\bDP\b\s*:?\s*(?:Rp\s*)?([\d.]+(?:rb|k|ribu)?)/i,
  transfer: /\b(?:transfer|tf)\b/i,
  cod: /\bCOD\b/i,
  qris: /\bQRIS\b/i,
  produkLabel: /^Produk\s*:\s*(.+)$/i,
  varianLabel: /^Varian\s*:\s*(.+)$/i,
  qtyLabel: /^Qty\s*:\s*(.+)$/i,
  catatanLabel: /^Catatan\s*:\s*(.+)$/i,
  item:
    /(?<![\p{L}])x?(\d+)\s+([\p{L}][\p{L}\s]{0,40}?)(?=\s*(?:@|Rp|rp|\d|,|\.|\n|$|dan|sama))/giu,
  teleponMentah: /(?:08\d[\d\s-]{6,15}|628\d[\d\s-]{5,15})/g,
} as const;

export function cariBaris(baris: string[], pola: RegExp): string | null {
  for (const teks of baris) {
    const hasil = pola.exec(teks);
    if (hasil?.[1]) {
      return hasil[1].trim();
    }
  }

  return null;
}
